from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.core.errors import DomainError
from app.services.chat_service import create_system_message
from app.models.meeting import Meeting, MeetingStatus
from app.models.participant import Participant, ParticipantRole
from app.services.meeting_service import get_meeting_or_404
from app.utils.ids import normalize_meeting_input
from app.utils.time import utcnow


def _meeting(db: Session, code: str) -> Meeting:
    normalized = normalize_meeting_input(code)
    if normalized is None:
        raise DomainError("Invalid meeting code or invite link.", 422)
    return get_meeting_or_404(db, normalized)


def _participant(db: Session, participant_id: int) -> Participant:
    participant = db.get(Participant, participant_id)
    if participant is None:
        raise DomainError("Participant was not found.", 404)
    return participant


def _host_participant(db: Session, meeting: Meeting, participant_id: int) -> Participant:
    participant = _participant(db, participant_id)
    if participant.meeting_id != meeting.id or participant.role is not ParticipantRole.HOST:
        raise DomainError("Only the meeting host can perform this action.", 403)
    return participant


def update_meeting_security(
    db: Session,
    code: str,
    host_participant_id: int,
    *,
    is_locked: bool,
    chat_enabled: bool,
) -> Meeting:
    """Persist host-controlled settings used by joining and meeting chat."""
    meeting = _meeting(db, code)
    _host_participant(db, meeting, host_participant_id)
    meeting.is_locked = is_locked
    meeting.chat_enabled = chat_enabled
    db.commit()
    db.refresh(meeting)
    return meeting


def join_meeting(
    db: Session,
    code: str,
    display_name: str,
    passcode: str | None,
    user_id: int | None = None,
) -> Participant:
    """Join an active meeting, transitioning scheduled meetings to live."""
    meeting = _meeting(db, code)
    if meeting.status in {MeetingStatus.ENDED, MeetingStatus.CANCELLED}:
        raise DomainError("This meeting is no longer available.", 409)
    if meeting.is_locked:
        raise DomainError("Meeting is locked", 409)
    if meeting.passcode and passcode != meeting.passcode:
        raise DomainError("The meeting passcode is incorrect.", 403)

    if user_id is not None:
        existing = db.scalar(
            select(Participant).where(
                Participant.meeting_id == meeting.id,
                Participant.user_id == user_id,
                Participant.left_at.is_(None),
                Participant.is_removed.is_(False),
            )
        )
        if existing is not None:
            return existing

    if meeting.status is MeetingStatus.SCHEDULED:
        meeting.status = MeetingStatus.LIVE
        meeting.started_at = utcnow()

    role = ParticipantRole.HOST if user_id == meeting.host_id else ParticipantRole.PARTICIPANT
    participant = Participant(
        meeting_id=meeting.id,
        user_id=user_id,
        display_name=display_name,
        role=role,
    )
    db.add(participant)
    db.flush()
    db.add(
        create_system_message(
            meeting.id,
            participant.id,
            f"{participant.display_name} joined the meeting",
        )
    )
    db.commit()
    db.refresh(participant)
    return participant


def leave_meeting(db: Session, code: str, participant_id: int) -> Participant:
    """Mark a participant as having left the specified meeting."""
    meeting = _meeting(db, code)
    participant = _participant(db, participant_id)
    if participant.meeting_id != meeting.id:
        raise DomainError("Participant does not belong to this meeting.", 403)
    if participant.left_at is None:
        participant.left_at = utcnow()
        db.add(
            create_system_message(
                meeting.id,
                participant.id,
                f"{participant.display_name} left the meeting",
            )
        )
        db.commit()
        db.refresh(participant)
    return participant


def end_meeting(db: Session, code: str, host_participant_id: int) -> Meeting:
    """End a meeting and close every active participant session."""
    meeting = _meeting(db, code)
    _host_participant(db, meeting, host_participant_id)
    if meeting.status in {MeetingStatus.ENDED, MeetingStatus.CANCELLED}:
        raise DomainError("This meeting has already ended.", 409)

    now = utcnow()
    meeting.status = MeetingStatus.ENDED
    meeting.ended_at = now
    for participant in meeting.participants:
        if participant.left_at is None:
            participant.left_at = now
    db.commit()
    db.refresh(meeting)
    return meeting


