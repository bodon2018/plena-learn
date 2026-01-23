import csv
import datetime
import json
import os
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any, List, Optional, Dict
import httpx  # HTTP client to notify the AI server
from pydantic import BaseModel  # For a simple request model for transcript updates


from fastapi import Body, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload

from . import config
from .database import Base, SessionLocal, engine, get_db
from .models import MediaFile, Annotation, Organization, Team, Player, Coach, User, InviteCode, Session as GameSession
from .schemas import (
    MediaFileRead,
    AnnotationCreate,
    AnnotationRead,
    OrganizationRead,
    TeamRead,
    SessionRead,
    UserRead,
    InviteVerifyRequest,
    InviteVerifyResponse,
    RegisterRequest,
    LoginRequest,
)
from .storage import get_drive_service, upload_bytes, upload_file
from .auth import hash_password, verify_password

# -----------------------------------------------------------------------------
# Lightweight persistence for mock AI endpoints
# -----------------------------------------------------------------------------

def _load_json(path: Path, default: Any):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


METRICS_STORE_PATH = config.DATA_DIR / "metrics_jobs.json"
REPORTS_STORE_PATH = config.DATA_DIR / "reports.json"
REFERENCE_DOCS_STORE_PATH = config.DATA_DIR / "reference_docs.json"
MEDIA_REPORTS_STORE_PATH = config.DATA_DIR / "media_reports.json"

# -----------------------------------------------------------------------------
# Helper to build a canonical playback URL for any MediaFile
# -----------------------------------------------------------------------------

def build_media_url(media: MediaFile, drive_meta: Optional[dict] = None) -> Optional[str]:
    """
    Compute a canonical playback URL for a media file.

    We want uploads to behave like recordings from the frontend's perspective,
    so both /upload responses and /api/media use the same URL logic.

    Strategy:
      1. If filepath already looks like a URL or absolute path, reuse it.
      2. If filepath looks like a local media path with an extension
         (e.g. "recordings/xyz.mp4"), serve from /media/<filepath>.
         - This is how /ws/stream stores recordings today.
      3. Otherwise, treat filepath (or drive_meta["id"]) as a Google Drive file id
         and build a preview URL:
             https://drive.google.com/file/d/<id>/preview
    """
    path = media.filepath or ""

    if not path and drive_meta is not None:
        path = drive_meta.get("id") or ""

    if not path:
        return None

    # 1) Already a URL or absolute path – leave it alone.
    if path.startswith("http://") or path.startswith("https://") or path.startswith("/"):
        return path

    # 2) Local file under MEDIA_ROOT (recordings).
    #    We detect this by:
    #      - path has a "/" (subdirectory) and
    #      - path ends with a known media extension.
    _, ext = os.path.splitext(path)
    if "/" in path and ext.lower() in {".mp4", ".mp3", ".webm", ".wav", ".m4a"}:
        # e.g. "recordings/recording_xxx.mp4" -> "/media/recordings/recording_xxx.mp4"
        return f"/media/{path}"

    # 3) Fallback: treat as Drive file id and normalize to preview URL.
    file_id = drive_meta.get("id") if drive_meta is not None else None
    if not file_id:
        file_id = path

    if not file_id:
        return None

    # Preview URL works for <video>/<audio> src in your current setup.
    return f"https://drive.google.com/file/d/{file_id}/preview"

# -----------------------------------------------------------------------------
# Helper to notify the AI server about new media for transcription
# -----------------------------------------------------------------------------

class TranscriptionJobPayload(BaseModel):
    """Payload sent from the storage server to the AI server to start transcription."""

    media_id: int
    drive_file_id: Optional[str] = None
    media_url: Optional[str] = None
    mime_type: Optional[str] = None
    duration_sec: Optional[float] = None
    source: Optional[str] = None          # "record" | "upload"
    context: Optional[str] = None         # "practice" | "game" | None
    recording_mode: Optional[str] = None  # "audio" | "video" | None


# -----------------------------------------------------------------------------
# Schemas for mock AI/admin endpoints
# -----------------------------------------------------------------------------

class UploadedCsv(BaseModel):
    original_filename: str
    saved_path: str
    size_bytes: int
    data_source_type: str = "upload_csv"
    file_extension: Optional[str] = None
    modified_at: Optional[str] = None


class DataSourceOverview(BaseModel):
    original_filename: str
    saved_path: str
    size_bytes: int
    row_count: int
    column_count: int
    columns: List[Dict[str, object]]
    missing_values: Dict[str, int]


class MetricJob(BaseModel):
    job_id: str
    status: str
    created_at: str
    updated_at: str
    request: Dict[str, object]
    org_context: Optional[str] = None
    data_sources: List[Dict[str, object]] = []
    plain_language_definition: Optional[str] = None
    intent_spec: Dict[str, object] = {}
    data_disclaimer: Optional[str] = None
    critique_report: Optional[Dict[str, object]] = None
    python_execution: Optional[Dict[str, object]] = None
    metadata: Dict[str, object] = {}
    error: Optional[Dict[str, object]] = None


class ReportRecord(BaseModel):
    report_id: str
    status: str
    report_type: str
    csv_filename: Optional[str] = None
    csv_saved_path: Optional[str] = None
    report_label: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    pdf_path: Optional[str] = None
    error_message: Optional[str] = None
    org_id: Optional[str] = None
    context: Optional[str] = None


def _data_source_full_path(saved_path: str) -> Path:
    """Resolve a saved_path into an absolute path under DATA_SOURCES_DIR."""
    # Avoid path traversal
    safe_name = Path(saved_path).name
    return config.DATA_SOURCES_DIR / safe_name


def _scan_data_sources() -> List[UploadedCsv]:
    items: List[UploadedCsv] = []
    for path in sorted(config.DATA_SOURCES_DIR.glob("*")):
        if not path.is_file():
            continue
        stat = path.stat()
        items.append(
            UploadedCsv(
                original_filename=path.name,
                saved_path=path.name,
                size_bytes=stat.st_size,
                file_extension=path.suffix,
                modified_at=datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
            )
        )
    return items


def _csv_overview(path: Path, original_filename: str) -> DataSourceOverview:
    """Compute a lightweight overview of a CSV without pandas."""
    row_count = 0
    column_count = 0
    columns: List[Dict[str, object]] = []
    missing_values: Dict[str, int] = {}

    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if i == 0:
                column_count = len(row)
                columns = [{"name": col or f"col_{idx+1}", "dtype": "string"} for idx, col in enumerate(row)]
                missing_values = {col["name"]: 0 for col in columns}
            else:
                row_count += 1
                for idx, cell in enumerate(row):
                    col_name = columns[idx]["name"] if idx < len(columns) else f"col_{idx+1}"
                    if cell is None or str(cell).strip() == "":
                        missing_values[col_name] = missing_values.get(col_name, 0) + 1

    return DataSourceOverview(
        original_filename=original_filename,
        saved_path=path.name,
        size_bytes=path.stat().st_size,
        row_count=row_count,
        column_count=column_count,
        columns=columns,
        missing_values=missing_values,
    )


def _load_metrics_store() -> Dict[str, Any]:
    return _load_json(METRICS_STORE_PATH, {"jobs": []})


