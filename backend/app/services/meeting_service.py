from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.constants import (
    DEFAULT_MEETING_DURATION_MINUTES,
    DEFAULT_MEETING_TIMEZONE,
)
from app.core.errors import DomainError
from app.models.meeting import Meeting, MeetingStatus, MeetingType
from app.models.participant import Participant, ParticipantRole
from app.models.user import User
from app.schemas.meeting import MeetingCreateScheduled, MeetingUpdate
from app.utils.ids import (
    build_invite_link,
    generate_meeting_code,
    generate_passcode,
)
from app.utils.time import utcnow


class MeetingServiceError(DomainError):
    """Base class for expected meeting service failures."""


class MeetingNotFoundError(MeetingServiceError):
    """Raised when a meeting code does not identify a meeting."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail, 404)


class MeetingStateError(MeetingServiceError):
    """Raised when an operation is invalid for the meeting's current state."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail, 409)


class MeetingHostNotFoundError(MeetingServiceError):
    """Raised when a meeting is created for a missing host."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail, 404)


def _utc(value: datetime) -> datetime:
    """Normalize datetimes loaded from SQLite, which may lose tzinfo."""
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _get_host(db: Session, host_id: int) -> User:
    host = db.get(User, host_id)
    if host is None:
        raise MeetingHostNotFoundError(f"User {host_id} was not found.")
    return host


def _meeting_values(
    db: Session,
    host: User,
    *,
    title: str,
    meeting_type: MeetingType,
    status: MeetingStatus,
    start_time: datetime | None,
    description: str | None = None,
    duration_minutes: int = DEFAULT_MEETING_DURATION_MINUTES,
    timezone_name: str = DEFAULT_MEETING_TIMEZONE,
    meeting_code: str | None = None,
) -> Meeting:
    code = meeting_code or generate_meeting_code(db)
    passcode = generate_passcode()
    return Meeting(
        meeting_code=code,
        title=title,
        description=description,
        host_id=host.id,
        meeting_type=meeting_type,
        status=status,
        start_time=start_time,
        duration_minutes=duration_minutes,
        timezone=timezone_name,
        passcode=passcode,
        invite_link=build_invite_link(code, passcode),
        started_at=utcnow() if status is MeetingStatus.LIVE else None,
    )


def create_instant_meeting(
    db: Session,
    host_id: int,
    title: str | None = None,
    use_personal_id: bool = False,
) -> Meeting:
    """Create a live meeting and its host participant atomically."""
    host = _get_host(db, host_id)
    if use_personal_id:
        existing = db.scalar(
            select(Meeting).where(
                Meeting.meeting_code == host.personal_meeting_id,
                Meeting.host_id == host.id,
            )
        )
        if existing is not None:
            if existing.status in {MeetingStatus.ENDED, MeetingStatus.CANCELLED}:
                existing.status = MeetingStatus.LIVE
                existing.ended_at = None
                existing.started_at = utcnow()
                existing.start_time = utcnow()
            elif existing.status is MeetingStatus.SCHEDULED:
                existing.status = MeetingStatus.LIVE
                existing.started_at = utcnow()
                existing.start_time = utcnow()
            db.commit()
            db.refresh(existing)
            return existing

    meeting = _meeting_values(
        db,
        host,
        title=title or f"{host.full_name}'s Zoom Meeting",
        meeting_type=MeetingType.INSTANT,
        status=MeetingStatus.LIVE,
        start_time=utcnow(),
        meeting_code=host.personal_meeting_id if use_personal_id else None,
    )
    meeting.participants.append(
        Participant(
            user_id=host.id,
            display_name=host.full_name,
            role=ParticipantRole.HOST,
        )
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def create_scheduled_meeting(
    db: Session,
    host_id: int,
    data: MeetingCreateScheduled,
) -> Meeting:
    """Create a future meeting with its scheduled UTC start time."""
    host = _get_host(db, host_id)
    meeting = _meeting_values(
        db,
        host,
        title=data.title,
        description=data.description,
        meeting_type=MeetingType.SCHEDULED,
        status=MeetingStatus.SCHEDULED,
        start_time=data.start_time.astimezone(timezone.utc),
        duration_minutes=data.duration_minutes,
        timezone_name=data.timezone,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def list_meetings(db: Session, user_id: int, kind: str) -> list[Meeting]:
    """List a user's upcoming or recent hosted meetings."""
    if kind not in {"upcoming", "recent"}:
        raise ValueError("Meeting list type must be upcoming or recent.")

    meetings = db.scalars(
        select(Meeting)
        .options(joinedload(Meeting.host))
        .where(Meeting.host_id == user_id)
    ).unique().all()
    now = utcnow()

    if kind == "upcoming":
        upcoming = [
            meeting
            for meeting in meetings
            if meeting.status is MeetingStatus.SCHEDULED
            and meeting.start_time is not None
            and _utc(meeting.start_time)
            + timedelta(minutes=meeting.duration_minutes)
            >= now
        ]
        return sorted(upcoming, key=lambda meeting: _utc(meeting.start_time))

    recent = [
        meeting
        for meeting in meetings
        if meeting.status is MeetingStatus.ENDED
        or (
            meeting.status is MeetingStatus.SCHEDULED
            and meeting.start_time is not None
            and _utc(meeting.start_time) <= now
        )
    ]
    recent.sort(
        key=lambda meeting: _utc(meeting.started_at or meeting.start_time or meeting.created_at),
        reverse=True,
    )
    return recent[:20]


def get_meeting_or_404(db: Session, code: str) -> Meeting:
    """Load a meeting with its host and fail clearly when absent."""
    meeting = db.scalar(
        select(Meeting)
        .options(joinedload(Meeting.host))
        .where(Meeting.meeting_code == code)
    )
    if meeting is None:
        raise MeetingNotFoundError(f"Meeting {code} was not found.")
    return meeting


def validate_meeting(db: Session, code: str) -> Meeting | None:
    """Return a matching meeting without raising for an unknown code."""
    return db.scalar(
        select(Meeting)
        .options(joinedload(Meeting.host))
        .where(Meeting.meeting_code == code)
    )


def update_meeting(db: Session, code: str, data: MeetingUpdate) -> Meeting:
    """Apply allowed meeting changes and persist them."""
    meeting = get_meeting_or_404(db, code)
    if meeting.status in {MeetingStatus.ENDED, MeetingStatus.CANCELLED}:
        raise MeetingStateError("This meeting cannot be updated in its current state.")

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "start_time" and value is not None:
            value = value.astimezone(timezone.utc)
        setattr(meeting, field, value)

    db.commit()
    db.refresh(meeting)
    return meeting


def cancel_meeting(db: Session, code: str) -> Meeting:
    """Cancel a meeting unless it has already ended or been cancelled."""
    meeting = get_meeting_or_404(db, code)
    if meeting.status in {MeetingStatus.ENDED, MeetingStatus.CANCELLED}:
        raise MeetingStateError("This meeting cannot be cancelled in its current state.")
    meeting.status = MeetingStatus.CANCELLED
    db.commit()
    db.refresh(meeting)
    return meeting
