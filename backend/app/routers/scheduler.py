from datetime import date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.scheduler import (
    BookingConfirmationOut, BookingCreate, BookingOut, PublicSchedulerLinkOut,
    SchedulerLinkCreate, SchedulerLinkOut, SchedulerLinkUpdate, SchedulerSlotOut,
)
from app.services.scheduler_service import (
    SchedulerError, book_slot, create_link, delete_link, get_public_link,
    list_bookings, list_links, slots_for_date, update_link,
)

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


def _raise(exc: SchedulerError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/links", response_model=list[SchedulerLinkOut])
def links(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SchedulerLinkOut]:
    return [SchedulerLinkOut.model_validate(link) for link in list_links(db, user.id)]


@router.post("/links", response_model=SchedulerLinkOut, status_code=status.HTTP_201_CREATED)
def create(data: SchedulerLinkCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SchedulerLinkOut:
    try:
        return SchedulerLinkOut.model_validate(create_link(db, user, data.model_dump()))
    except SchedulerError as exc:
        _raise(exc)


@router.patch("/links/{link_id}", response_model=SchedulerLinkOut)
def update(link_id: int, data: SchedulerLinkUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SchedulerLinkOut:
    try:
        return SchedulerLinkOut.model_validate(update_link(db, user.id, link_id, data.model_dump(exclude_unset=True)))
    except SchedulerError as exc:
        _raise(exc)


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(link_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    try:
        delete_link(db, user.id, link_id)
    except SchedulerError as exc:
        _raise(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/bookings", response_model=list[BookingOut])
def bookings(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[BookingOut]:
    return [BookingOut.model_validate(booking) for booking in list_bookings(db, user.id)]


@router.get("/public/{slug}", response_model=PublicSchedulerLinkOut)
def public_link(slug: str, db: Session = Depends(get_db)) -> PublicSchedulerLinkOut:
    try:
        link = get_public_link(db, slug)
        return PublicSchedulerLinkOut(
            slug=link.slug,
            title=link.title,
            description=link.description,
            duration_minutes=link.duration_minutes,
            available_days=link.available_days,
            timezone=link.timezone,
        )
    except SchedulerError as exc:
        _raise(exc)


@router.get("/public/{slug}/slots", response_model=list[SchedulerSlotOut])
def slots(slug: str, date: date = Query(), db: Session = Depends(get_db)) -> list[SchedulerSlotOut]:
    try:
        link = get_public_link(db, slug)
        zone = ZoneInfo(link.timezone)
        return [
            SchedulerSlotOut(
                start_time=start,
                end_time=end,
                label=start.astimezone(zone).strftime("%I:%M %p").lstrip("0"),
            )
            for start, end in slots_for_date(db, link, date)
        ]
    except SchedulerError as exc:
        _raise(exc)


@router.post("/public/{slug}/book", response_model=BookingConfirmationOut, status_code=status.HTTP_201_CREATED)
def book(slug: str, data: BookingCreate, db: Session = Depends(get_db)) -> BookingConfirmationOut:
    try:
        link = get_public_link(db, slug)
        booking = book_slot(db, link, data.guest_name, data.guest_email, data.start_time)
        return BookingConfirmationOut.model_validate({**BookingOut.model_validate(booking).model_dump(), "meeting_link": booking.meeting.invite_link})
    except SchedulerError as exc:
        _raise(exc)
