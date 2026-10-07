import json

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import DomainError
from app.core.constants import (
    DEFAULT_AVATAR_COLOR,
    DEFAULT_USER_EMAIL,
    DEFAULT_USER_ID,
    DEFAULT_USER_NAME,
)
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.user import UserUpdate
from app.schemas.user_settings import UserSettingsData
from app.utils.ids import generate_meeting_code


def get_or_create_default_user(db: Session) -> User:
    """Return the seeded user, creating a stable local development identity."""
    user = db.get(User, DEFAULT_USER_ID)
    if user is None:
        user = User(
            id=DEFAULT_USER_ID,
            full_name=DEFAULT_USER_NAME,
            email=DEFAULT_USER_EMAIL,
            avatar_color=DEFAULT_AVATAR_COLOR,
            personal_meeting_id=generate_meeting_code(db),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def update_user_profile(db: Session, user: User, changes: UserUpdate) -> User:
    """Persist editable user profile values and translate unique-email conflicts."""
    for field, value in changes.model_dump().items():
        setattr(user, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DomainError("That email address is already in use.", 409) from exc
    db.refresh(user)
    return user


def get_user_settings(db: Session, user_id: int) -> UserSettingsData:
    """Load persisted preferences or return the canonical defaults."""
    record = db.scalar(select(UserSettings).where(UserSettings.user_id == user_id))
    if record is None:
        return UserSettingsData()
    return UserSettingsData.model_validate_json(record.settings_json)


def save_user_settings(
    db: Session,
    user_id: int,
    values: UserSettingsData,
) -> UserSettingsData:
    """Upsert a user's validated preference document."""
    record = db.scalar(select(UserSettings).where(UserSettings.user_id == user_id))
    serialized = values.model_dump_json()
    if record is None:
        record = UserSettings(user_id=user_id, settings_json=serialized)
        db.add(record)
    else:
        record.settings_json = serialized
    db.commit()
    return values
