import re
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SchedulerLinkCreate(BaseModel):
    slug: str = Field(min_length=3, max_length=100)
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    duration_minutes: int = Field(default=30, ge=15, le=240)
    available_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    start_hour: int = Field(default=9, ge=0, le=23)
    end_hour: int = Field(default=17, ge=1, le=24)
    timezone: str = Field(default="UTC", min_length=1, max_length=80)
    is_active: bool = True

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        normalized = value.strip().lower().replace(" ", "-")
        if any(not (character.isalnum() or character == "-") for character in normalized):
            raise ValueError("Slug may only contain letters, numbers, and hyphens.")
        return normalized

    @field_validator("title", "description", "timezone")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("available_days")
    @classmethod
    def validate_days(cls, value: list[int]) -> list[int]:
        if not value or any(day not in range(7) for day in value):
            raise ValueError("Choose one or more valid weekdays.")
        return sorted(set(value))

    def model_post_init(self, __context: object) -> None:
        if self.end_hour <= self.start_hour:
            raise ValueError("End hour must be after start hour.")
        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Choose a valid timezone.") from exc


class SchedulerLinkUpdate(BaseModel):
    slug: str | None = Field(default=None, min_length=3, max_length=100)
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    duration_minutes: int | None = Field(default=None, ge=15, le=240)
    available_days: list[int] | None = None
    start_hour: int | None = Field(default=None, ge=0, le=23)
    end_hour: int | None = Field(default=None, ge=1, le=24)
    timezone: str | None = Field(default=None, min_length=1, max_length=80)
    is_active: bool | None = None

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower().replace(" ", "-")
        if len(normalized) < 3 or any(
            not (character.isalnum() or character == "-")
            for character in normalized
        ):
            raise ValueError("Slug may only contain at least 3 letters, numbers, or hyphens.")
        return normalized

    @field_validator("title", "description", "timezone")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("available_days")
    @classmethod
    def validate_optional_days(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None
        if not value or any(day not in range(7) for day in value):
            raise ValueError("Choose one or more valid weekdays.")
        return sorted(set(value))

    @model_validator(mode="after")
    def validate_hours(self) -> "SchedulerLinkUpdate":
        if (
            self.start_hour is not None
            and self.end_hour is not None
            and self.end_hour <= self.start_hour
        ):
            raise ValueError("End hour must be after start hour.")
        if self.timezone is not None:
            try:
                ZoneInfo(self.timezone)
            except ZoneInfoNotFoundError as exc:
                raise ValueError("Choose a valid timezone.") from exc
        return self


class SchedulerLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    slug: str
    title: str
    description: str
    duration_minutes: int
    available_days: list[int]
    start_hour: int
    end_hour: int
    timezone: str
    is_active: bool
    created_at: datetime


class PublicSchedulerLinkOut(BaseModel):
    slug: str
    title: str
    description: str
    duration_minutes: int
    available_days: list[int]
    timezone: str


class SchedulerSlotOut(BaseModel):
    start_time: datetime
    end_time: datetime
    label: str


class BookingCreate(BaseModel):
    guest_name: str = Field(min_length=1, max_length=120)
    guest_email: str = Field(min_length=3, max_length=255)
    start_time: datetime

    @field_validator("guest_name", "guest_email")
    @classmethod
    def require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A value is required.")
        return value

    @field_validator("guest_email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    link_id: int
    guest_name: str
    guest_email: str
    start_time: datetime
    end_time: datetime
    meeting_id: int | None
    status: str
    created_at: datetime


class BookingConfirmationOut(BookingOut):
    meeting_link: str
