from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.scheduler import Booking, SchedulerLink
from app.models.user import User
from app.schemas.meeting import MeetingCreateScheduled
from app.services.meeting_service import create_scheduled_meeting
from app.utils.time import utcnow


class SchedulerError(Exception):
    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def _zone(timezone_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise SchedulerError("Unsupported timezone.", 422) from exc


def _as_utc(value: datetime) -> datetime:
    """SQLite may return naive timestamps, which this schema stores as UTC."""
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_link(db: Session, link_id: int, owner_id: int) -> SchedulerLink:
    link = db.scalar(select(SchedulerLink).where(SchedulerLink.id == link_id, SchedulerLink.owner_id == owner_id))
    if link is None:
        raise SchedulerError("Scheduling link not found.", 404)
    return link


def get_public_link(db: Session, slug: str) -> SchedulerLink:
    link = db.scalar(select(SchedulerLink).where(SchedulerLink.slug == slug.lower(), SchedulerLink.is_active.is_(True)))
    if link is None:
        raise SchedulerError("This scheduling link is not available.", 404)
    return link


def list_links(db: Session, owner_id: int) -> list[SchedulerLink]:
    return list(db.scalars(select(SchedulerLink).where(SchedulerLink.owner_id == owner_id).order_by(SchedulerLink.created_at.desc())))


def create_link(db: Session, owner: User, values: dict[str, object]) -> SchedulerLink:
    if db.scalar(select(SchedulerLink.id).where(SchedulerLink.slug == values["slug"])) is not None:
        raise SchedulerError("That scheduling link slug is already in use.", 409)
    link = SchedulerLink(owner_id=owner.id, **values)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def update_link(db: Session, owner_id: int, link_id: int, values: dict[str, object]) -> SchedulerLink:
    link = get_link(db, link_id, owner_id)
    merged_start = values.get("start_hour", link.start_hour)
    merged_end = values.get("end_hour", link.end_hour)
    if isinstance(merged_start, int) and isinstance(merged_end, int) and merged_end <= merged_start:
        raise SchedulerError("End hour must be after start hour.", 422)
    new_slug = values.get("slug")
    if isinstance(new_slug, str) and new_slug != link.slug:
        duplicate = db.scalar(
            select(SchedulerLink.id).where(
                SchedulerLink.slug == new_slug,
                SchedulerLink.id != link.id,
            )
        )
        if duplicate is not None:
            raise SchedulerError("That scheduling link slug is already in use.", 409)
    new_timezone = values.get("timezone")
    if isinstance(new_timezone, str):
        _zone(new_timezone)
    if "available_days" in values:
        days = values["available_days"]
        if not isinstance(days, list) or not days or any(day not in range(7) for day in days):
            raise SchedulerError("Choose one or more valid weekdays.", 422)
        values["available_days"] = sorted(set(days))
    for field, value in values.items():
        setattr(link, field, value)
    db.commit()
    db.refresh(link)
    return link


def delete_link(db: Session, owner_id: int, link_id: int) -> None:
    db.delete(get_link(db, link_id, owner_id))
    db.commit()


def slots_for_date(db: Session, link: SchedulerLink, selected_date: date) -> list[tuple[datetime, datetime]]:
    if selected_date.weekday() not in link.available_days:
        return []
    zone = _zone(link.timezone)
    window_start = datetime.combine(selected_date, time(link.start_hour), zone)
    window_end = datetime.combine(selected_date, time(link.end_hour), zone)
    bookings = db.scalars(
        select(Booking).where(
            Booking.link_id == link.id,
            Booking.status == "confirmed",
            Booking.start_time < window_end.astimezone(timezone.utc),
            Booking.end_time > window_start.astimezone(timezone.utc),
        )
    ).all()
    booked_ranges = [
        (_as_utc(booking.start_time), _as_utc(booking.end_time))
        for booking in bookings
    ]
    now = utcnow()
    slots: list[tuple[datetime, datetime]] = []
    cursor = window_start
    while cursor + timedelta(minutes=link.duration_minutes) <= window_end:
        end = cursor + timedelta(minutes=link.duration_minutes)
        start_utc = cursor.astimezone(timezone.utc)
        end_utc = end.astimezone(timezone.utc)
        if start_utc > now and not any(
            booked_start < end_utc and booked_end > start_utc
            for booked_start, booked_end in booked_ranges
        ):
            slots.append((start_utc, end_utc))
        cursor = end
    return slots


def book_slot(db: Session, link: SchedulerLink, guest_name: str, guest_email: str, start_time: datetime) -> Booking:
    if start_time.tzinfo is None or start_time.utcoffset() is None:
        raise SchedulerError("Choose a valid time slot.", 422)
    requested = start_time.astimezone(timezone.utc)
    matching = next((slot for slot in slots_for_date(db, link, requested.astimezone(_zone(link.timezone)).date()) if slot[0] == requested), None)
    if matching is None:
        raise SchedulerError("That time slot is no longer available.", 409)
    start, end = matching
    meeting = create_scheduled_meeting(
        db,
        link.owner_id,
        MeetingCreateScheduled(
            title=f"{link.title} with {guest_name}",
            description=f"Scheduled through {link.slug} by {guest_name} ({guest_email}).",
            start_time=start,
            duration_minutes=link.duration_minutes,
            timezone=link.timezone,
        ),
    )
    booking = Booking(
        link_id=link.id,
        guest_name=guest_name,
        guest_email=guest_email,
        start_time=start,
        end_time=end,
        meeting_id=meeting.id,
        status="confirmed",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def list_bookings(db: Session, owner_id: int) -> list[Booking]:
    return list(db.scalars(
        select(Booking)
        .join(SchedulerLink)
        .where(SchedulerLink.owner_id == owner_id, Booking.start_time >= utcnow())
        .options(joinedload(Booking.link))
        .order_by(Booking.start_time)
    ))
