"""
Shared SQLAlchemy base class and GUID type for UUID primary keys.

All entity models inherit from Base so Alembic can discover them all
from a single import.
"""

import uuid

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for every TRACE model."""


def generate_uuid() -> uuid.UUID:
    """Generate a new UUID4."""
    return uuid.uuid4()