def _save_metrics_store(data: Dict[str, Any]) -> None:
    _save_json(METRICS_STORE_PATH, data)


def _now_iso() -> str:
    return datetime.datetime.utcnow().isoformat()


def _load_reports_store() -> Dict[str, Any]:
    return _load_json(REPORTS_STORE_PATH, {"reports": []})


def _save_reports_store(data: Dict[str, Any]) -> None:
    _save_json(REPORTS_STORE_PATH, data)


def _load_reference_docs_store() -> Dict[str, Any]:
    return _load_json(REFERENCE_DOCS_STORE_PATH, {"documents": []})


def _save_reference_docs_store(data: Dict[str, Any]) -> None:
    _save_json(REFERENCE_DOCS_STORE_PATH, data)


def _load_media_reports_store() -> Dict[str, Any]:
    return _load_json(MEDIA_REPORTS_STORE_PATH, {"reports": []})


def _save_media_reports_store(data: Dict[str, Any]) -> None:
    _save_json(MEDIA_REPORTS_STORE_PATH, data)

def notify_ai_server_of_media(
    media: MediaFile,
    drive_file_id: Optional[str],
    playback_url: Optional[str],
) -> None:
    """
    Best-effort notification to the AI server that a new media item is ready
    for denoising + transcription.

    This function should never raise; it quietly logs or ignores errors so
    core recording/upload flows are not affected if the AI server is down.
    """
    # AI_SERVER_BASE_URL should be defined in config (e.g. from env var).
    ai_base_url = getattr(config, "AI_SERVER_BASE_URL", None)
    if not ai_base_url:
        # If no AI server is configured, we skip silently.
        return

    # Build the JSON payload for the AI server.
    payload = TranscriptionJobPayload(
        media_id=media.id,
        drive_file_id=drive_file_id,
        media_url=playback_url,
        mime_type=media.mime_type,
        duration_sec=None,               # You can fill this later if you compute duration
        source=media.media_type,         # "record" or "upload"
        context=media.session_context,   # "practice" | "game" | None
        recording_mode=media.recording_mode,
    )

    url = ai_base_url.rstrip("/") + "/internal/transcribe"

    try:
        # Use a short timeout so we don't block the main flow too long.
        httpx.post(url, json=payload.model_dump(), timeout=5.0)
    except Exception:
        # For now, we silently ignore errors; you can replace with proper logging.
        # e.g. logging.exception("Failed to notify AI server for media_id=%s", media.id)
        return


# -----------------------------------------------------------------------------
# Helpers for organization/team/session context
# -----------------------------------------------------------------------------


def _parse_int(value: Optional[object]) -> Optional[int]:
    try:
        if value is None:
            return None
        if isinstance(value, str) and value.strip() == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def resolve_media_context(
    db: Session,
    *,
    organization_id: Optional[int],
    home_team_id: Optional[int],
    away_team_id: Optional[int],
    session_id: Optional[int],
) -> Dict[str, Optional[int]]:
    """
    Normalize and validate org/team/session ids.

    - If a session_id is provided, fall back to its org/home/away teams.
    - If teams imply an org and none provided, infer it.
    - If an explicit org conflicts with a team/org link, raise 400.
    """
    org = None
    home_team = None
    away_team = None
    session = None

    resolved_org_id = organization_id
    resolved_home_team_id = home_team_id
    resolved_away_team_id = away_team_id
    resolved_session_id = session_id

    if session_id is not None:
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        resolved_org_id = resolved_org_id or session.organization_id
        resolved_home_team_id = resolved_home_team_id or session.home_team_id
        resolved_away_team_id = resolved_away_team_id or session.away_team_id

    if resolved_home_team_id is not None:
        home_team = db.query(Team).filter(Team.id == resolved_home_team_id).first()
        if home_team is None:
            raise HTTPException(status_code=404, detail="Home team not found")
        if resolved_org_id is None:
            resolved_org_id = home_team.organization_id
        elif home_team.organization_id and home_team.organization_id != resolved_org_id:
            raise HTTPException(status_code=400, detail="Home team not in organization")

    if resolved_away_team_id is not None:
        away_team = db.query(Team).filter(Team.id == resolved_away_team_id).first()
        if away_team is None:
            raise HTTPException(status_code=404, detail="Away team not found")
        if resolved_org_id is None:
            resolved_org_id = away_team.organization_id
        elif away_team.organization_id and away_team.organization_id != resolved_org_id:
            raise HTTPException(status_code=400, detail="Away team not in organization")

    if resolved_org_id is not None:
        org = db.query(Organization).filter(Organization.id == resolved_org_id).first()
        if org is None:
            raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "organization_id": resolved_org_id,
        "home_team_id": resolved_home_team_id,
        "away_team_id": resolved_away_team_id,
        "session_id": resolved_session_id,
    }


def _get_or_create_demo_user(db: Session) -> User:
    """Return a default admin user (and org) for local/dev use."""
    org = db.query(Organization).filter(Organization.name == "Demo Org").first()
    if org is None:
        org = Organization(name="Demo Org", sport="soccer")
        db.add(org)
        db.flush()

    user = db.query(User).filter(func.lower(User.email) == "demo@plena.local").first()
    if user is None:
        user = User(
            name="Demo Admin",
            email="demo@plena.local",
            role="admin",
            organization_id=org.id,
            password_hash=None,
        )
        db.add(user)
        db.flush()

    db.commit()
    db.refresh(user)
    return user


def seed_demo_invites(db: Session) -> None:
    """Create default invite codes if none exist, for quick onboarding."""
    org = db.query(Organization).filter(Organization.name == "Demo Org").first()
    if org is None:
        org = Organization(name="Demo Org", sport="soccer")
        db.add(org)
        db.flush()

    existing = {inv.code for inv in db.query(InviteCode).all()}
    seeds = [
        ("DEMOADMIN", "admin"),
        ("DEMOUSER", "user"),
    ]
    created = False
    for code, role in seeds:
        if code in existing:
            continue
        inv = InviteCode(
            code=code,
            role=role,
            email=None,
            organization_id=org.id,
        )
        db.add(inv)
        created = True
    if created:
        db.commit()


def get_current_user(request: Request, db: Session) -> User:
    if request is None:
        raise HTTPException(status_code=500, detail="Request not available")
    user_id = request.session.get("user_id")
    user: Optional[User] = None

    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            request.session.clear()

    # Dev convenience: auto-login a demo admin if enabled
    if user is None and config.AUTO_LOGIN_DEMO:
        user = _get_or_create_demo_user(db)
        request.session["user_id"] = user.id

    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return user


def can_access_media(user: User, media: MediaFile) -> bool:
    if user.role == "admin" and user.organization_id:
        if media.organization_id == user.organization_id:
            return True
        if media.uploaded_by and media.uploaded_by.organization_id == user.organization_id:
            return True
        return False
    return media.uploaded_by_user_id == user.id


def filter_media_query(query, user: User):
    if user.role == "admin" and user.organization_id:
        return (
            query.outerjoin(User, MediaFile.uploaded_by_user_id == User.id)
            .filter(
                or_(
                    MediaFile.organization_id == user.organization_id,
                    User.organization_id == user.organization_id,
                )
            )
        )
    return query.filter(MediaFile.uploaded_by_user_id == user.id)


