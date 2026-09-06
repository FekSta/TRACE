"""Pytest fixtures for TRACE backend unit tests.

Test DB strategy: SQLite in-memory via SQLAlchemy.

Why SQLite, not a throwaway Postgres schema:
- The CI workflow's unit-test job sets `ENVIRONMENT=ci` and does NOT start
  the `db` or `mailpit` Docker services — only `pytest`/`pytest-asyncio`/
  `pytest-cov` are installed. A Postgres-backed test would need a running
  Postgres instance, which the unit-test job explicitly does not provide.
- SQLite in-memory with `StaticPool` gives us a fresh database per test
  session, zero external dependencies, and fast test runs. The models use
  standard SQLAlchemy types (String, Integer, DateTime, Date, Numeric, Boolean,
  ForeignKey) that all work on SQLite; the only Postgres-specific feature in
  the schema is native enum types, which we cannot exercise on SQLite — but
  that is a DB-layer concern, not a business-logic concern, and the enum
  *values* are asserted in the model tests by checking the Python enum classes
  (which are the source of truth for both Postgres and the ORM).
- The alternative — spinning up a throwaway Postgres schema per test run —
  would require the `db` service or an external Postgres, breaking the CI
  constraint that unit tests are hermetic.
- Trade-off: migration compatibility is not tested (Alembic is Postgres-aware),
  but migrations are already verified by `make check-migrations` and the
  demo kit; unit tests pin the *behavioral* contract, not the migration history.

Coverage scope: tests live in `backend/tests/` but the CI coverage pass
scopes `--cov=api --cov=models --cov=schemas`. Our test package (`tests`) is
separate from those three, so coverage is measured on the *production code*
being exercised, not on the test files themselves — which is what we want.
The `--cov` paths map to:
  - `api`     -> `backend/app/modules/` (Auth, Items, Matching, Claims, Notifications routers/services)
  - `models`  -> `backend/app/models/` (all 11 entities + enums)
  - `schemas` -> `backend/app/modules/*/schemas.py` (Pydantic request/response schemas)
"""

from __future__ import annotations

import os
from datetime import date
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

# --- Ensure env is set for CI before any app code is imported ---------------
# The CI workflow sets ENVIRONMENT=ci; some modules may branch on it.
# We also set a test JWT secret and dummy DB URL so the app can import.
os.environ["ENVIRONMENT"] = "ci"
os.environ["JWT_SECRET"] = "test-secret-for-unit-tests-only"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["EMAIL_BACKEND"] = "smtp"
os.environ["SMTP_HOST"] = "localhost"
os.environ["SMTP_PORT"] = "1025"
os.environ["SMTP_FROM"] = "test@trace.local"
os.environ["UPLOAD_DIR"] = "/tmp/trace-test-uploads"

# --- Import app modules AFTER env is set ------------------------------------
# config.py reads env at import time; models register on Base.metadata.
import app.config  # noqa: E402 — must be after os.environ.setdefault calls
from app.db import Base  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.db import get_db as get_db_func  # noqa: E402
from app.models import (  # noqa: E402
    AuditLog,
    Attachment,
    Category,
    Claim,
    CollectionRecord,
    FoundItem,
    Match,
    Notification,
    User,
    VerificationRecord,
    LostItem,
)
from app.models.enums import (  # noqa: E402
    ClaimVerificationStatus,
    ClaimStatus,
    CategoryStatus,
    FoundItemStatus,
    LostItemStatus,
    MatchStatus,
    NotificationType,
    RelatedEntity,
    UserRole,
    UserStatus,
    VerificationResult,
)
from app.modules.auth.security import create_access_token  # noqa: E402
from app.modules.items.storage import LocalDiskStorage, storage  # noqa: E402
from decimal import Decimal


# ---------------------------------------------------------------------------
# Pre-built item fixtures — depend on user + category fixtures above
# ---------------------------------------------------------------------------


