"""Shared SQLAlchemy setup for the TRACE modular monolith.

All 11 ORM models inherit from :class:`Base` (see ``app/models/``). Importing
``app.models`` registers every model on ``Base.metadata``, which is what
Alembic autogenerate reads.

One engine / one session factory shared by all modules — modular monolith,
single Postgres database (see `ABOUT.md`).
"""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL


class Base(DeclarativeBase):
    """Declarative base for every TRACE model."""


engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a database session (one per request)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