def list_active_participants(db: Session, code: str) -> list[Participant]:
    """Return active participants with the host first."""
    meeting = _meeting(db, code)
    return list(
        db.scalars(
            select(Participant)
            .where(
                Participant.meeting_id == meeting.id,
                Participant.left_at.is_(None),
                Participant.is_removed.is_(False),
            )
            .order_by(
                case((Participant.role == ParticipantRole.HOST, 0), else_=1),
                Participant.joined_at,
            )
        ).all()
    )


def mute_all(db: Session, code: str, host_participant_id: int) -> list[Participant]:
    """Mute every active non-host participant."""
    meeting = _meeting(db, code)
    _host_participant(db, meeting, host_participant_id)
    participants = list_active_participants(db, code)
    for participant in participants:
        if participant.role is not ParticipantRole.HOST:
            participant.is_muted = True
    db.commit()
    return participants


def remove_participant(
    db: Session,
    code: str,
    host_participant_id: int,
    target_participant_id: int,
) -> Participant:
    """Remove an active participant at the host's request."""
    meeting = _meeting(db, code)
    host = _host_participant(db, meeting, host_participant_id)
    target = _participant(db, target_participant_id)
    if target.id == host.id:
        raise DomainError("A host cannot remove themselves.", 409)
    if target.meeting_id != meeting.id:
        raise DomainError("Participant does not belong to this meeting.", 403)

    target.is_removed = True
    target.left_at = target.left_at or utcnow()
    db.commit()
    db.refresh(target)
    return target


def toggle_own_media(
    db: Session,
    participant_id: int,
    is_muted: bool,
    is_video_on: bool,
) -> Participant:
    """Update the caller's own mute and camera state."""
    participant = _participant(db, participant_id)
    if participant.left_at is not None or participant.is_removed:
        raise DomainError("Inactive participants cannot change media state.", 409)
    participant.is_muted = is_muted
    participant.is_video_on = is_video_on
    db.commit()
    db.refresh(participant)
    return participant


def toggle_participant_media(
    db: Session,
    code: str,
    host_participant_id: int,
    target_participant_id: int,
    is_muted: bool,
    is_video_on: bool,
) -> Participant:
    """Allow the meeting host to change another active participant's media state."""
    meeting = _meeting(db, code)
    _host_participant(db, meeting, host_participant_id)
    participant = _participant(db, target_participant_id)
    if participant.meeting_id != meeting.id:
        raise DomainError("Participant does not belong to this meeting.", 403)
    if participant.left_at is not None or participant.is_removed:
        raise DomainError("Inactive participants cannot change media state.", 409)
    participant.is_muted = is_muted
    participant.is_video_on = is_video_on
    db.commit()
    db.refresh(participant)
    return participant


def set_hand_raised(
    db: Session,
    code: str,
    acting_participant_id: int,
    target_participant_id: int,
    raised: bool,
) -> Participant:
    """Update a participant's hand, allowing hosts to lower another person's hand."""
    meeting = _meeting(db, code)
    actor = _participant(db, acting_participant_id)
    target = _participant(db, target_participant_id)
    if actor.meeting_id != meeting.id or target.meeting_id != meeting.id:
        raise DomainError("Participant does not belong to this meeting.", 403)
    if actor.left_at is not None or actor.is_removed:
        raise DomainError("Inactive participants cannot change hand state.", 409)
    if target.left_at is not None or target.is_removed:
        raise DomainError("Inactive participants cannot change hand state.", 409)
    if actor.id != target.id:
        if actor.role is not ParticipantRole.HOST or raised:
            raise DomainError("Only the host can lower another participant's hand.", 403)
    if target.hand_raised != raised:
        target.hand_raised = raised
        target.hand_raised_at = utcnow() if raised else None
        db.commit()
        db.refresh(target)
    return target


def set_participant_reaction(
    db: Session,
    code: str,
    acting_participant_id: int,
    target_participant_id: int,
    emoji: str,
) -> Participant:
    """Store the caller's latest reaction for room clients to observe by timestamp."""
    meeting = _meeting(db, code)
    actor = _participant(db, acting_participant_id)
    target = _participant(db, target_participant_id)
    if actor.id != target.id or actor.meeting_id != meeting.id:
        raise DomainError("Participants can only send reactions for themselves.", 403)
    if target.left_at is not None or target.is_removed:
        raise DomainError("Inactive participants cannot react.", 409)
    target.last_reaction = emoji
    target.last_reaction_at = utcnow()
    db.commit()
    db.refresh(target)
    return target
