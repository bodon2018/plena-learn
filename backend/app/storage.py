import io
import os
import tempfile
from pathlib import Path
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

GOOGLE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def get_drive_service():
    """
    Build a Drive service using OAuth client credentials + user token.

    Env vars:
    - GOOGLE_DRIVE_CREDENTIALS: path to OAuth client secrets (credentials.json). Fallback to GOOGLE_APPLICATION_CREDENTIALS.
    - GOOGLE_DRIVE_TOKEN: path to user token file (default: token.json beside credentials).
    This matches the Drive Python quickstart flow.
    """
    creds_path = os.getenv("GOOGLE_DRIVE_CREDENTIALS") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        raise RuntimeError("Set GOOGLE_DRIVE_CREDENTIALS (OAuth client secrets file)")

    creds_path = Path(creds_path)
    token_path = Path(os.getenv("GOOGLE_DRIVE_TOKEN") or creds_path.with_name("token.json"))

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), GOOGLE_SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), GOOGLE_SCOPES)
            creds = flow.run_local_server(port=0)
        # Save token for next runs
        token_path.write_text(creds.to_json())

    return build("drive", "v3", credentials=creds, cache_discovery=False)


def upload_bytes(
    service,
    data: bytes,
    filename: str,
    mime_type: Optional[str] = None,
    folder_id: Optional[str] = None,
):
    """Upload bytes to Drive and return file metadata."""
    media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type or "application/octet-stream", resumable=True)
    body = {"name": filename}
    if folder_id:
        body["parents"] = [folder_id]
    return (
        service.files()
        .create(
            body=body,
            media_body=media,
            fields="id,name,webViewLink,webContentLink,mimeType,driveId,parents",
            supportsAllDrives=True,
        )
        .execute()
    )


def upload_file(
    service,
    file_path: Path,
    filename: Optional[str] = None,
    mime_type: Optional[str] = None,
    folder_id: Optional[str] = None,
):
    """Upload a file from disk to Drive."""
    filename = filename or file_path.name
    media = MediaIoBaseUpload(file_path.open("rb"), mimetype=mime_type, resumable=True)
    body = {"name": filename}
    if folder_id:
        body["parents"] = [folder_id]
    return (
        service.files()
        .create(
            body=body,
            media_body=media,
            fields="id,name,webViewLink,webContentLink,mimeType,driveId,parents",
            supportsAllDrives=True,
        )
        .execute()
    )


def temp_file(suffix: str = "") -> tempfile.NamedTemporaryFile:
    return tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
