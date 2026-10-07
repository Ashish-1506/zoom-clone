from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import MAX_CHAT_MESSAGE_LENGTH
from app.core.errors import DomainError
from app.models.chat_message import ChatMessage
from app.models.participant import Participant
from app.services.meeting_service import get_meeting_or_404
from app.utils.ids import normalize_meeting_input
from app.utils.time import utcnow


def add_chat_message(
    db: Session,
    code: str,
    participant_id: int,
    content: str,
) -> ChatMessage:
    """Persist a message from an active participant in the meeting."""
    normalized = normalize_meeting_input(code)
    if normalized is None:
        raise DomainError("Invalid meeting code or invite link.", 422)
    meeting = get_meeting_or_404(db, normalized)
    if not meeting.chat_enabled:
        raise DomainError("Chat is disabled by the meeting host.", 403)
    participant = db.get(Participant, participant_id)
    if participant is None or participant.meeting_id != meeting.id:
        raise DomainError("Participant does not belong to this meeting.", 403)
    if participant.left_at is not None or participant.is_removed:
        raise DomainError("Inactive participants cannot send messages.", 409)
    content = content.strip()
    if not content or len(content) > MAX_CHAT_MESSAGE_LENGTH:
        raise DomainError(
            f"Message must contain 1 to {MAX_CHAT_MESSAGE_LENGTH} characters.",
            422,
        )

    message = ChatMessage(
        meeting_id=meeting.id,
        participant_id=participant.id,
        content=content,
        message_type="user",
        sent_at=utcnow(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def create_system_message(
    meeting_id: int,
    participant_id: int,
    content: str,
) -> ChatMessage:
    """Create a system event row to be committed with its participant change."""
    return ChatMessage(
        meeting_id=meeting_id,
        participant_id=participant_id,
        content=content,
        message_type="system",
        sent_at=utcnow(),
    )


def list_chat_messages(
    db: Session,
    code: str,
    after_id: int | None = None,
) -> list[ChatMessage]:
    """List meeting messages in ascending insertion order."""
    normalized = normalize_meeting_input(code)
    if normalized is None:
        raise DomainError("Invalid meeting code or invite link.", 422)
    meeting = get_meeting_or_404(db, normalized)
    query = (
        select(ChatMessage)
        .options(joinedload(ChatMessage.participant))
        .where(ChatMessage.meeting_id == meeting.id)
    )
    if after_id is not None:
        query = query.where(ChatMessage.id > after_id)
    return list(db.scalars(query.order_by(ChatMessage.id.asc())).all())
