import os
from pathlib import Path

# Basic paths and settings for the demo app
BASE_DIR = Path(__file__).resolve().parent.parent

# Persistent data directories -------------------------------------------------
MEDIA_ROOT = BASE_DIR / "media"
UPLOAD_DIR = MEDIA_ROOT / "uploads"
RECORDINGS_DIR = MEDIA_ROOT / "recordings"

# NEW: dedicated folder for CSV data sources used by the Admin UI
DATA_SOURCES_DIR = MEDIA_ROOT / "data_sources"

# NEW: lightweight persistence for mock AI workflow state (metrics/reports/etc.)
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# NEW: reference materials (PDFs) storage
REFERENCE_DOCS_DIR = MEDIA_ROOT / "reference_materials"

DATABASE_URL = "sqlite:///./app.db"

# Optional Google Drive folder id to upload into
DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID")

# Toggle Drive usage. When false, the app skips auth and uploads entirely.
_drive_flag = (os.getenv("DRIVE_ENABLED") or "true").strip().lower()
DRIVE_ENABLED = _drive_flag in {"1", "true", "yes", "y", "on"}

# Optional AI server base URL (e.g. http://ai-service:8000) # double check the url is correct.
AI_SERVER_BASE_URL = os.getenv("AI_SERVER_BASE_URL")

# NEW: allow skipping login in local/dev. If enabled we auto-create/use a demo admin user.
AUTO_LOGIN_DEMO = (os.getenv("AUTO_LOGIN_DEMO") or "true").strip().lower() in {"1", "true", "yes", "y", "on"}

# Session cookie signing key (set in env for production)
SECRET_KEY = os.getenv("SECRET_KEY") or "dev-secret-change-me"

# Ensure media directories exist when the module is imported
for directory in (MEDIA_ROOT, UPLOAD_DIR, RECORDINGS_DIR, DATA_SOURCES_DIR, REFERENCE_DOCS_DIR):
    directory.mkdir(parents=True, exist_ok=True)
