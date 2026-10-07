from pydantic import BaseModel, Field, field_validator


class JoinRequest(BaseModel):
    """Input required for joining a meeting as a named guest or user."""

    display_name: str = Field(min_length=1, max_length=60)
    passcode: str | None = Field(default=None, min_length=1, max_length=6)

    @field_validator("display_name", "passcode")
    @classmethod
    def strip_values(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("display_name")
    @classmethod
    def require_display_name(cls, value: str) -> str:
        if not value:
            raise ValueError("display_name must not be blank.")
        return value
