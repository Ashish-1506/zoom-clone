from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import AuthCredentials, AuthResponse, SignupRequest
from app.services.auth_service import login_user, signup_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return signup_user(data, db)


@router.post("/login", response_model=AuthResponse)
def login(data: AuthCredentials, db: Session = Depends(get_db)) -> AuthResponse:
    return login_user(data, db)
