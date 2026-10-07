from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.schemas.meeting import (
    MeetingCreateInstant,
    MeetingCreateScheduled,
    MeetingOut,
    MeetingSecurityUpdate,
    MeetingUpdate,
    MeetingValidateOut,
)
from app.services.meeting_service import (
    MeetingHostNotFoundError,
    MeetingNotFoundError,
    MeetingStateError,
    cancel_meeting,
    create_instant_meeting,
    create_scheduled_meeting,
    get_meeting_or_404,
    list_meetings,
    update_meeting,
    validate_meeting,
)
from app.services.participant_service import update_meeting_security
from app.models.user import User
from app.utils.ids import normalize_meeting_input

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _code_or_422(raw_code: str) -> str:
    code = normalize_meeting_input(raw_code)
    if code is None:
        raise HTTPException(status_code=422, detail="Invalid meeting code or invite link.")
    return code


def _meeting_out(meeting: object) -> MeetingOut:
    return MeetingOut.from_meeting(meeting)


@router.post("/instant", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_instant(
    data: MeetingCreateInstant,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MeetingOut:
    try:
        return _meeting_out(create_instant_meeting(db, user.id, data.title, data.use_personal_id))
    except MeetingHostNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/schedule", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_schedule(
    data: MeetingCreateScheduled,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MeetingOut:
    try:
        return _meeting_out(create_scheduled_meeting(db, user.id, data))
    except MeetingHostNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("", response_model=list[MeetingOut])
def get_meetings(
    type: str = Query(default="upcoming", pattern="^(upcoming|recent)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MeetingOut]:
    return [_meeting_out(meeting) for meeting in list_meetings(db, user.id, type)]


@router.get("/{code}", response_model=MeetingOut)
def get_meeting(code: str, db: Session = Depends(get_db)) -> MeetingOut:
    try:
        return _meeting_out(get_meeting_or_404(db, _code_or_422(code)))
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{code}/validate", response_model=MeetingValidateOut)
def validate(code: str, db: Session = Depends(get_db)) -> MeetingValidateOut:
    normalized = normalize_meeting_input(code)
    if normalized is None:
        return MeetingValidateOut(exists=False)
    meeting = validate_meeting(db, normalized)
    if meeting is None:
        return MeetingValidateOut(exists=False)
    return MeetingValidateOut(
        exists=True,
        status=meeting.status,
        title=meeting.title,
        host_name=meeting.host.full_name,
        requires_passcode=bool(meeting.passcode),
    )


@router.patch("/{code}", response_model=MeetingOut)
def update(code: str, data: MeetingUpdate, db: Session = Depends(get_db)) -> MeetingOut:
    try:
        return _meeting_out(update_meeting(db, _code_or_422(code), data))
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except MeetingStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch("/{code}/security", response_model=MeetingOut)
def update_security(
    code: str,
    data: MeetingSecurityUpdate,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> MeetingOut:
    if x_participant_id is None:
        raise HTTPException(status_code=422, detail="X-Participant-Id header is required.")
    try:
        return _meeting_out(
            update_meeting_security(
                db,
                _code_or_422(code),
                x_participant_id,
                is_locked=data.is_locked,
                chat_enabled=data.chat_enabled,
            )
        )
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{code}", response_model=MeetingOut)
def cancel(code: str, db: Session = Depends(get_db)) -> MeetingOut:
    try:
        return _meeting_out(cancel_meeting(db, _code_or_422(code)))
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except MeetingStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
