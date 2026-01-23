# app/models.py
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Table, func
from sqlalchemy.orm import relationship

from .database import Base


team_players = Table(
    "team_players",
    Base.metadata,
    Column("team_id", Integer, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
    Column("player_id", Integer, ForeignKey("players.id", ondelete="CASCADE"), primary_key=True),
)

team_coaches = Table(
    "team_coaches",
    Base.metadata,
    Column("team_id", Integer, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True),
    Column("coach_id", Integer, ForeignKey("coaches.id", ondelete="CASCADE"), primary_key=True),
)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    sport = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    teams = relationship("Team", back_populates="organization", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="organization")
    media_files = relationship("MediaFile", back_populates="organization")
    users = relationship("User", back_populates="organization")
    invites = relationship("InviteCode", back_populates="organization")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="teams")
    players = relationship("Player", secondary=team_players, back_populates="teams")
    coaches = relationship("Coach", secondary=team_coaches, back_populates="teams")

    home_sessions = relationship("Session", foreign_keys="Session.home_team_id", back_populates="home_team")
    away_sessions = relationship("Session", foreign_keys="Session.away_team_id", back_populates="away_team")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    position = Column(String, nullable=True)
    number = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    teams = relationship("Team", secondary=team_players, back_populates="players")


class Coach(Base):
    __tablename__ = "coaches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=True)  # e.g. head/assistant
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    teams = relationship("Team", secondary=team_coaches, back_populates="coaches")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)  # e.g. "Game vs Hawks"
    session_type = Column(String, nullable=True)  # e.g. practice/game
    start_at = Column(DateTime(timezone=True), nullable=True)
    location = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True, nullable=True)
    home_team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), index=True, nullable=True)
    away_team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="sessions")
    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_sessions")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_sessions")
    media_files = relationship("MediaFile", back_populates="session")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True, unique=True)
    role = Column(String, nullable=False, default="user")  # "admin" | "user"
    password_hash = Column(String, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="users")
    media_files = relationship("MediaFile", back_populates="uploaded_by")
    annotations = relationship("Annotation", back_populates="user")
    used_invites = relationship("InviteCode", back_populates="used_by")


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False, unique=True)
    role = Column(String, nullable=False)  # "admin" | "user"
    email = Column(String, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True, nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organization = relationship("Organization", back_populates="invites")
    used_by = relationship("User", back_populates="used_invites")


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # "upload" | "record"
    mime_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # NEW: optional session context, e.g. "practice" or "game"
    session_context = Column(String, nullable=True)

    # NEW: recording mode, e.g. "audio" or "video"
    recording_mode = Column(String, nullable=True)

    # NEW: optional URL to the transcript CSV stored on Google Drive.
    #      This is used internally by the storage/analysis pipeline and
    #      is not exposed to the frontend.
    transcription_url = Column(String, nullable=True)

    # NEW: org/team/session context
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True, nullable=True)
    home_team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), index=True, nullable=True)
    away_team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), index=True, nullable=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="SET NULL"), index=True, nullable=True)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)

    organization = relationship("Organization", back_populates="media_files")
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
    session = relationship("Session", back_populates="media_files")
    uploaded_by = relationship("User", back_populates="media_files")

    # NEW: back-reference to annotations linked to this media file.
    annotations = relationship(
        "Annotation",
        back_populates="media_file",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Annotation(Base):
    """
    Stores a bookmark or note tied to a specific media file.

    - kind: "bookmark" or "note"
    - timestamp_ms: playback position in milliseconds from the start
    - text: optional note text (empty for pure bookmarks)
    """

    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)

    # Which recording this annotation belongs to
    media_file_id = Column(
        Integer,
        ForeignKey("media_files.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # "bookmark" | "note"
    kind = Column(String, nullable=False)

    # Playback position in milliseconds from start of the media
    timestamp_ms = Column(Integer, nullable=False)

    # Optional note text; bookmarks can keep this empty
    text = Column(Text, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationship back to the parent media file
    media_file = relationship("MediaFile", back_populates="annotations")
    user = relationship("User", back_populates="annotations")
