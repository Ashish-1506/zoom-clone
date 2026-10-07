import re
import secrets
import string
from urllib.parse import urlsplit

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.meeting import Meeting

_MEETING_CODE_PATTERN = re.compile(r"^\d{11}$")
_INVITE_PATH_PATTERN = re.compile(r"/j/(\d{11})(?:/)?$")


def generate_meeting_code(db: Session) -> str:
    """Generate an unused eleven-digit meeting code."""
    while True:
        code = str(secrets.randbelow(90_000_000_000) + 10_000_000_000)
        if db.scalar(select(Meeting.id).where(Meeting.meeting_code == code)) is None:
            return code


def generate_passcode() -> str:
    """Generate a six-character alphanumeric meeting passcode."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def build_invite_link(code: str, passcode: str) -> str:
    """Build the canonical frontend invite URL for a meeting."""
    return f"{settings.frontend_url}/j/{code}?pwd={passcode}"


def format_meeting_code(code: str) -> str:
    """Format an eleven-digit code as Zoom-style 3-4-4 groups."""
    if not _MEETING_CODE_PATTERN.fullmatch(code):
        raise ValueError("Meeting code must contain exactly 11 digits.")
    return f"{code[:3]} {code[3:7]} {code[7:]}"


def normalize_meeting_input(raw: str | None) -> str | None:
    """Extract a plain meeting code from an ID or a full invite URL."""
    if not raw:
        return None
    value = raw.strip()
    compact = re.sub(r"[\s-]", "", value)
    if _MEETING_CODE_PATTERN.fullmatch(compact):
        return compact
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    match = _INVITE_PATH_PATTERN.fullmatch(parsed.path.rstrip("/"))
    return match.group(1) if match else None
