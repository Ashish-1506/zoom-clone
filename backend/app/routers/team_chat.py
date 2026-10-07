from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.team_chat import TeamChannel, TeamMessage
from app.models.user import User
from app.schemas.team_chat import (
    ChatUserOut,
    DirectMessageCreate,
    TeamChannelCreate,
    TeamChannelOut,
    TeamMessageCreate,
    TeamMessageOut,
    TeamMessageUpdate,
)
from app.services.team_chat_service import (
    TeamChatError,
    create_channel,
    create_message,
    delete_message,
    get_or_create_direct_channel,
    list_channels,
    list_messages,
    update_message,
)

router = APIRouter(prefix="/api/chat", tags=["team chat"])


def _channel_out(channel: TeamChannel) -> TeamChannelOut:
    members = sorted((membership.user for membership in channel.memberships), key=lambda user: user.full_name)
    return TeamChannelOut(
        id=channel.id,
        name=channel.name,
        description=channel.description,
        is_private=channel.is_private,
        is_direct=channel.is_direct,
        created_by=channel.created_by,
        member_count=len(members),
        members=[ChatUserOut.model_validate(member) for member in members],
    )


def _message_out(message: TeamMessage) -> TeamMessageOut:
    return TeamMessageOut(
        id=message.id,
        channel_id=message.channel_id,
        sender_id=message.sender_id,
        sender=ChatUserOut.model_validate(message.sender),
        content=message.content,
        created_at=message.created_at,
        edited_at=message.edited_at,
        reply_to_id=message.reply_to_id,
    )


def _raise_chat_error(exc: TeamChatError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/channels", response_model=list[TeamChannelOut])
def channels(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[TeamChannelOut]:
    return [_channel_out(channel) for channel in list_channels(db, user.id)]


@router.post("/channels", response_model=TeamChannelOut, status_code=status.HTTP_201_CREATED)
def create(
    data: TeamChannelCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> TeamChannelOut:
    try:
        return _channel_out(create_channel(db, user, data.name, data.description, data.is_private))
    except TeamChatError as exc:
        _raise_chat_error(exc)


@router.get("/channels/{channel_id}/messages", response_model=list[TeamMessageOut])
def messages(
    channel_id: int,
    after_id: int | None = Query(default=None, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TeamMessageOut]:
    try:
        return [_message_out(message) for message in list_messages(db, channel_id, user.id, after_id)]
    except TeamChatError as exc:
        _raise_chat_error(exc)


@router.post("/channels/{channel_id}/messages", response_model=TeamMessageOut, status_code=status.HTTP_201_CREATED)
def send(
    channel_id: int,
    data: TeamMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamMessageOut:
    try:
        return _message_out(create_message(db, channel_id, user, data.content, data.reply_to_id))
    except TeamChatError as exc:
        _raise_chat_error(exc)


@router.patch("/messages/{message_id}", response_model=TeamMessageOut)
def edit(
    message_id: int,
    data: TeamMessageUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamMessageOut:
    try:
        return _message_out(update_message(db, message_id, user, data.content))
    except TeamChatError as exc:
        _raise_chat_error(exc)


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(
    message_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Response:
    try:
        delete_message(db, message_id, user)
    except TeamChatError as exc:
        _raise_chat_error(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/dm", response_model=TeamChannelOut)
def direct_message(
    data: DirectMessageCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> TeamChannelOut:
    try:
        return _channel_out(get_or_create_direct_channel(db, user, data.user_id))
    except TeamChatError as exc:
        _raise_chat_error(exc)


