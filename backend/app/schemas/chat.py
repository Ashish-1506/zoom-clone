from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import MAX_CHAT_MESSAGE_LENGTH


class ChatMessageCreate(BaseModel):
    """Input for sending a meeting chat message."""

    content: str = Field(min_length=1, max_length=MAX_CHAT_MESSAGE_LENGTH)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("content must not be blank.")
        return value


class ChatMessageOut(BaseModel):
    """A persisted chat message returned to meeting clients."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    participant_id: int
    sender_name: str
    content: str
    type: Literal["user", "system"]
    sent_at: datetime
