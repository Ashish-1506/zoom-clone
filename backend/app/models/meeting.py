from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import (
    DEFAULT_MEETING_DURATION_MINUTES,
    DEFAULT_MEETING_TIMEZONE,
    MAX_MEETING_TITLE_LENGTH,
    MAX_MEETING_TIMEZONE_LENGTH,
    MEETING_CODE_LENGTH,
)
from app.db.base import Base
from app.utils.time import utcnow

if TYPE_CHECKING:
    from app.models.chat_message import ChatMessage
    from app.models.participant import Participant
    from app.models.user import User


class MeetingType(StrEnum):
    INSTANT = "instant"
    SCHEDULED = "scheduled"


class MeetingStatus(StrEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"
    CANCELLED = "cancelled"


class Meeting(Base):
    """A meeting that can be scheduled, started, ended, or cancelled.

    The host relationship identifies its owner; participants and chat_messages
    are owned child records removed when the meeting is deleted.
    """

    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_code: Mapped[str] = mapped_column(String(MEETING_CODE_LENGTH), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(MAX_MEETING_TITLE_LENGTH))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    meeting_type: Mapped[MeetingType] = mapped_column(
        Enum(MeetingType, values_callable=lambda values: [item.value for item in values]),
        default=MeetingType.SCHEDULED,
    )
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus, values_callable=lambda values: [item.value for item in values]),
        default=MeetingStatus.SCHEDULED,
    )
    start_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=DEFAULT_MEETING_DURATION_MINUTES,
    )
    timezone: Mapped[str] = mapped_column(
        String(MAX_MEETING_TIMEZONE_LENGTH),
        default=DEFAULT_MEETING_TIMEZONE,
    )
    passcode: Mapped[str] = mapped_column(String(6))
    invite_link: Mapped[str] = mapped_column(String(512))
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    chat_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    host: Mapped["User"] = relationship(back_populates="meetings")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    chat_messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
