from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return a timezone-aware datetime representing the current UTC time."""
    return datetime.now(timezone.utc)
