from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserOut


class AuthCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SignupRequest(AuthCredentials):
    full_name: str = Field(min_length=1, max_length=120)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
