from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.meeting import Meeting
from app.models.participant import Participant
from app.models.whiteboard import MeetingWhiteboard, Whiteboard
from app.utils.time import utcnow


class WhiteboardNotFoundError(Exception):
    """Raised when a board does not exist or is not owned by the requester."""


class MeetingWhiteboardAccessError(Exception):
    """Raised when the requester is not an active participant in the meeting."""


def list_whiteboards(db: Session, owner_id: int) -> list[Whiteboard]:
    """Return a user's boards ordered by most recently edited."""
    return list(
        db.scalars(
            select(Whiteboard)
            .where(Whiteboard.owner_id == owner_id)
            .order_by(Whiteboard.updated_at.desc(), Whiteboard.id.desc())
        )
    )


def get_whiteboard(db: Session, owner_id: int, board_id: int) -> Whiteboard:
    board = db.scalar(
        select(Whiteboard).where(
            Whiteboard.id == board_id,
            Whiteboard.owner_id == owner_id,
        )
    )
    if board is None:
        raise WhiteboardNotFoundError("Whiteboard not found.")
    return board


def create_whiteboard(db: Session, owner_id: int, title: str, data_json: str, thumbnail: str | None) -> Whiteboard:
    board = Whiteboard(owner_id=owner_id, title=title, data_json=data_json, thumbnail=thumbnail)
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


def update_whiteboard(
    db: Session, owner_id: int, board_id: int, changes: dict[str, object]
) -> Whiteboard:
    board = get_whiteboard(db, owner_id, board_id)
    for field, value in changes.items():
        setattr(board, field, value)
    board.updated_at = utcnow()
    db.commit()
    db.refresh(board)
    return board


def delete_whiteboard(db: Session, owner_id: int, board_id: int) -> None:
    board = get_whiteboard(db, owner_id, board_id)
    db.delete(board)
    db.commit()


def _require_participant(db: Session, code: str, participant_id: int) -> Meeting:
    result = db.execute(
        select(Meeting, Participant)
        .join(Participant, Participant.meeting_id == Meeting.id)
        .where(
            Meeting.meeting_code == code,
            Participant.id == participant_id,
            Participant.left_at.is_(None),
            Participant.is_removed.is_(False),
        )
    ).first()
    if result is None:
        raise MeetingWhiteboardAccessError("An active meeting participant is required.")
    return result[0]


def get_meeting_whiteboard(db: Session, code: str, participant_id: int) -> MeetingWhiteboard:
    meeting = _require_participant(db, code, participant_id)
    board = db.scalar(
        select(MeetingWhiteboard).where(MeetingWhiteboard.meeting_id == meeting.id)
    )
    if board is None:
        board = MeetingWhiteboard(meeting_id=meeting.id, data_json="[]")
        db.add(board)
        db.commit()
        db.refresh(board)
    return board


def update_meeting_whiteboard(
    db: Session, code: str, participant_id: int, data_json: str
) -> MeetingWhiteboard:
    board = get_meeting_whiteboard(db, code, participant_id)
    board.data_json = data_json
    board.updated_at = utcnow()
    db.commit()
    db.refresh(board)
    return board
