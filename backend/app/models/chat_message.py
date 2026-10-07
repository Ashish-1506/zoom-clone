from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.time import utcnow

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.participant import Participant


class ChatMessage(Base):
    """A text message sent by a participant during a meeting.

    The meeting relationship groups messages by room and participant identifies
    the sender whose presence record produced the message.
    """

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"),
        index=True,
    )
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id"),
    )
    content: Mapped[str] = mapped_column(Text)
    message_type: Mapped[str] = mapped_column(String(16), default="user")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    meeting: Mapped["Meeting"] = relationship(back_populates="chat_messages")
    participant: Mapped["Participant"] = relationship(back_populates="chat_messages")

    @property
    def type(self) -> str:
        """Expose the API field name without shadowing Python's built-in type."""
        return self.message_type

    @property
    def sender_name(self) -> str:
        """Resolve a message sender's display name for chat clients."""
        return self.participant.display_name
