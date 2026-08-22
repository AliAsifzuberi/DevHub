"""
Shared Pydantic base that speaks camelCase to the frontend.

Python uses snake_case (`created_at`). The React types use camelCase
(`createdAt`). This base converts automatically on both input and output so
neither side has to compromise.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


def to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


def serialize_datetime(value: datetime) -> str:
    """ISO-8601 UTC string — matches the frontend's date convention."""
    if value.tzinfo is None:
        return value.isoformat() + "Z"
    return value.isoformat()


def serialize_uuid(value: UUID) -> str:
    return str(value)
