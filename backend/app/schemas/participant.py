from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models.participant import ParticipantRole


class ParticipantOut(BaseModel):
    """Participant presence and media state returned to meeting clients."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    user_id: int | None
    display_name: str
    role: ParticipantRole
    is_muted: bool
    is_video_on: bool
    is_removed: bool
    hand_raised: bool
    hand_raised_at: datetime | None
    last_reaction: str | None
    last_reaction_at: datetime | None
    joined_at: datetime
    left_at: datetime | None


class ParticipantHandUpdate(BaseModel):
    """Requested hand state for the caller or a host-controlled participant."""

    raised: bool


class ParticipantReactionCreate(BaseModel):
    """A supported reaction sent by an active meeting participant."""

    emoji: Literal["clap", "thumbs_up", "heart", "joy", "wow", "tada"]


class ParticipantMediaUpdate(BaseModel):
    """Requested mute and camera state for the current participant."""

    is_muted: bool
    is_video_on: bool
