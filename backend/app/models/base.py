"""
Shared SQLAlchemy base class for TRACE.

All entity models inherit from Base so Alembic can discover them all
from a single import.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for every TRACE model."""
    pass
