from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from app.core.errors import DomainError
from app.db.session import get_db
from app.schemas.chat import ChatMessageCreate, ChatMessageOut
from app.services.chat_service import add_chat_message, list_chat_messages

router = APIRouter(prefix="/api/meetings/{code}", tags=["chat"])


def _participant_id(value: int | None) -> int:
    if value is None:
        raise DomainError("X-Participant-Id header is required.", 422)
    return value


@router.get("/chat", response_model=list[ChatMessageOut])
def get_chat(
    code: str,
    after_id: int | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
) -> list[ChatMessageOut]:
    return [
        ChatMessageOut.model_validate(message)
        for message in list_chat_messages(db, code, after_id)
    ]


@router.post("/chat", response_model=ChatMessageOut, status_code=status.HTTP_201_CREATED)
def send_chat(
    code: str,
    data: ChatMessageCreate,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ChatMessageOut:
    return ChatMessageOut.model_validate(
        add_chat_message(
            db,
            code,
            _participant_id(x_participant_id),
            data.content,
        )
    )
