from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.phone import (
    CallLogCreate, CallLogOut, ContactCreate, ContactOut, ContactUpdate,
    VoicemailOut, VoicemailUpdate,
)
from app.services.phone_service import (
    PhoneError, create_call_log, create_contact, delete_contact, list_call_logs,
    list_contacts, list_voicemails, update_contact, update_voicemail,
)

router = APIRouter(prefix="/api/phone", tags=["phone"])


def _raise(exc: PhoneError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/call-logs", response_model=list[CallLogOut])
def call_logs(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[CallLogOut]:
    return [CallLogOut.model_validate(log) for log in list_call_logs(db, user.id)]


@router.post("/call-logs", response_model=CallLogOut, status_code=status.HTTP_201_CREATED)
def create_log(data: CallLogCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CallLogOut:
    return CallLogOut.model_validate(create_call_log(db, user.id, **data.model_dump()))


@router.get("/voicemails", response_model=list[VoicemailOut])
def voicemails(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[VoicemailOut]:
    return [VoicemailOut.model_validate(item) for item in list_voicemails(db, user.id)]


@router.patch("/voicemails/{voicemail_id}", response_model=VoicemailOut)
def mark_voicemail(voicemail_id: int, data: VoicemailUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> VoicemailOut:
    try:
        return VoicemailOut.model_validate(update_voicemail(db, user.id, voicemail_id, data.is_listened))
    except PhoneError as exc:
        _raise(exc)


@router.get("/contacts", response_model=list[ContactOut])
def contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ContactOut]:
    return [ContactOut.model_validate(item) for item in list_contacts(db, user.id)]


@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def create_new_contact(data: ContactCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ContactOut:
    return ContactOut.model_validate(create_contact(db, user.id, **data.model_dump()))


@router.patch("/contacts/{contact_id}", response_model=ContactOut)
def edit_contact(contact_id: int, data: ContactUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ContactOut:
    try:
        return ContactOut.model_validate(update_contact(db, user.id, contact_id, data.model_dump(exclude_unset=True)))
    except PhoneError as exc:
        _raise(exc)


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_contact(contact_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    try:
        delete_contact(db, user.id, contact_id)
    except PhoneError as exc:
        _raise(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