# -----------------------------------------------------------------------------
# FastAPI app + CORS
# -----------------------------------------------------------------------------

app = FastAPI(title="Media Demo")

# Signed cookie session for login state.
app.add_middleware(
    SessionMiddleware,
    secret_key=config.SECRET_KEY,
    session_cookie="plena_session",
    same_site="lax",
)

# Allow your Next.js dev app to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static + media mounts. MEDIA_ROOT has subfolders:
#  - /uploads
#  - /recordings
STATIC_DIR = config.BASE_DIR / "static"
app.mount("/media", StaticFiles(directory=config.MEDIA_ROOT), name="media")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup_event():
    """Create all tables on startup (simple demo-style migration)."""
    Base.metadata.create_all(bind=engine)
    # Seed demo invites and users for quick testing
    db = SessionLocal()
    try:
        _get_or_create_demo_user(db)
        seed_demo_invites(db)
    finally:
        db.close()


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Serve the demo index.html from /static for quick manual testing."""
    if not request.session.get("user_id"):
        return RedirectResponse(url="/login")
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return HTMLResponse(index_file.read_text(encoding="utf-8"))


@app.get("/register", response_class=HTMLResponse)
async def register_page():
    """Serve the registration page."""
    page_file = STATIC_DIR / "register.html"
    if not page_file.exists():
        raise HTTPException(status_code=404, detail="register.html not found")
    return HTMLResponse(page_file.read_text(encoding="utf-8"))


@app.get("/login", response_class=HTMLResponse)
async def login_page():
    """Serve the login page."""
    page_file = STATIC_DIR / "login.html"
    if not page_file.exists():
        raise HTTPException(status_code=404, detail="login.html not found")
    return HTMLResponse(page_file.read_text(encoding="utf-8"))


@app.get("/view", response_class=HTMLResponse)
async def view_page(request: Request):
    """Serve the view page (requires login)."""
    if not request.session.get("user_id"):
        return RedirectResponse(url="/login")
    page_file = STATIC_DIR / "view.html"
    if not page_file.exists():
        raise HTTPException(status_code=404, detail="view.html not found")
    return HTMLResponse(page_file.read_text(encoding="utf-8"))


# -----------------------------------------------------------------------------
# Upload endpoint (Library "Upload" flow)
# -----------------------------------------------------------------------------


@app.post("/upload", response_model=List[MediaFileRead], status_code=201)
async def upload_media(
    files: List[UploadFile] = File(...),
    session_id: Optional[int] = Form(None),
    home_team_id: Optional[int] = Form(None),
    away_team_id: Optional[int] = Form(None),
    organization_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """
    Upload one or more media files from the Library tab.

    Updated behavior (minimal, keeps existing flows working):
      - Save a local copy under MEDIA_ROOT/uploads so the browser can play it via /media/uploads/...
      - Upload the same bytes to Google Drive (unchanged storage behavior)
      - Store a *local relative path* in MediaFile.filepath: "uploads/<saved_name>"
      - Return a canonical same-origin playback URL using build_media_url()
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Resolve the uploads directory (keep it consistent with your /media mount).
    uploads_dir: Path = getattr(config, "UPLOADS_DIR", config.MEDIA_ROOT / "uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)  # Ensure the folder exists for playback.

    drive_service = None
    if config.DRIVE_ENABLED:
        try:
            drive_service = get_drive_service()
        except Exception:
            # Drive is optional; we still allow local-only storage.
            drive_service = None

    current_user = get_current_user(request, db)

    context_ids = resolve_media_context(
        db,
        organization_id=organization_id,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        session_id=session_id,
    )
    if context_ids["organization_id"] is None and current_user.organization_id:
        context_ids["organization_id"] = current_user.organization_id
    if current_user.organization_id and context_ids["organization_id"] != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Organization mismatch")

    # Keep both the DB row and the Drive metadata (Drive meta is still useful for AI notification).
    saved_items: List[tuple[MediaFile, Optional[dict]]] = []

    try:
        for file in files:
            # Defensive: strip any path components from the client-provided name.
            original_name = Path(file.filename).name

            # Generate a stable local/Drive filename that won’t collide.
            suffix = Path(original_name).suffix
            saved_name = f"{uuid.uuid4().hex}{suffix}" if suffix else f"{uuid.uuid4().hex}_{original_name}"

            # Read uploaded bytes once.
            content = await file.read()

            # Infer audio/video mode from MIME type (matches your prior behavior).
            mime_type = file.content_type or ""
            recording_mode: Optional[str] = None
            if mime_type.startswith("video/"):
                recording_mode = "video"
            elif mime_type.startswith("audio/"):
                recording_mode = "audio"

            # 1) Write a local copy for reliable playback.
            #    This is the key change that fixes the "unsupported format/MIME" issue in <video>/<audio>.
            local_path = uploads_dir / saved_name
            try:
                local_path.write_bytes(content)
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Local save failed: {exc}") from exc

            # 2) Upload a copy to Drive when available.
            drive_meta: Optional[dict] = None
            if drive_service is not None:
                try:
                    drive_meta = upload_bytes(
                        drive_service,
                        data=content,
                        filename=saved_name,
                        mime_type=file.content_type,
                        folder_id=config.DRIVE_FOLDER_ID,
                    )
                except Exception:
                    # If Drive upload fails, we still keep the local file + DB row.
                    drive_meta = None

            # Store a local relative filepath under MEDIA_ROOT so build_media_url() returns /media/uploads/...
            relative_path = f"uploads/{saved_name}"

            # Create DB row. Keep filename user-friendly (original), but filepath points to local storage.
            media = MediaFile(
                filename=original_name,  # User-friendly display name
                filepath=relative_path,  # Local relative path for /media playback
                media_type="upload",
                mime_type=(drive_meta.get("mimeType") if drive_meta else None) or file.content_type,
                session_context=None,
                recording_mode=recording_mode,
                organization_id=context_ids["organization_id"],
                home_team_id=context_ids["home_team_id"],
                away_team_id=context_ids["away_team_id"],
                session_id=context_ids["session_id"],
                uploaded_by_user_id=current_user.id,
            )
            db.add(media)
            db.flush()  # Assigns media.id without committing yet
            saved_items.append((media, drive_meta))

        db.commit()
    except Exception:
        db.rollback()
        raise

    # Build response: URL must be same-origin /media/uploads/... so <video>/<audio> can play it.
    response_items: List[MediaFileRead] = []
    for media, meta in saved_items:
        response_items.append(
            MediaFileRead.model_validate(media, from_attributes=True).model_copy(
                update={
                    # Canonical playback URL now points to local /media/uploads/...
                    "url": build_media_url(media),
                    # filepath is the local relative path (uploads/<saved_name>)
                    "filepath": media.filepath,
                }
            )
        )

    # Best-effort notify the AI server (still pass Drive id if it exists).
    for media, meta in saved_items:
        try:
            notify_ai_server_of_media(
                media=media,
                drive_file_id=(meta.get("id") if meta else None),
                playback_url=build_media_url(media),
            )
        except Exception:
            # Ignore failures; core upload flow must not break if AI server is down.
            pass

    return response_items


# -----------------------------------------------------------------------------
# Admin Data Sources (CSV) endpoints used by the frontend
# -----------------------------------------------------------------------------

@app.get("/admin/data-sources", response_model=List[UploadedCsv])
def list_data_sources(
    db: Session = Depends(get_db),
    request: Request = None,
):
    # Ensure user exists (auto-login in dev)
    _ = get_current_user(request, db)
    return _scan_data_sources()


@app.post("/admin/data-sources/upload", response_model=UploadedCsv, status_code=201)
async def upload_data_source(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)

    filename = Path(file.filename).name
    saved_name = f"{uuid.uuid4().hex}_{filename}"
    dest = config.DATA_SOURCES_DIR / saved_name

    content = await file.read()
    dest.write_bytes(content)

    stat = dest.stat()
    return UploadedCsv(
        original_filename=filename,
        saved_path=dest.name,
        size_bytes=stat.st_size,
        file_extension=dest.suffix,
        modified_at=datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
    )


@app.post("/admin/data-sources/overview", response_model=DataSourceOverview)
def data_source_overview(
    payload: Dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    saved_path = payload.get("saved_path")
    if not saved_path:
        raise HTTPException(status_code=400, detail="saved_path is required")
    full_path = _data_source_full_path(saved_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if full_path.suffix.lower() not in {".csv"}:
        raise HTTPException(status_code=400, detail="Only .csv files supported in this demo")

    try:
        return _csv_overview(full_path, full_path.name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {exc}") from exc


@app.delete("/admin/data-sources", status_code=204)
def delete_data_source(
    payload: Dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    saved_path = payload.get("saved_path")
    if not saved_path:
        raise HTTPException(status_code=400, detail="saved_path is required")
    full_path = _data_source_full_path(saved_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        full_path.unlink()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {exc}") from exc
    return Response(status_code=204)


# -----------------------------------------------------------------------------
# Admin Metrics endpoints (mock AI workflow)
# -----------------------------------------------------------------------------

def _find_job(data: Dict[str, Any], job_id: str) -> Optional[Dict[str, Any]]:
    for job in data.get("jobs", []):
        if job.get("job_id") == job_id:
            return job
    return None


def _definition_from_job(job: Dict[str, Any]) -> Dict[str, Any]:
    req = job.get("request", {})
    return {
        "job_id": job["job_id"],
        "status": job.get("status"),
        "created_at": job.get("created_at"),
        "updated_at": job.get("updated_at"),
        "metric_name": req.get("metric_name"),
        "description": req.get("description"),
        "sport": req.get("sport"),
        "constraints": req.get("constraints"),
        "org_context": job.get("org_context"),
        "plain_language_definition": job.get("plain_language_definition"),
        "operational_definition": job.get("intent_spec", {}).get("operational_definition"),
        "data_disclaimer": job.get("data_disclaimer"),
    }


@app.get("/admin/metrics/definitions")
def list_metric_definitions(
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_metrics_store()
    defs = [_definition_from_job(job) for job in store.get("jobs", [])]
    return {"definitions": defs}


@app.post("/admin/metrics/jobs", response_model=MetricJob)
def create_metric_job(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_metrics_store()
    job_id = str(uuid.uuid4())
    now = _now_iso()
    request_body = payload.get("request") or {}

    job = {
        "job_id": job_id,
        "status": "waiting_for_data_source",
        "created_at": now,
        "updated_at": now,
        "request": request_body,
        "org_context": payload.get("org_context"),
        "data_sources": [],
        "plain_language_definition": "",
        "intent_spec": {"operational_definition": ""},
        "data_disclaimer": "",
        "critique_report": None,
        "python_execution": None,
        "metadata": {"runs": []},
        "error": None,
    }
    store.setdefault("jobs", []).insert(0, job)
    _save_metrics_store(store)
    return job


@app.get("/admin/metrics/jobs/{job_id}", response_model=MetricJob)
def get_metric_job(
    job_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_metrics_store()
    job = _find_job(store, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/admin/metrics/jobs/{job_id}/data-sources", response_model=MetricJob)
def attach_metric_data_source(
    job_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_metrics_store()
    job = _find_job(store, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ds_list = payload.get("data_sources") or []
    if not ds_list and payload.get("saved_path"):
        ds_list = [
            {
                "type": "upload_csv",
                "saved_path": payload["saved_path"],
                "display_name": Path(payload["saved_path"]).name,
            }
        ]

    job["data_sources"] = ds_list
    job["status"] = "waiting_for_admin_approval"
    job["updated_at"] = _now_iso()
    _save_metrics_store(store)
    return job


@app.post("/admin/metrics/jobs/{job_id}/admin-decision", response_model=MetricJob)
def metric_admin_decision(
    job_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_metrics_store()
    job = _find_job(store, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    decision = payload.get("decision")
    edits = payload.get("edits") or {}
    comment = payload.get("comment")

    if decision not in {"approve", "edit", "reject"}:
        raise HTTPException(status_code=400, detail="Invalid decision")

    if decision in {"approve", "edit"}:
        if edits:
            job["plain_language_definition"] = edits.get("plain_language_definition", job.get("plain_language_definition", ""))
            job.setdefault("intent_spec", {})["operational_definition"] = edits.get(
                "operational_definition",
                job.get("intent_spec", {}).get("operational_definition", ""),
            )
            job["data_disclaimer"] = edits.get("data_disclaimer", job.get("data_disclaimer", ""))
        job["status"] = "ready_to_run"
        job["error"] = None
    else:
        job["status"] = "failed"
        job["error"] = {"error_code": "rejected", "error_message": comment or "Rejected by admin"}

    job["updated_at"] = _now_iso()
    _save_metrics_store(store)
    return job


@app.post("/admin/metrics/jobs/{job_id}/run", response_model=MetricJob)
def run_metric_job(
    job_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_metrics_store()
    job = _find_job(store, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    run_id = str(uuid.uuid4())
    saved_path = payload.get("saved_path") or payload.get("selected_csv_saved_path")
    started = _now_iso()

    result_json = {
        "value": 1.0,
        "message": "Mock metric run completed successfully.",
        "metadata": {
            "data_disclaimer": job.get("data_disclaimer") or "Mock data for local testing.",
        },
        "plots": [],
    }

    run_record = {
        "run_id": run_id,
        "status": "success",
        "selected_csv_saved_path": saved_path,
        "run_label": payload.get("run_name") or payload.get("comment"),
        "started_at": started,
        "finished_at": _now_iso(),
        "exit_code": 0,
        "stdout": json.dumps(result_json),
        "stderr": "",
        "truncated_stdout": False,
        "truncated_stderr": False,
    }

    job.setdefault("metadata", {}).setdefault("runs", []).append(run_record)
    job["status"] = "ready_to_run"
    job["updated_at"] = _now_iso()
    _save_metrics_store(store)
    return job


@app.delete("/admin/metrics/definitions/{job_id}", status_code=204)
def delete_metric_definition(
    job_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_metrics_store()
    jobs = store.get("jobs", [])
    new_jobs = [j for j in jobs if j.get("job_id") != job_id]
    if len(new_jobs) == len(jobs):
        raise HTTPException(status_code=404, detail="Job not found")
    store["jobs"] = new_jobs
    _save_metrics_store(store)
    return Response(status_code=204)


@app.delete("/admin/metrics/jobs/{job_id}", status_code=204)
def delete_metric_job(
    job_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    return delete_metric_definition(job_id, db=db, request=request)


# -----------------------------------------------------------------------------
# Admin Reports endpoints (mock)
# -----------------------------------------------------------------------------

def _find_report(store: Dict[str, Any], report_id: str) -> Optional[Dict[str, Any]]:
    for r in store.get("reports", []):
        if r.get("report_id") == report_id:
            return r
    return None


def _build_simple_pdf(text: str) -> bytes:
    safe_text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    content_stream = f"BT /F1 12 Tf 72 720 Td ({safe_text}) Tj ET"
    stream_bytes = content_stream.encode("utf-8")
    pdf_parts = [
        "%PDF-1.4",
        "1 0 obj <<>> endobj",
        f"2 0 obj << /Length {len(stream_bytes)} >> stream",
        content_stream,
        "endstream endobj",
        "3 0 obj << /Type /Page /Parent 4 0 R /Contents 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> >> endobj",
        "4 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
        "6 0 obj << /Type /Catalog /Pages 4 0 R >> endobj",
        "trailer << /Root 6 0 R >>",
        "%%EOF",
    ]
    return "\n".join(pdf_parts).encode("utf-8")


@app.get("/admin/reports")
def list_reports(
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reports_store()
    return {"reports": store.get("reports", [])}


@app.post("/admin/reports")
def create_report(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reports_store()
    report_id = str(uuid.uuid4())
    now = _now_iso()
    rec = {
        "report_id": report_id,
        "status": "completed",
        "report_type": payload.get("report_type") or "player_development",
        "csv_filename": None,
        "csv_saved_path": payload.get("selected_csv_path"),
        "report_label": payload.get("report_label"),
        "created_at": now,
        "updated_at": now,
        "pdf_path": f"/admin/reports/{report_id}/pdf",
        "error_message": None,
        "org_id": payload.get("org_id"),
        "context": payload.get("context"),
    }
    store.setdefault("reports", []).insert(0, rec)
    _save_reports_store(store)
    return rec


@app.get("/admin/reports/{report_id}")
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reports_store()
    rec = _find_report(store, report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found")
    return rec


@app.delete("/admin/reports/{report_id}", status_code=204)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reports_store()
    reports = store.get("reports", [])
    new_reports = [r for r in reports if r.get("report_id") != report_id]
    if len(new_reports) == len(reports):
        raise HTTPException(status_code=404, detail="Report not found")
    store["reports"] = new_reports
    _save_reports_store(store)
    return Response(status_code=204)


@app.get("/admin/reports/{report_id}/pdf")
def download_report_pdf(
    report_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reports_store()
    rec = _find_report(store, report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found")
    pdf_bytes = _build_simple_pdf(f"Mock report {report_id}")
    headers = {"Content-Disposition": f'inline; filename="{report_id}.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


# -----------------------------------------------------------------------------
# Media-specific report endpoints (used by Learn report generator)
# -----------------------------------------------------------------------------

def _find_media_report(store: Dict[str, Any], media_id: int, report_id: str) -> Optional[Dict[str, Any]]:
    for r in store.get("reports", []):
        if r.get("report_id") == report_id and int(r.get("media_id", -1)) == int(media_id):
            return r
    return None


@app.get("/api/media/{media_id}/report-status")
def media_report_status(
    media_id: int,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    # Simplified: always ready
    return {"status": "ready"}


@app.post("/api/media/{media_id}/reports")
def create_media_report(
    media_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    user = get_current_user(request, db)
    media = (
        db.query(MediaFile)
        .options(joinedload(MediaFile.uploaded_by))
        .filter(MediaFile.id == media_id)
        .first()
    )
    if media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    if not can_access_media(user, media):
        raise HTTPException(status_code=403, detail="Forbidden")

    store = _load_media_reports_store()
    report_id = str(uuid.uuid4())
    now = _now_iso()
    rec = {
        "report_id": report_id,
        "media_id": media_id,
        "status": "completed",
        "report_type": payload.get("report_type") or "player",
        "created_at": now,
        "updated_at": now,
        "pdf_path": f"/api/media/{media_id}/reports/{report_id}/pdf",
    }
    store.setdefault("reports", []).insert(0, rec)
    _save_media_reports_store(store)
    return {"reportId": report_id}


@app.get("/api/media/{media_id}/reports/{report_id}")
def get_media_report(
    media_id: int,
    report_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    user = get_current_user(request, db)
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    if not can_access_media(user, media):
        raise HTTPException(status_code=403, detail="Forbidden")
    store = _load_media_reports_store()
    rec = _find_media_report(store, media_id, report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found")
    return rec


@app.get("/api/media/{media_id}/reports/{report_id}/pdf")
def download_media_report_pdf(
    media_id: int,
    report_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    user = get_current_user(request, db)
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    if not can_access_media(user, media):
        raise HTTPException(status_code=403, detail="Forbidden")

    store = _load_media_reports_store()
    rec = _find_media_report(store, media_id, report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = _build_simple_pdf(f"Media report {report_id} for media {media_id}")
    headers = {"Content-Disposition": f'inline; filename="media_report_{report_id}.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


# -----------------------------------------------------------------------------
# Admin Reference Materials endpoints (mock)
# -----------------------------------------------------------------------------

def _reference_record_from_store(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "doc_id": doc["doc_id"],
        "filename": doc["filename"],
        "name": doc["name"],
        "description": doc.get("description"),
        "categories": doc.get("categories", []),
        "file_size_bytes": doc.get("file_size_bytes", 0),
        "page_count": doc.get("page_count", 1),
        "is_indexed": doc.get("is_indexed", True),
        "chunk_count": doc.get("chunk_count", 1),
        "uploaded_at": doc.get("uploaded_at"),
        "index_error": doc.get("index_error"),
    }


@app.get("/admin/orgs/{org_id}/reference-docs")
def list_reference_materials(
    org_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reference_docs_store()
    return {"documents": store.get("documents", [])}


@app.post("/admin/orgs/{org_id}/reference-docs")
async def upload_reference_material(
    org_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = None,
    categories: Optional[str] = "",
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reference_docs_store()

    filename = Path(file.filename).name
    doc_id = str(uuid.uuid4())
    saved_name = f"{doc_id}_{filename}"
    dest = config.REFERENCE_DOCS_DIR / saved_name
    content = await file.read()
    dest.write_bytes(content)

    cats = [c for c in (categories or "").split(",") if c] or ["general"]
    now = _now_iso()
    record = {
        "doc_id": doc_id,
        "filename": filename,
        "name": Path(filename).stem,
        "description": description or "",
        "categories": cats,
        "file_size_bytes": dest.stat().st_size,
        "page_count": 1,
        "is_indexed": True,
        "chunk_count": 1,
        "uploaded_at": now,
        "index_error": None,
        "saved_path": dest.name,
    }

    store.setdefault("documents", []).insert(0, record)
    _save_reference_docs_store(store)
    return record


@app.delete("/admin/orgs/{org_id}/reference-docs/{doc_id}", status_code=204)
def delete_reference_material(
    org_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    _ = get_current_user(request, db)
    store = _load_reference_docs_store()
    docs = store.get("documents", [])
    doc = next((d for d in docs if d.get("doc_id") == doc_id), None)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    store["documents"] = [d for d in docs if d.get("doc_id") != doc_id]
    _save_reference_docs_store(store)

    saved_path = doc.get("saved_path")
    if saved_path:
        dest = config.REFERENCE_DOCS_DIR / Path(saved_path).name
        if dest.exists():
            dest.unlink()

    return Response(status_code=204)


# -----------------------------------------------------------------------------
# Reference data endpoints for org/team/session selection
# -----------------------------------------------------------------------------


@app.post("/api/invites/verify", response_model=InviteVerifyResponse)
def verify_invite(payload: InviteVerifyRequest, db: Session = Depends(get_db)):
    code = payload.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Invite code required")

    invite = (
        db.query(InviteCode)
        .options(joinedload(InviteCode.organization))
        .filter(InviteCode.code == code)
        .first()
    )
    if invite is None:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if invite.used_at or invite.used_by_user_id:
        raise HTTPException(status_code=400, detail="Invite code already used")

    return InviteVerifyResponse(
        role=invite.role,
        email=invite.email,
        organization_id=invite.organization_id,
        organization=invite.organization,
    )


@app.post("/api/register", response_model=UserRead, status_code=201)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db), request: Request = None):
    code = payload.code.strip()
    name = payload.name.strip()
    email = payload.email.strip().lower()
    password = payload.password.strip()

    if not code:
        raise HTTPException(status_code=400, detail="Invite code required")
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    if not password:
        raise HTTPException(status_code=400, detail="Password required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password too short")

    invite = db.query(InviteCode).filter(InviteCode.code == code).first()
    if invite is None:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if invite.used_at or invite.used_by_user_id:
        raise HTTPException(status_code=400, detail="Invite code already used")
    if invite.email and invite.email.lower() != email:
        raise HTTPException(status_code=400, detail="Email does not match invite")

    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=name,
        email=email,
        role=invite.role,
        organization_id=invite.organization_id,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.flush()

    invite.used_by_user_id = user.id
    invite.used_at = func.now()
    db.add(invite)
    db.commit()
    db.refresh(user)
    if request is not None:
        request.session["user_id"] = user.id
    return user


@app.post("/api/login", response_model=UserRead)
def login_user(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    identifier = payload.email.strip()
    password = payload.password
    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Email or username and password required")

    normalized = identifier.lower()
    user = db.query(User).filter(func.lower(User.email) == normalized).first()
    if user is None:
        matches = (
            db.query(User)
            .filter(func.lower(User.name) == normalized)
            .limit(2)
            .all()
        )
        if len(matches) > 1:
            raise HTTPException(status_code=409, detail="Multiple users share that name; use email")
        if matches:
            user = matches[0]
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    request.session["user_id"] = user.id
    return user


@app.post("/api/logout", status_code=204)
def logout_user(request: Request):
    request.session.clear()
    return Response(status_code=204)


@app.get("/api/me", response_model=UserRead)
def get_me(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    return user


@app.get("/api/organizations", response_model=List[OrganizationRead])
def list_organizations(db: Session = Depends(get_db), request: Request = None):
    current_user = get_current_user(request, db)
    query = db.query(Organization)
    if current_user.organization_id:
        query = query.filter(Organization.id == current_user.organization_id)
    return query.order_by(Organization.name.asc()).all()


@app.get("/api/users", response_model=List[UserRead])
def list_users(
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    request: Request = None,
):
    current_user = get_current_user(request, db)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    query = db.query(User).options(joinedload(User.organization))
    org_id = current_user.organization_id
    if org_id is not None:
        query = query.filter(User.organization_id == org_id)
    elif organization_id is not None:
        query = query.filter(User.organization_id == organization_id)
    return query.order_by(User.name.asc(), User.id.asc()).all()


@app.post("/api/users", response_model=UserRead, status_code=201)
def create_user(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    current_user = get_current_user(request, db)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower() or None
    role = (payload.get("role") or "user").strip() or "user"
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    if email:
        existing = db.query(User).filter(func.lower(User.email) == email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already exists")
    user = User(
        name=name,
        email=email,
        role=role,
        organization_id=current_user.organization_id,
        password_hash=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/api/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    request: Request = None,
):
    current_user = get_current_user(request, db)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.organization_id and user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if "name" in payload:
        user.name = (payload.get("name") or user.name).strip()
    if "email" in payload:
        new_email = (payload.get("email") or "").strip().lower() or None
        if new_email and new_email != (user.email or "").lower():
            exists = db.query(User).filter(func.lower(User.email) == new_email).first()
            if exists and exists.id != user.id:
                raise HTTPException(status_code=409, detail="Email already exists")
            user.email = new_email
    if "role" in payload and payload.get("role"):
        user.role = payload["role"]
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.delete("/api/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    request: Request = None,
):
    current_user = get_current_user(request, db)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.organization_id and user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(user)
    db.commit()
    return Response(status_code=204)


@app.get("/api/teams", response_model=List[TeamRead])
def list_teams(
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    request: Request = None,
):
    current_user = get_current_user(request, db)
    query = (
        db.query(Team)
        .options(
            joinedload(Team.players),
            joinedload(Team.coaches),
            joinedload(Team.organization),
        )
    )
    if current_user.organization_id is not None:
        query = query.filter(Team.organization_id == current_user.organization_id)
    elif organization_id is not None:
        query = query.filter(Team.organization_id == organization_id)
    return query.order_by(Team.name.asc(), Team.id.asc()).all()


@app.get("/api/sessions", response_model=List[SessionRead])
def list_sessions(
    team_id: Optional[int] = None,
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    request: Request = None,
):
    current_user = get_current_user(request, db)
    query = (
        db.query(GameSession)
        .options(
            joinedload(GameSession.home_team),
            joinedload(GameSession.away_team),
            joinedload(GameSession.organization),
        )
    )
    if current_user.organization_id is not None:
        query = query.filter(GameSession.organization_id == current_user.organization_id)
    elif organization_id is not None:
        query = query.filter(GameSession.organization_id == organization_id)
    if team_id is not None:
        query = query.filter(
            or_(GameSession.home_team_id == team_id, GameSession.away_team_id == team_id)
        )
    return query.order_by(GameSession.start_at.desc(), GameSession.id.desc()).all()



# -----------------------------------------------------------------------------
# Annotation endpoints (used by Learn tab)
# -----------------------------------------------------------------------------

@app.get("/api/media/{media_id}/annotations", response_model=List[AnnotationRead])
def list_annotations(
    media_id: int,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """
    Return all annotations (bookmarks + notes) for a given media file.

    The list is ordered by timestamp so the frontend can display them in
    playback order.
    """
    current_user = get_current_user(request, db)
    media = (
        db.query(MediaFile)
        .options(joinedload(MediaFile.uploaded_by))
        .filter(MediaFile.id == media_id)
        .first()
    )
    if media is None:
        raise HTTPException(status_code=404, detail="Media file not found")
    if not can_access_media(current_user, media):
        raise HTTPException(status_code=403, detail="Forbidden")

    items = (
        db.query(Annotation)
        .filter(Annotation.media_file_id == media_id)
        .order_by(Annotation.timestamp_ms.asc(), Annotation.id.asc())
        .all()
    )
    if current_user.role == "admin":
        return items
    return [item for item in items if item.user_id == current_user.id]


@app.post("/api/media/{media_id}/annotations", response_model=AnnotationRead, status_code=201)
def create_annotation(
    media_id: int,
    payload: AnnotationCreate,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """
    Create a new annotation (bookmark or note) for a given media file.

    The frontend sends:
      - kind: "bookmark" | "note"
      - timestamp_ms: integer milliseconds from start of recording
      - text: optional note text
    """
    current_user = get_current_user(request, db)
    media = (
        db.query(MediaFile)
        .options(joinedload(MediaFile.uploaded_by))
        .filter(MediaFile.id == media_id)
        .first()
    )
    if media is None:
        raise HTTPException(status_code=404, detail="Media file not found")
    if not can_access_media(current_user, media):
        raise HTTPException(status_code=403, detail="Forbidden")

    annotation = Annotation(
        media_file_id=media_id,
        kind=payload.kind,
        timestamp_ms=payload.timestamp_ms,
        text=payload.text,
        user_id=current_user.id,
    )

    db.add(annotation)
    db.commit()
    db.refresh(annotation)

    return annotation


# -----------------------------------------------------------------------------
# Media listing endpoint (Library + Learn)
# -----------------------------------------------------------------------------

@app.get("/api/media", response_model=List[MediaFileRead])
def list_media(
    media_type: str = "record",
    limit: int = 100,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """
    List media files for the Library view and for Learn URL resolution.

    - Default: media_type="record" (sessions recorded via /ws/stream).
    - If the frontend passes media_type="", we skip filtering and return all.
    - Returns most recent first.
    """
    current_user = get_current_user(request, db)
    query = db.query(MediaFile)
    query = filter_media_query(query, current_user)

    # When media_type is a non-empty string, we filter; when it's "", we return all.
    if media_type:
        query = query.filter(MediaFile.media_type == media_type)

    items = (
        query
        .order_by(MediaFile.created_at.desc(), MediaFile.id.desc())
        .limit(limit)
        .all()
    )

    # Use the same helper as /upload so recordings and uploads expose
    # consistent playback URLs to the frontend.
    return [
        MediaFileRead.model_validate(obj, from_attributes=True).model_copy(
            update={
                "url": build_media_url(obj),
            }
        )
        for obj in items
    ]


# -----------------------------------------------------------------------------
# Transcription callback endpoint (AI server → storage server)
# -----------------------------------------------------------------------------

class TranscriptionUpdate(BaseModel):
    """
    Payload from the AI server when a transcript CSV has been created and
    uploaded to Google Drive.

    NOTE: This assumes MediaFile has a `transcription_url` field; we will add
    that to the model and schemas separately.
    """

    transcription_url: str


@app.post("/api/media/{media_id}/transcript", status_code=200)
def update_media_transcription(
    media_id: int,
    payload: TranscriptionUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a MediaFile row with the Drive URL of its transcript CSV.

    This endpoint is intended to be called by the AI server after it finishes
    denoising + transcription and uploads `<media_id>_transcript.csv` into
    your transcripts folder on Drive.
    """
    media = (
        db.query(MediaFile)
        .options(joinedload(MediaFile.uploaded_by))
        .filter(MediaFile.id == media_id)
        .first()
    )
    if media is None:
        raise HTTPException(status_code=404, detail="Media file not found")

    # This field must exist on the MediaFile SQLAlchemy model.
    media.transcription_url = payload.transcription_url

    db.add(media)
    db.commit()
    db.refresh(media)

    # You can return a simple message or the updated media object; keeping it simple.
    return {"media_id": media.id, "transcription_url": media.transcription_url}




# -----------------------------------------------------------------------------
# Handles deletion of media files and their annotations
# -----------------------------------------------------------------------------

@app.delete("/api/media/{media_id}", status_code=204)
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    request: Request = None,
) -> Response:
    """
    Delete a media record from the local database, along with all of its
    annotations. The underlying file on Google Drive is left untouched.

    - Input:  media_id (path param)
    - Effect: removes rows from `annotations` and `media_files` tables.
    - Output: 204 No Content on success.
    """

    # Look up the media row first so we can return 404 if it does not exist.
    current_user = get_current_user(request, db)
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if media is None:
        raise HTTPException(status_code=404, detail="Media file not found")
    if not can_access_media(current_user, media):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Cascade: delete all annotations that belong to this media file.
    db.query(Annotation).filter(Annotation.media_file_id == media_id).delete(
        synchronize_session=False
    )

    # Delete the media row itself (local DB only; Drive file is NOT removed).
    db.delete(media)
    db.commit()

    # 204 No Content – indicates success with no response body.
    return Response(status_code=204)


# -----------------------------------------------------------------------------
# WebSocket endpoint for live recording (/ws/stream)
# -----------------------------------------------------------------------------

@app.websocket("/ws/stream")
async def stream_media(websocket: WebSocket):
    """
    WebSocket endpoint that accepts small binary chunks from the browser:

      - Client opens WS and sends a JSON "start" event describing the stream.
      - Client then sends audio/video chunks (MediaRecorder blobs) as raw bytes.
      - Client finally sends JSON "end" to signal completion.

    Server:
      - Writes chunks into a local file under MEDIA_ROOT/recordings.
      - Converts to MP4 (video) or MP3 (audio) via ffmpeg.
      - Uploads the final file to Drive for storage.
      - Creates a MediaFile row with media_type="record" and a local filepath.
      - Sends a final "saved" JSON event back over the same WebSocket with:
          { event: "saved", id, filename, filepath, media_type, mime_type,
            created_at, url }
        where `url` is a same-origin /media/... URL safe for playback.
    """
    await websocket.accept()

    session_id = uuid.uuid4().hex
    filename: Optional[str] = None
    filepath: Optional[Path] = None
    mime_type = "video/webm"
    container_ext = "webm"
    stream_kind = "video"  # "video" or "audio"
    bytes_written = 0

    db = SessionLocal()
    session = websocket.scope.get("session") or {}
    user_id = session.get("user_id")
    current_user: Optional[User] = None

    if user_id:
        current_user = db.query(User).filter(User.id == user_id).first()

    if current_user is None and config.AUTO_LOGIN_DEMO:
        current_user = _get_or_create_demo_user(db)
        session["user_id"] = current_user.id

    if current_user is None:
        db.close()
        await websocket.close(code=1008)
        return

    drive_service = None
    if config.DRIVE_ENABLED:
        try:
            drive_service = get_drive_service()
        except Exception:
            # Drive is optional; allow local-only recording.
            drive_service = None
    outfile: Optional[Path] = None

    # Track session context and recording mode for Library/Learn filters
    session_context: Optional[str] = None  # "practice" | "game"
    recording_mode: Optional[str] = None   # "audio" | "video"

    # New: org/team/session linkage
    organization_id: Optional[int] = None
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None
    game_session_id: Optional[int] = None  # Avoid shadowing SQLAlchemy Session

    # We also hold onto the final DB row and Drive metadata if we need them
    record: Optional[MediaFile] = None
    drive_meta: Optional[dict] = None

    def open_output(extension: str) -> str:
        """
        Create a local file under MEDIA_ROOT/recordings with a safe extension.
        """
        nonlocal filename, filepath, outfile

        safe_ext = "".join(ch for ch in extension if ch.isalnum() or ch in {"_", "-"})
        ext = safe_ext or "webm"

        filename = f"recording_{session_id}.{ext}"
        filepath = config.RECORDINGS_DIR / filename
        outfile = filepath.open("wb")
        return ext

    def convert_to_mp4(source: Path) -> Optional[Path]:
        """
        Convert webm/other input to MP4 for easier playback on the web.
        """
        target = source.with_suffix(".mp4")
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            str(target),
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, check=False)
            if result.returncode != 0:
                return None
            return target
        except FileNotFoundError:
            return None

    def convert_to_mp3(source: Path) -> Optional[Path]:
        """
        Convert the input container to MP3 for audio-only sessions.
        """
        target = source.with_suffix(".mp3")
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-vn",
            "-acodec",
            "libmp3lame",
            "-q:a",
            "2",
            str(target),
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, check=False)
            if result.returncode != 0:
                return None
            return target
        except FileNotFoundError:
            return None

    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break

            text_data = message.get("text")
            byte_data = message.get("bytes")

            # Control messages are sent as JSON text
            if text_data:
                try:
                    payload = json.loads(text_data)
                except json.JSONDecodeError:
                    continue

                event = payload.get("event")

                if event == "end":
                    # Client signaled that streaming is finished; we break
                    # from the receive loop but keep the socket open so we
                    # can send a "saved" event back after processing.
                    break

                if event == "start":
                    requested_ext = payload.get("extension") or "webm"
                    container_ext = requested_ext
                    stream_kind = payload.get("kind") or stream_kind
                    mime_type = payload.get("mimeType") or (
                        "audio/webm" if stream_kind == "audio" else mime_type
                    )

                    # Context + explicit recording mode
                    session_context = payload.get("context")  # "practice" | "game"
                    recording_mode = payload.get("recordingMode") or stream_kind
                    organization_id = _parse_int(payload.get("organizationId"))
                    home_team_id = _parse_int(payload.get("homeTeamId"))
                    away_team_id = _parse_int(payload.get("awayTeamId"))
                    game_session_id = _parse_int(payload.get("sessionId"))

                    if outfile is None:
                        open_output(requested_ext)
                    continue

            # Binary data: append to local file
            if byte_data:
                if outfile is None:
                    container_ext = open_output(container_ext)
                outfile.write(byte_data)
                bytes_written += len(byte_data)

    except WebSocketDisconnect:
        # Client closed the connection unexpectedly; we still try to clean up.
        pass
    finally:
        if outfile:
            outfile.close()

        if bytes_written > 0 and filepath and filename:
            # We have a local container file with at least some bytes.
            final_path = filepath
            final_mime = mime_type

            if stream_kind == "audio":
                # Audio-only: normalize to MP3 if ffmpeg is available.
                converted_audio = convert_to_mp3(filepath)
                if converted_audio and converted_audio.exists():
                    final_path = converted_audio
                    filename = converted_audio.name
                    final_mime = "audio/mpeg"
            else:
                # Video: normalize to MP4 if possible.
                should_convert = filepath.suffix.lower() != ".mp4"
                if should_convert:
                    converted = convert_to_mp4(filepath)
                    if converted and converted.exists():
                        final_path = converted
                        filename = converted.name
                        final_mime = "video/mp4"

            # At this point final_path lives under MEDIA_ROOT/recordings and we
            # KEEP IT on disk for playback. We still upload a copy to Drive.

            # Resolve org/team/session context (optional)
            context_error: Optional[HTTPException] = None
            context_ids: Dict[str, Optional[int]] = {}
            try:
                context_ids = resolve_media_context(
                    db,
                    organization_id=organization_id,
                    home_team_id=home_team_id,
                    away_team_id=away_team_id,
                    session_id=game_session_id,
                )
                if context_ids.get("organization_id") is None and current_user.organization_id:
                    context_ids["organization_id"] = current_user.organization_id
                if current_user.organization_id and context_ids.get("organization_id") != current_user.organization_id:
                    raise HTTPException(status_code=403, detail="Organization mismatch")
            except HTTPException as exc:
                context_error = exc

            if context_error:
                try:
                    await websocket.send_text(json.dumps({"event": "error", "detail": context_error.detail}))
                except Exception:
                    pass
                try:
                    final_path.unlink()
                except FileNotFoundError:
                    pass
                db.close()
                await websocket.close(code=1008)
                return

            if drive_service is not None:
                try:
                    drive_meta = upload_file(
                        drive_service,
                        final_path,
                        filename=filename,
                        mime_type=final_mime,
                        folder_id=config.DRIVE_FOLDER_ID,
                    )
                except Exception:
                    # If Drive upload fails, we still keep the local file + DB row.
                    drive_meta = None

            # Store a relative filepath under MEDIA_ROOT so /api/media can
            # build /media/<relative> URLs.
            relative_path = f"recordings/{filename}"
# ____-____ here starts the change ____________________________________________________________
            record = MediaFile(
                filename=drive_meta.get("name", filename) if drive_meta else filename,
                filepath=relative_path,
                media_type="record",
                mime_type=drive_meta.get("mimeType") if drive_meta else final_mime,
                session_context=session_context,
                recording_mode=recording_mode or stream_kind,
                organization_id=context_ids.get("organization_id"),
                home_team_id=context_ids.get("home_team_id"),
                away_team_id=context_ids.get("away_team_id"),
                session_id=context_ids.get("session_id"),
                uploaded_by_user_id=current_user.id,
            )
            db.add(record)
            db.commit()
            db.refresh(record)

            # Build same-origin playback URL for frontend (Learn + Library).
            playback_url = f"/media/{relative_path}"

            # Best-effort notify the AI server that this recording is ready
            # for denoising + transcription.
            try:
                notify_ai_server_of_media(
                    media=record,
                    drive_file_id=drive_meta.get("id") if drive_meta else None,
                    playback_url=playback_url,
                )
            except Exception:
                # Ignore failures so recording flow is not disrupted.
                pass

            # Send a final "saved" event back to the client with MediaFile info.
            try:
                payload = {
                    "event": "saved",
                    "id": record.id,
                    "filename": record.filename,
                    "filepath": record.filepath,
                    "media_type": record.media_type,
                    "mime_type": record.mime_type,
                    "created_at": record.created_at.isoformat(),
                    "url": playback_url,
                    "organization_id": record.organization_id,
                    "home_team_id": record.home_team_id,
                    "away_team_id": record.away_team_id,
                    "session_id": record.session_id,
                    "uploaded_by_user_id": record.uploaded_by_user_id,
                }
                await websocket.send_text(json.dumps(payload))
                await websocket.close()
            except Exception:
                # If the client disconnected before we could send "saved",
                # ignore the error; recording is still stored locally + DB.
                pass

#-----_____________-here ends the change ____________________________________________________________

        elif filepath:
            # No useful bytes were written; remove a partial file if present.
            try:
                filepath.unlink()
            except FileNotFoundError:
                pass

        db.close()
