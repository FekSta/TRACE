"""
Shared SQLAlchemy base class and GUID type for UUID primary keys.

All entity models inherit from Base so Alembic can discover them all
from a single import.
"""

import uuid

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for every TRACE model."""
    pass


def generate_uuid() -> uuid.UUID:
    """Generate a new UUID4."""
    return uuid.uuid4()
