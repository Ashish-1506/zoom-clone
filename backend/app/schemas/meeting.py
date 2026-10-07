from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import (
    DEFAULT_MEETING_DURATION_MINUTES,
    MAX_MEETING_DESCRIPTION_LENGTH,
    MAX_MEETING_DURATION_MINUTES,
    MAX_MEETING_TITLE_LENGTH,
    MAX_MEETING_TIMEZONE_LENGTH,
    MIN_MEETING_DURATION_MINUTES,
)
from app.models.meeting import MeetingStatus, MeetingType
from app.schemas.user import UserOut
from app.utils.ids import format_meeting_code


def _require_future(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("start_time must include a timezone.")
    if value <= datetime.now(timezone.utc):
        raise ValueError("start_time must be in the future.")
    return value


class MeetingCreateInstant(BaseModel):
    """Input for creating an immediate meeting."""

    title: str | None = Field(default=None, max_length=MAX_MEETING_TITLE_LENGTH)
    use_personal_id: bool = False

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class MeetingCreateScheduled(BaseModel):
    """Input for creating a future meeting."""

    title: str = Field(min_length=1, max_length=MAX_MEETING_TITLE_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_MEETING_DESCRIPTION_LENGTH)
    start_time: datetime
    duration_minutes: int = Field(
        default=DEFAULT_MEETING_DURATION_MINUTES,
        ge=MIN_MEETING_DURATION_MINUTES,
        le=MAX_MEETING_DURATION_MINUTES,
    )
    timezone: str = Field(min_length=1, max_length=MAX_MEETING_TIMEZONE_LENGTH)

    _validate_start_time = field_validator("start_time")(_require_future)

    @field_validator("title", "description", "timezone")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("title")
    @classmethod
    def require_title(cls, value: str) -> str:
        if not value:
            raise ValueError("title must not be blank.")
        return value


class MeetingUpdate(BaseModel):
    """Optional changes to mutable meeting fields."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=MAX_MEETING_TITLE_LENGTH,
    )
    description: str | None = Field(default=None, max_length=MAX_MEETING_DESCRIPTION_LENGTH)
    start_time: datetime | None = None
    duration_minutes: int | None = Field(
        default=None,
        ge=MIN_MEETING_DURATION_MINUTES,
        le=MAX_MEETING_DURATION_MINUTES,
    )
    timezone: str | None = Field(
        default=None,
        min_length=1,
        max_length=MAX_MEETING_TIMEZONE_LENGTH,
    )
    status: MeetingStatus | None = None

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, value: datetime | None) -> datetime | None:
        return _require_future(value) if value is not None else None

    @field_validator("title", "description", "timezone")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("title")
    @classmethod
    def require_title(cls, value: str | None) -> str | None:
        if value is not None and not value:
            raise ValueError("title must not be blank.")
        return value


class MeetingOut(BaseModel):
    """Meeting details plus presentation and relationship summaries."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_code: str
    title: str
    description: str | None
    host_id: int
    meeting_type: MeetingType
    status: MeetingStatus
    start_time: datetime | None
    duration_minutes: int
    timezone: str
    passcode: str
    invite_link: str
    is_locked: bool
    chat_enabled: bool
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    formatted_meeting_code: str
    host: UserOut
    participant_count: int

    @classmethod
    def from_meeting(cls, meeting: object, participant_count: int | None = None) -> "MeetingOut":
        """Build the response while deriving values absent from the table."""
        count = (
            participant_count
            if participant_count is not None
            else len(getattr(meeting, "participants"))
        )
        return cls.model_validate(
            {
                **{
                    field: getattr(meeting, field)
                    for field in (
                        "id",
                        "meeting_code",
                        "title",
                        "description",
                        "host_id",
                        "meeting_type",
                        "status",
                        "start_time",
                        "duration_minutes",
                        "timezone",
                        "passcode",
                        "invite_link",
                        "is_locked",
                        "chat_enabled",
                        "started_at",
                        "ended_at",
                        "created_at",
                        "host",
                    )
                },
                "formatted_meeting_code": format_meeting_code(meeting.meeting_code),
                "participant_count": count,
            }
        )


class MeetingValidateOut(BaseModel):
    """Public result of checking whether a meeting code exists."""

    exists: bool
    status: MeetingStatus | None = None
    title: str | None = None
    host_name: str | None = None
    requires_passcode: bool = False


class MeetingSecurityUpdate(BaseModel):
    """Host-controlled meeting entry and chat settings."""

    is_locked: bool
    chat_enabled: bool
