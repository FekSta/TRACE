"""
Database engine and session configuration for TRACE.

Phase 1: local PostgreSQL via Docker (DATABASE_URL from env).
Phase 2: swap DATABASE_URL to Supabase — no code changes required.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://trace:trace_local_password@localhost:5432/trace",
)


# Sync engine for Alembic migrations and seed scripts.
# For async usage in FastAPI, the app layer will use asyncpg with a separate async engine.
sync_url = DATABASE_URL.replace("+asyncpg", "+psycopg2")
engine = create_engine(sync_url, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: yield a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
