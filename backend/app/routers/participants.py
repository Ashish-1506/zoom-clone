from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.core.errors import DomainError
from app.db.session import get_db
from app.schemas.meeting import MeetingOut
from app.schemas.join import JoinRequest
from app.schemas.participant import (
    ParticipantHandUpdate,
    ParticipantMediaUpdate,
    ParticipantOut,
    ParticipantReactionCreate,
)
from app.services.participant_service import (
    end_meeting,
    join_meeting,
    leave_meeting,
    list_active_participants,
    mute_all,
    remove_participant,
    set_hand_raised,
    set_participant_reaction,
    toggle_own_media,
    toggle_participant_media,
)

router = APIRouter(prefix="/api/meetings/{code}", tags=["participants"])


def _participant_id(value: int | None) -> int:
    if value is None:
        raise DomainError("X-Participant-Id header is required.", 422)
    return value


@router.post("/join", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
def join(
    code: str,
    data: JoinRequest,
    x_user_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    return ParticipantOut.model_validate(
        join_meeting(db, code, data.display_name, data.passcode, x_user_id)
    )


@router.post("/leave", response_model=ParticipantOut)
def leave(
    code: str,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    return ParticipantOut.model_validate(
        leave_meeting(db, code, _participant_id(x_participant_id))
    )


@router.post("/end", response_model=MeetingOut)
def end(
    code: str,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> MeetingOut:
    meeting = end_meeting(db, code, _participant_id(x_participant_id))
    return MeetingOut.from_meeting(meeting)


@router.get("/participants", response_model=list[ParticipantOut])
def participants(code: str, db: Session = Depends(get_db)) -> list[ParticipantOut]:
    return [
        ParticipantOut.model_validate(participant)
        for participant in list_active_participants(db, code)
    ]


@router.post("/mute-all", response_model=list[ParticipantOut])
def mute_everyone(
    code: str,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> list[ParticipantOut]:
    return [
        ParticipantOut.model_validate(participant)
        for participant in mute_all(db, code, _participant_id(x_participant_id))
    ]


@router.delete("/participants/{participant_id}", response_model=ParticipantOut)
def remove(
    code: str,
    participant_id: int,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    return ParticipantOut.model_validate(
        remove_participant(
            db,
            code,
            _participant_id(x_participant_id),
            participant_id,
        )
    )


@router.patch("/participants/{participant_id}/media", response_model=ParticipantOut)
def media(
    code: str,
    participant_id: int,
    data: ParticipantMediaUpdate,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    acting_id = _participant_id(x_participant_id)
    if acting_id != participant_id:
        return ParticipantOut.model_validate(
            toggle_participant_media(
                db,
                code,
                acting_id,
                participant_id,
                data.is_muted,
                data.is_video_on,
            )
        )
    return ParticipantOut.model_validate(
        toggle_own_media(db, participant_id, data.is_muted, data.is_video_on)
    )


@router.patch("/participants/{participant_id}/hand", response_model=ParticipantOut)
def hand(
    code: str,
    participant_id: int,
    data: ParticipantHandUpdate,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    return ParticipantOut.model_validate(
        set_hand_raised(
            db,
            code,
            _participant_id(x_participant_id),
            participant_id,
            data.raised,
        )
    )


@router.post(
    "/participants/{participant_id}/reaction",
    response_model=ParticipantOut,
)
def reaction(
    code: str,
    participant_id: int,
    data: ParticipantReactionCreate,
    x_participant_id: int | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ParticipantOut:
    return ParticipantOut.model_validate(
        set_participant_reaction(
            db,
            code,
            _participant_id(x_participant_id),
            participant_id,
            data.emoji,
        )
    )
