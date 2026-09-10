"""Application configuration — read from the repo-root `.env` (gitignored).

Phase 1 local + optional Phase 2 (cloud) wiring. `load_dotenv(...,
override=True)` makes the committed `.env` file win over any stale values
already exported in the shell, so the backend always runs against the intended
local configuration (see `Review.md` for the Milestone-1 stale-`DATABASE_URL`
note).

Phase-2 vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_STORAGE_BUCKET`, `RESEND_API_KEY`, external `DATABASE_URL`) are
optional: the Phase-1 demo must boot with none of them set. They fail fast at
startup ONLY when the matching cloud backend is actually selected (see the
conditional validation at the bottom of this module).
"""

import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

# Walk up from this file's directory to locate the repo-root `.env`.
load_dotenv(find_dotenv(), override=True)


def _get(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _require(name: str, *, backend: str, selector: str) -> str:
    """Fail fast at startup when a Phase-2 cloud backend is selected but one of
    its required vars is missing or empty — never boot into a silent
    misconfiguration (see the conditional block at the bottom of this module)."""
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(
            f"{name} must be set when {selector}={backend!r} (Phase 2). "
            f"Add it to the repo-root `.env`, or switch {selector} back to its "
            f"Phase-1 value (see Notes.md 'Phase 2 env wiring')."
        )
    return value


# --- Database ---------------------------------------------------------------
# Phase 1: host-side local Postgres (localhost — used by host tools and the
# default fallback). Phase 2: docker-compose.override.yml (auto-loaded)
# forwards a DATABASE_URL set in `.env` to the backend container, so an
# external Postgres URL here moves the app off the local db container with no
# code change — same SQLAlchemy models and Alembic migrations run unchanged.
DATABASE_URL = _get(
    "DATABASE_URL",
    "postgresql+psycopg://trace:trace_local_password@localhost:5432/trace",
)

# --- Authentication (JWT) ---------------------------------------------------
# JWT_SECRET comes from .env — never hardcoded, never committed.
JWT_SECRET = _get("JWT_SECRET", "change-this-development-secret")
JWT_ALGORITHM = _get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(_get("JWT_EXPIRE_MINUTES", "60"))

# --- Storage (Module 3) -----------------------------------------------------
# Selects the active storage implementation. Phase 1: `local`
# (LocalDiskStorage). Phase 2: `supabase` — the Module 9 SupabaseStorage
# adapter (not built yet; this pass wires only the config).
STORAGE_BACKEND = _get("STORAGE_BACKEND", "local")
# LocalDiskStorage root (resolved to `backend/uploads/` by default).
UPLOAD_DIR = Path(
    _get("UPLOAD_DIR", str(Path(__file__).resolve().parent.parent / "uploads"))
)

# --- Email (Module 6) --------------------------------------------------------
# Phase 1 sends through the local Mailpit catcher only — no external SMTP
# relay, no Resend (`ABOUT.md`'s single notification channel: email).
# SMTP_HOST is `localhost` when the backend runs on the host (Phase 1); the
# docker-compose value is `mailpit` for the Module 8 backend container.
EMAIL_BACKEND = _get("EMAIL_BACKEND", "smtp")
SMTP_HOST = _get("SMTP_HOST", "localhost")
SMTP_PORT = int(_get("SMTP_PORT", "1025"))
SMTP_FROM = _get("SMTP_FROM", "no-reply@trace.local")

# --- Phase 2 (optional) cloud backends --------------------------------------
# Optional by design — the Phase-1 demo (local/smtp) boots with NONE of these
# set (docker-compose.override.yml forwards them to the container as empty
# strings when `.env` leaves them unset). The conditional validation below
# raises only when the matching cloud backend is actually selected, so a
# mis-set backend can never run silently with missing config.
SUPABASE_URL = _get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = _get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_STORAGE_BUCKET = _get("SUPABASE_STORAGE_BUCKET", "")
RESEND_API_KEY = _get("RESEND_API_KEY", "")

if STORAGE_BACKEND == "supabase":
    for var in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"):
        _require(var, backend=STORAGE_BACKEND, selector="STORAGE_BACKEND")
if EMAIL_BACKEND == "resend":
    _require("RESEND_API_KEY", backend=EMAIL_BACKEND, selector="EMAIL_BACKEND")

# --- Password hashing -------------------------------------------------------
# bcrypt cost factor: 2^12 iterations (OWASP-current). Trade-off documented in
# Review.md §Module 2.
BCRYPT_ROUNDS = 12
