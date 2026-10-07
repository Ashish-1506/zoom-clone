from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.phone import CallLog, Contact, Voicemail


class PhoneError(Exception):
    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def list_call_logs(db: Session, user_id: int) -> list[CallLog]:
    return list(db.scalars(select(CallLog).where(CallLog.user_id == user_id).order_by(CallLog.created_at.desc())))


def create_call_log(db: Session, user_id: int, **data: object) -> CallLog:
    log = CallLog(user_id=user_id, **data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def list_voicemails(db: Session, user_id: int) -> list[Voicemail]:
    return list(db.scalars(select(Voicemail).where(Voicemail.user_id == user_id).order_by(Voicemail.created_at.desc())))


def update_voicemail(db: Session, user_id: int, voicemail_id: int, is_listened: bool) -> Voicemail:
    voicemail = db.scalar(select(Voicemail).where(Voicemail.id == voicemail_id, Voicemail.user_id == user_id))
    if voicemail is None:
        raise PhoneError("Voicemail not found.", 404)
    voicemail.is_listened = is_listened
    db.commit()
    db.refresh(voicemail)
    return voicemail


def list_contacts(db: Session, user_id: int) -> list[Contact]:
    return list(db.scalars(select(Contact).where(Contact.owner_id == user_id).order_by(Contact.name)))


def create_contact(db: Session, user_id: int, **data: object) -> Contact:
    contact = Contact(owner_id=user_id, **data)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def get_contact(db: Session, user_id: int, contact_id: int) -> Contact:
    contact = db.scalar(select(Contact).where(Contact.id == contact_id, Contact.owner_id == user_id))
    if contact is None:
        raise PhoneError("Contact not found.", 404)
    return contact


def update_contact(db: Session, user_id: int, contact_id: int, changes: dict[str, object]) -> Contact:
    contact = get_contact(db, user_id, contact_id)
    for field, value in changes.items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, user_id: int, contact_id: int) -> None:
    db.delete(get_contact(db, user_id, contact_id))
    db.commit()
