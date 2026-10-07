import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_shapes(value: str) -> str:
    try:
        shapes = json.loads(value)
    except json.JSONDecodeError as exc:
        raise ValueError("data_json must contain valid JSON.") from exc
    if not isinstance(shapes, list) or len(shapes) > 5000:
        raise ValueError("data_json must be a list of at most 5000 shapes.")
    if any(not isinstance(shape, dict) for shape in shapes):
        raise ValueError("Each whiteboard shape must be an object.")
    return value


class WhiteboardCreate(BaseModel):
    """Fields accepted when creating an owned board."""

    title: str = Field(min_length=1, max_length=120)
    data_json: str = "[]"
    thumbnail: str | None = Field(default=None, max_length=500_000)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank.")
        return value

    _validate_data = field_validator("data_json")(_validate_shapes)


class WhiteboardUpdate(BaseModel):
    """Partial changes accepted for an owned board."""

    title: str | None = Field(default=None, min_length=1, max_length=120)
    data_json: str | None = None
    thumbnail: str | None = Field(default=None, max_length=500_000)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Title cannot be null.")
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank.")
        return value

    @field_validator("data_json")
    @classmethod
    def data_must_be_present_when_supplied(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("data_json cannot be null.")
        return value

    _validate_data = field_validator("data_json")(_validate_shapes)


class WhiteboardOut(BaseModel):
    """Whiteboard document returned to its owner."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    title: str
    data_json: str
    thumbnail: str | None
    created_at: datetime
    updated_at: datetime


class MeetingWhiteboardUpdate(BaseModel):
    """Collaborative drawing state submitted by meeting participants."""

    data_json: str

    _validate_data = field_validator("data_json")(_validate_shapes)


class MeetingWhiteboardOut(BaseModel):
    """Collaborative board state and its latest update timestamp."""

    data_json: str
    updated_at: datetime
