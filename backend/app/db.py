"""Shared SQLAlchemy setup for the TRACE modular monolith.

All 11 ORM models inherit from :class:`Base` (see ``app/models/``). Importing
``app.models`` registers every model on ``Base.metadata``, which is what
Alembic autogenerate reads.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for every TRACE model."""
