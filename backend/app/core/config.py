from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import secrets

from app.core.constants import JWT_EXPIRY_HOURS


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""

    database_url: str = "sqlite:///./zoom.db"
    frontend_url: str = Field(min_length=1)
    cors_origins: list[str] = Field(default_factory=list)
    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = JWT_EXPIRY_HOURS

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def allowed_origins(self) -> list[str]:
        """Include the configured frontend in CORS origins automatically."""
        return list(dict.fromkeys([self.frontend_url, *self.cors_origins]))


settings = Settings()
