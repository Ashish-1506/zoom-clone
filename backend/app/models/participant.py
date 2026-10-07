from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.time import utcnow

if TYPE_CHECKING:
    from app.models.chat_message import ChatMessage
    from app.models.meeting import Meeting
    from app.models.user import User


class ParticipantRole(StrEnum):
    HOST = "host"
    COHOST = "cohost"
    PARTICIPANT = "participant"


class Participant(Base):
    """A user's or guest's presence and controls within a meeting.

    The meeting relationship owns this record for cascading deletion, while
    user and chat_messages connect it to optional identity and sent messages.
    """

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )
    display_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[ParticipantRole] = mapped_column(
        Enum(
            ParticipantRole,
            values_callable=lambda values: [item.value for item in values],
        ),
        default=ParticipantRole.PARTICIPANT,
    )
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_video_on: Mapped[bool] = mapped_column(Boolean, default=True)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)
    hand_raised: Mapped[bool] = mapped_column(Boolean, default=False)
    hand_raised_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_reaction: Mapped[str | None] = mapped_column(String(16), nullable=True)
    last_reaction_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    meeting: Mapped["Meeting"] = relationship(back_populates="participants")
    user: Mapped["User | None"] = relationship(back_populates="participants")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="participant")
