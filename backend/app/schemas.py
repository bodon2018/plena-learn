# app/schemas.py
from datetime import datetime
from typing import Literal, Optional, List

from pydantic import BaseModel, ConfigDict, Field


class MediaFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    filepath: str
    media_type: str
    mime_type: Optional[str] = None
    created_at: datetime
    url: Optional[str] = None

    # NEW: optional context + mode
    session_context: Optional[str] = None  # "practice" | "game" | None
    recording_mode: Optional[str] = None   # "audio" | "video" | None
    # NEW: org/team/session context
    organization_id: Optional[int] = None
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None
    session_id: Optional[int] = None
    uploaded_by_user_id: Optional[int] = None


# NEW: annotation schemas -----------------------------------------------------


class AnnotationBase(BaseModel):
    """
    Common fields for an annotation.

    Frontend currently thinks in seconds; at the API layer we can convert
    seconds -> milliseconds into `timestamp_ms` so it stays integer here.
    """

    # "bookmark" | "note"
    kind: Literal["bookmark", "note"]

    # Playback position in milliseconds from the start of the media
    timestamp_ms: int = Field(ge=0)

    # Optional note text; bookmarks can leave this empty
    text: Optional[str] = None


class AnnotationCreate(AnnotationBase):
    """
    Payload used when creating a new annotation for a media file.
    For now it's identical to AnnotationBase; `media_file_id` comes
    from the URL path parameter.
    """

    user_id: Optional[int] = None


class AnnotationRead(AnnotationBase):
    """
    Representation returned to clients when reading annotations.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    media_file_id: int
    created_at: datetime
    user_id: Optional[int] = None


# NEW: org/team/session schemas ----------------------------------------------


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sport: Optional[str] = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: Optional[str] = None
    role: str
    organization_id: Optional[int] = None
    organization: Optional[OrganizationRead] = None


class InviteVerifyRequest(BaseModel):
    code: str


class InviteVerifyResponse(BaseModel):
    role: str
    email: Optional[str] = None
    organization_id: Optional[int] = None
    organization: Optional[OrganizationRead] = None


class RegisterRequest(BaseModel):
    code: str
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PlayerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    position: Optional[str] = None
    number: Optional[str] = None


class CoachRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: Optional[str] = None


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    organization_id: Optional[int] = None
    organization: Optional[OrganizationRead] = None
    players: List[PlayerRead] = []
    coaches: List[CoachRead] = []


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Optional[str] = None
    session_type: Optional[str] = None
    start_at: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    organization_id: Optional[int] = None
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None
    organization: Optional[OrganizationRead] = None
    home_team: Optional[TeamRead] = None
    away_team: Optional[TeamRead] = None
