from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import create_access_token, hash_password, verify_password
from app.core.errors import DomainError
from app.models.user import User
from app.schemas.auth import AuthCredentials, AuthResponse, SignupRequest
from app.utils.ids import generate_meeting_code


def signup_user(data: SignupRequest, db: Session) -> AuthResponse:
    email = str(data.email).lower()
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise DomainError("An account with this email already exists.", 409)
    full_name = data.full_name.strip()
    if not full_name:
        raise DomainError("Name cannot be empty.", 422)

    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(data.password),
        personal_meeting_id=generate_meeting_code(db),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DomainError("An account with this email already exists.", 409) from exc
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user), user=user)


def login_user(data: AuthCredentials, db: Session) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    if user is None or not verify_password(data.password, user.password_hash):
        raise DomainError("Invalid email or password.", 401)
    return AuthResponse(access_token=create_access_token(user), user=user)
