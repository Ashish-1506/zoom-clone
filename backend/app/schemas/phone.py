from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CallLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    contact_name: str | None
    phone_number: str
    direction: Literal["in", "out", "missed"]
    duration_seconds: int
    created_at: datetime


class CallLogCreate(BaseModel):
    contact_name: str | None = Field(default=None, max_length=120)
    phone_number: str = Field(min_length=3, max_length=40)
    direction: Literal["in", "out", "missed"] = "out"
    duration_seconds: int = Field(ge=0, le=86400)

    @field_validator("contact_name")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("phone_number")
    @classmethod
    def trim_phone(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A phone number is required.")
        return value


class VoicemailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    caller_name: str
    phone_number: str
    duration_seconds: int
    is_listened: bool
    created_at: datetime
    transcript: str


class VoicemailUpdate(BaseModel):
    is_listened: bool


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=3, max_length=40)
    email: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("name", "phone")
    @classmethod
    def require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A value is required.")
        return value


class ContactUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=3, max_length=40)
    email: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def trim_optional_email(cls, value: str | None) -> str | None:
        return (value.strip() or None) if value is not None else None

    @field_validator("name", "phone")
    @classmethod
    def require_text_if_set(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("A value is required.")
        return value


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    phone: str
    email: str | None
    created_at: datetime
