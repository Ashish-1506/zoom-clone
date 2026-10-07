from __future__ import annotations

from threading import Timer

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.models.team_chat import ChannelMember, TeamChannel, TeamMessage
from app.models.user import User
from app.utils.time import utcnow


class TeamChatError(Exception):
    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def _channel_options():
    return (selectinload(TeamChannel.memberships).selectinload(ChannelMember.user),)


def _get_channel(db: Session, channel_id: int) -> TeamChannel:
    channel = db.scalar(select(TeamChannel).where(TeamChannel.id == channel_id).options(*_channel_options()))
    if channel is None:
        raise TeamChatError("Conversation not found.", 404)
    return channel


def _require_member(channel: TeamChannel, user_id: int) -> None:
    if user_id not in {membership.user_id for membership in channel.memberships}:
        raise TeamChatError("You do not have access to this conversation.", 403)


def list_channels(db: Session, user_id: int) -> list[TeamChannel]:
    return list(
        db.scalars(
            select(TeamChannel)
            .join(ChannelMember)
            .where(ChannelMember.user_id == user_id)
            .options(*_channel_options())
            .order_by(TeamChannel.is_direct, TeamChannel.name)
        )
    )


def create_channel(db: Session, user: User, name: str, description: str, is_private: bool) -> TeamChannel:
    existing = db.scalar(select(TeamChannel).where(TeamChannel.name == name, TeamChannel.is_direct.is_(False)))
    if existing is not None:
        raise TeamChatError("A channel with that name already exists.", 409)
    channel = TeamChannel(name=name, description=description.strip(), is_private=is_private, created_by=user.id)
    channel.memberships.append(ChannelMember(user_id=user.id))
    db.add(channel)
    db.commit()
    return _get_channel(db, channel.id)


def get_or_create_direct_channel(db: Session, user: User, recipient_id: int) -> TeamChannel:
    if recipient_id == user.id:
        raise TeamChatError("Choose another person to start a direct message.", 422)
    recipient = db.get(User, recipient_id)
    if recipient is None:
        raise TeamChatError("User not found.", 404)
    candidates = db.scalars(
        select(TeamChannel)
        .join(ChannelMember)
        .where(TeamChannel.is_direct.is_(True), ChannelMember.user_id == user.id)
        .options(*_channel_options())
    ).all()
    for channel in candidates:
        if {member.user_id for member in channel.memberships} == {user.id, recipient_id}:
            return channel
    channel = TeamChannel(
        name="direct-message",
        description="",
        is_private=True,
        is_direct=True,
        created_by=user.id,
    )
    channel.memberships.extend([ChannelMember(user_id=user.id), ChannelMember(user_id=recipient_id)])
    db.add(channel)
    db.commit()
    return _get_channel(db, channel.id)


def list_messages(db: Session, channel_id: int, user_id: int, after_id: int | None) -> list[TeamMessage]:
    channel = _get_channel(db, channel_id)
    _require_member(channel, user_id)
    statement = (
        select(TeamMessage)
        .where(TeamMessage.channel_id == channel_id)
        .options(selectinload(TeamMessage.sender))
        .order_by(TeamMessage.created_at, TeamMessage.id)
    )
    if after_id is not None:
        statement = statement.where(TeamMessage.id > after_id)
    return list(db.scalars(statement))


def _demo_reply(session_factory: sessionmaker[Session], channel_id: int, sender_id: int) -> None:
    """Demo behavior: make DMs feel alive after the default seeded user writes."""
    try:
        with session_factory() as db:
            channel = db.get(TeamChannel, channel_id)
            if channel is None:
                return
            recipient_id = db.scalar(
                select(ChannelMember.user_id).where(
                    ChannelMember.channel_id == channel_id,
                    ChannelMember.user_id != sender_id,
                )
            )
            if recipient_id is None:
                return
            db.add(TeamMessage(
                channel_id=channel_id,
                sender_id=recipient_id,
                content="Thanks for the update! I’ll take a look and get back to you shortly.",
            ))
            db.commit()
    except Exception:
        # A delayed demo response must never affect the original message request.
        return


def create_message(
    db: Session, channel_id: int, user: User, content: str, reply_to_id: int | None
) -> TeamMessage:
    channel = _get_channel(db, channel_id)
    _require_member(channel, user.id)
    if reply_to_id is not None:
        replied_message = db.get(TeamMessage, reply_to_id)
        if replied_message is None or replied_message.channel_id != channel_id:
            raise TeamChatError("The reply target is not in this conversation.", 422)
    message = TeamMessage(
        channel_id=channel_id, sender_id=user.id, content=content, reply_to_id=reply_to_id
    )
    db.add(message)
    db.commit()
    db.refresh(message, attribute_names=["sender"])
    if channel.is_direct and user.id == 1:
        # Demo behavior: delay the seeded teammate response without delaying this API response.
        factory = sessionmaker(bind=db.get_bind(), autoflush=False, autocommit=False)
        timer = Timer(2, _demo_reply, args=(factory, channel_id, user.id))
        timer.daemon = True
        timer.start()
    return message


def update_message(db: Session, message_id: int, user: User, content: str) -> TeamMessage:
    message = db.scalar(select(TeamMessage).where(TeamMessage.id == message_id).options(selectinload(TeamMessage.sender)))
    if message is None:
        raise TeamChatError("Message not found.", 404)
    if message.sender_id != user.id:
        raise TeamChatError("Only the sender can edit this message.", 403)
    message.content = content
    message.edited_at = utcnow()
    db.commit()
    db.refresh(message)
    return message


def delete_message(db: Session, message_id: int, user: User) -> None:
    message = db.get(TeamMessage, message_id)
    if message is None:
        raise TeamChatError("Message not found.", 404)
    if message.sender_id != user.id:
        raise TeamChatError("Only the sender can delete this message.", 403)
    db.delete(message)
    db.commit()


