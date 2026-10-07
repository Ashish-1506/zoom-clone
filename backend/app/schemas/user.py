from datetime import datetime
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserOut(BaseModel):
    """Public user information returned by meeting APIs."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    avatar_color: str
    department: str | None
    job_title: str | None
    location: str | None
    phone: str | None
    personal_meeting_id: str
    created_at: datetime


class UserUpdate(BaseModel):
    """Editable profile attributes with bounded values suitable for display."""

    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    avatar_color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    department: str | None = Field(default=None, max_length=120)
    job_title: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)

    @field_validator("full_name", "email", "department", "job_title", "location", "phone")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("full_name")
    @classmethod
    def require_full_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Full name is required.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str:
        if value is None or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value.lower()
