from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.schemas.user import UserOut, UserUpdate
from app.schemas.user_settings import UserSettingsOut, UserSettingsUpdate
from app.models.user import User
from app.services.user_service import (
    get_user_settings,
    save_user_settings,
    update_user_profile,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_all_users(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    """Directory used to begin a new direct message in Team Chat."""
    return [UserOut.model_validate(user) for user in db.scalars(select(User).order_by(User.full_name))]


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    return UserOut.model_validate(update_user_profile(db, user, data))


@router.get("/me/settings", response_model=UserSettingsOut)
def get_me_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSettingsOut:
    return UserSettingsOut(settings=get_user_settings(db, user.id))


@router.put("/me/settings", response_model=UserSettingsOut)
def update_me_settings(
    data: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSettingsOut:
    return UserSettingsOut(
        settings=save_user_settings(db, user.id, data.settings),
    )