@pytest.fixture()
def lost_item(db_session: Session, user: User, electronics_category: Category) -> LostItem:
    """Create a sample LostItem for FK relationship tests."""
    item = LostItem(
        user_id=user.id,
        category_id=electronics_category.id,
        title="Silver laptop",
        description="MacBook Pro 14-inch",
        status=LostItemStatus.REPORTED,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


@pytest.fixture()
def found_item(db_session: Session, bob: User, electronics_category: Category) -> FoundItem:
    """Create a sample FoundItem for FK relationship tests."""
    item = FoundItem(
        user_id=bob.id,
        category_id=electronics_category.id,
        title="Blue Sony headphones",
        description="Sony WH-1000XM5",
        status=FoundItemStatus.AVAILABLE,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


@pytest.fixture()
def claim(
    db_session: Session, lost_item: LostItem, found_item: FoundItem, user: User
) -> Claim:
    """Create a sample Claim for FK relationship tests."""
    c = Claim(
        lost_item_id=lost_item.id,
        found_item_id=found_item.id,
        user_id=user.id,
        verification_status=ClaimVerificationStatus.PENDING,
        status=ClaimStatus.ACTIVE,
    )
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c


@pytest.fixture()
def match(db_session: Session, lost_item: LostItem, found_item: FoundItem) -> Match:
    """Create a sample Match for FK relationship tests."""
    m = Match(
        lost_item_id=lost_item.id,
        found_item_id=found_item.id,
        match_score=Decimal("95.50"),
        match_reason="strong match",
        status=MatchStatus.SUGGESTED,
    )
    db_session.add(m)
    db_session.commit()
    db_session.refresh(m)
    return m


@pytest.fixture()
def notification(db_session: Session, user: User) -> Notification:
    """Create a sample Notification for FK relationship tests."""
    n = Notification(
        user_id=user.id,
        title="Test",
        message="Test notification",
        notification_type=NotificationType.MATCH,
    )
    db_session.add(n)
    db_session.commit()
    db_session.refresh(n)
    return n


@pytest.fixture()
def verification_record(
    db_session: Session, claim: Claim, officer: User
) -> VerificationRecord:
    """Create a sample VerificationRecord for FK relationship tests."""
    vr = VerificationRecord(
        claim_id=claim.id,
        officer_id=officer.id,
        result=VerificationResult.PASSED,
    )
    db_session.add(vr)
    db_session.commit()
    db_session.refresh(vr)
    return vr


@pytest.fixture()
def collection_record(
    db_session: Session, claim: Claim, officer: User
) -> CollectionRecord:
    """Create a sample CollectionRecord for FK relationship tests."""
    cr = CollectionRecord(
        claim_id=claim.id,
        officer_id=officer.id,
        collected_by="Test",
    )
    db_session.add(cr)
    db_session.commit()
    db_session.refresh(cr)
    return cr


@pytest.fixture()
def attachment(db_session: Session, user: User) -> Attachment:
    """Create a sample Attachment for FK relationship tests."""
    a = Attachment(
        file_name="test.jpg",
        file_path="/media/test.jpg",
        file_type="image/jpeg",
        uploaded_by=user.id,
        related_entity=RelatedEntity.LOST_ITEM,
        entity_id=1,
    )
    db_session.add(a)
    db_session.commit()
    db_session.refresh(a)
    return a


@pytest.fixture()
def audit_log(db_session: Session, user: User) -> AuditLog:
    """Create a sample AuditLog for FK relationship tests."""
    al = AuditLog(
        user_id=user.id,
        action="TestAction",
        entity_name="TestCase",
        entity_id=1,
    )
    db_session.add(al)
    db_session.commit()
    db_session.refresh(al)
    return al


# ---------------------------------------------------------------------------
# Test database — SQLite in-memory, StaticPool so the connection stays alive
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite:///:memory:"

# Create engine before any test runs; StaticPool keeps the same connection
# so the in-memory DB survives across the session.
_test_engine = create_engine(
    TEST_DB_URL,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = sessionmaker(
    bind=_test_engine,
    autoflush=False,
    autocommit=False,
)


def _create_tables():
    """Create all tables on the test engine."""
    Base.metadata.create_all(_test_engine)


def _drop_tables():
    """Drop all tables (between test sessions or for fresh state)."""
    Base.metadata.drop_all(_test_engine)


# ---------------------------------------------------------------------------
# Session-scoped engine setup — create tables once, drop after all tests
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session", autouse=True)
def _setup_test_db():
    """Create tables before the test session, drop them after."""
    _create_tables()
    yield
    _drop_tables()


# ---------------------------------------------------------------------------
# Per-function DB session — fresh transaction per test
# ---------------------------------------------------------------------------


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Provide a clean DB session for each test, rolled back after."""
    connection = _test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


# ---------------------------------------------------------------------------
# FastAPI TestClient — uses the test DB via dependency override
# ---------------------------------------------------------------------------


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient wired to the test database session."""

    def _override_get_db():
        yield db_session

    fastapi_app.dependency_overrides.clear()
    fastapi_app.dependency_overrides[get_db_func] = _override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Factory fixtures — seed a User per role with known credentials
# ---------------------------------------------------------------------------


def _hash_password(password: str) -> str:
    """Hash a password using the app's bcrypt hasher (imported on demand)."""
    from app.modules.auth.security import hash_password as _hp

    return _hp(password)


@pytest.fixture()
def user(db_session: Session) -> User:
    """Create a User-role user (the standard reporter)."""
    user = User(
        first_name="Ada",
        last_name="Lovelace",
        email="ada@example.com",
        password_hash=_hash_password("SuperSecret1!"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def officer(db_session: Session) -> User:
    """Create an Officer-role user (can verify claims)."""
    user = User(
        first_name="Grace",
        last_name="Hopper",
        email="officer@example.com",
        password_hash=_hash_password("TestPass123!"),
        role=UserRole.OFFICER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def admin(db_session: Session) -> User:
    """Create an Administrator-role user (full access)."""
    user = User(
        first_name="Alan",
        last_name="Turing",
        email="admin@example.com",
        password_hash=_hash_password("TestPass123!"),
        role=UserRole.ADMINISTRATOR,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def bob(db_session: Session) -> User:
    """Create a second User (finder, for ownership-scoping tests)."""
    user = User(
        first_name="Bob",
        last_name="Builder",
        email="bob@example.com",
        password_hash=_hash_password("SuperSecret1!"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def suspended_user(db_session: Session) -> User:
    """Create a Suspended user — login should be rejected with 403."""
    user = User(
        first_name="Eve",
        last_name="Locked",
        email="suspended@example.com",
        password_hash=_hash_password("SuperSecret1!"),
        role=UserRole.USER,
        status=UserStatus.SUSPENDED,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def inactive_user(db_session: Session) -> User:
    """Create an Inactive user — login should be rejected with 403."""
    user = User(
        first_name="Zoe",
        last_name="Inactive",
        email="inactive@example.com",
        password_hash=_hash_password("SuperSecret1!"),
        role=UserRole.USER,
        status=UserStatus.INACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def electronics_category(db_session: Session) -> Category:
    """Create the Electronics category (idempotent by name)."""
    cat = db_session.scalar(
        Category.__table__.select().where(Category.category_name == "Electronics")
    )
    if cat is None:
        cat = Category(
            category_name="Electronics",
            description="Electronic devices and accessories",
            icon="electronics",
            display_order=1,
            status=CategoryStatus.ACTIVE,
        )
        db_session.add(cat)
        db_session.commit()
        db_session.refresh(cat)
    return cat


@pytest.fixture()
def bags_category(db_session: Session) -> Category:
    """Create the Bags category."""
    cat = db_session.scalar(
        Category.__table__.select().where(Category.category_name == "Bags")
    )
    if cat is None:
        cat = Category(
            category_name="Bags",
            description="Bags, backpacks, and luggage",
            icon="bag",
            display_order=2,
            status=CategoryStatus.ACTIVE,
        )
        db_session.add(cat)
        db_session.commit()
        db_session.refresh(cat)
    return cat


# ---------------------------------------------------------------------------
# Auth helper — create a valid JWT for a given user
# ---------------------------------------------------------------------------


@pytest.fixture()
def user_token(user: User) -> str:
    """Return a valid JWT access token for the `user` fixture."""
    return create_access_token(user)


@pytest.fixture()
def officer_token(officer: User) -> str:
    """Return a valid JWT access token for the `officer` fixture."""
    return create_access_token(officer)


@pytest.fixture()
def admin_token(admin: User) -> str:
    """Return a valid JWT access token for the `admin` fixture."""
    return create_access_token(admin)


@pytest.fixture()
def bob_token(bob: User) -> str:
    """Return a valid JWT access token for the `bob` fixture."""
    return create_access_token(bob)


# ---------------------------------------------------------------------------
# Markers
# ---------------------------------------------------------------------------


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers",
        "integration: mark test as requiring external services (excluded from 'not integration' pass)",
    )
