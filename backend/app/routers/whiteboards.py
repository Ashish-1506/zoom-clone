from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.whiteboard import (
    MeetingWhiteboardOut,
    MeetingWhiteboardUpdate,
    WhiteboardCreate,
    WhiteboardOut,
    WhiteboardUpdate,
)
from app.services.whiteboard_service import (
    MeetingWhiteboardAccessError,
    WhiteboardNotFoundError,
    create_whiteboard,
    delete_whiteboard,
    get_meeting_whiteboard,
    get_whiteboard,
    list_whiteboards,
    update_meeting_whiteboard,
    update_whiteboard,
)

router = APIRouter(prefix="/api/whiteboards", tags=["whiteboards"])
meeting_router = APIRouter(prefix="/api/meetings", tags=["meeting whiteboards"])


@router.get("", response_model=list[WhiteboardOut])
def list_owned(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_whiteboards(db, user.id)


@router.post("", response_model=WhiteboardOut, status_code=status.HTTP_201_CREATED)
def create_owned(
    data: WhiteboardCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WhiteboardOut:
    return create_whiteboard(db, user.id, data.title, data.data_json, data.thumbnail)


@router.get("/{board_id}", response_model=WhiteboardOut)
def read_owned(
    board_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WhiteboardOut:
    try:
        return get_whiteboard(db, user.id, board_id)
    except WhiteboardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{board_id}", response_model=WhiteboardOut)
def update_owned(
    board_id: int,
    data: WhiteboardUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WhiteboardOut:
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        return read_owned(board_id, user, db)
    try:
        return update_whiteboard(db, user.id, board_id, changes)
    except WhiteboardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_owned(
    board_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    try:
        delete_whiteboard(db, user.id, board_id)
    except WhiteboardNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _meeting_board(
    code: str,
    participant_id: int | None,
    db: Session,
    update: str | None = None,
) -> MeetingWhiteboardOut:
    if participant_id is None:
        raise HTTPException(status_code=400, detail="X-Participant-Id header is required.")
    try:
        board = (
            update_meeting_whiteboard(db, code, participant_id, update)
            if update is not None
            else get_meeting_whiteboard(db, code, participant_id)
        )
    except MeetingWhiteboardAccessError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return MeetingWhiteboardOut(data_json=board.data_json, updated_at=board.updated_at)


@meeting_router.get("/{code}/whiteboard", response_model=MeetingWhiteboardOut)
def read_meeting_board(
    code: str,
    db: Session = Depends(get_db),
    participant_id: int | None = Header(default=None, alias="X-Participant-Id"),
) -> MeetingWhiteboardOut:
    return _meeting_board(code, participant_id, db)


@meeting_router.put("/{code}/whiteboard", response_model=MeetingWhiteboardOut)
def save_meeting_board(
    code: str,
    data: MeetingWhiteboardUpdate,
    db: Session = Depends(get_db),
    participant_id: int | None = Header(default=None, alias="X-Participant-Id"),
) -> MeetingWhiteboardOut:
    return _meeting_board(code, participant_id, db, data.data_json)
