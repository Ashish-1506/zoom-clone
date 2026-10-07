from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ChatUserOut(BaseModel):
    id: int
    full_name: str
    email: str
    avatar_color: str

    model_config = {"from_attributes": True}


class TeamChannelOut(BaseModel):
    id: int
    name: str
    description: str
    is_private: bool
    is_direct: bool
    created_by: int
    member_count: int
    members: list[ChatUserOut]


class TeamMessageOut(BaseModel):
    id: int
    channel_id: int
    sender_id: int
    sender: ChatUserOut
    content: str
    created_at: datetime
    edited_at: datetime | None
    reply_to_id: int | None


class TeamChannelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=280)
    is_private: bool = False

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip().lower().replace(" ", "-")
        if not normalized or any(not (char.isalnum() or char in "-_") for char in normalized):
            raise ValueError("Channel names may use letters, numbers, hyphens, and underscores.")
        return normalized


class TeamMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    reply_to_id: int | None = None

    @field_validator("content")
    @classmethod
    def non_blank_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty.")
        return value


class TeamMessageUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def non_blank_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty.")
        return value


class DirectMessageCreate(BaseModel):
    user_id: int
