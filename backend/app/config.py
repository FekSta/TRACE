"""Application configuration — read from the repo-root `.env` (gitignored).

Phase 1 local-only. `load_dotenv(..., override=True)` makes the committed
`.env` file win over any stale values already exported in the shell, so the
backend always runs against the intended local configuration (see `Review.md`
for the Milestone-1 stale-`DATABASE_URL` note).

Single source of truth (Retrofit 2026-09-08): every environment-dependent
value below is **required** — there are no silent fallback defaults, so a
missing variable fails fast at import with a pointer to `.env.example`
instead of silently running against a stale literal. Only genuinely fixed
application constants (`JWT_ALGORITHM`, `BCRYPT_ROUNDS`) keep hardcoded
values, and each is marked as a deliberate exception (see `Review.md`
Retrofit). No other module reads the environment directly — import these
values instead.
"""

import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

# Walk up from this file's directory to locate the repo-root `.env`.
load_dotenv(find_dotenv(), override=True)


def _require(name: str) -> str:
    """Read a required variable from the environment (via `.env` or the shell).

    Fail-fast: a missing variable is a configuration error, not something to
    paper over with a default — `.env` is the single source of truth.
    """
    value = os.environ.get(name)
    if value is None or value == "":
        raise RuntimeError(
            f"Missing required environment variable {name!r}. "
            f"Set it in the repo-root `.env` (copy `.env.example`) or export "
            f"it in the shell."
        )
    return value


# --- Database ---------------------------------------------------------------
# Host-side tools (Alembic, seed, host uvicorn) use this `localhost` URL from
# `.env`. The docker-compose backend container builds its OWN `db`-host URL
# from the `POSTGRES_*` vars (see docker-compose.yml) — by design, the
# host-side value must never reach the container.
DATABASE_URL = _require("DATABASE_URL")

# --- Authentication (JWT) ---------------------------------------------------
# JWT_SECRET comes from .env — never hardcoded, never committed.
JWT_SECRET = _require("JWT_SECRET")
# Fixed application constant (deliberate exception — see Review.md Retrofit):
# the signing algorithm is not an environment-dependent value.
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(_require("JWT_EXPIRE_MINUTES"))

# --- Storage (Module 3) -----------------------------------------------------
# Documented Phase 1/2 seam (Notes.md §2): selects LocalDiskStorage vs
# SupabaseStorage. Phase 1 always resolves to `local`; storage.py pins
# LocalDiskStorage until Module 9 consumes this value.
STORAGE_BACKEND = _require("STORAGE_BACKEND")
# LocalDiskStorage root. `.env` value `uploads` is resolved relative to the
# backend working dir (lands at backend/uploads/); the compose container pins
# the absolute `/app/uploads` instead (docker-compose.yml).
UPLOAD_DIR = Path(_require("UPLOAD_DIR"))

# --- Email (Module 6) -------------------------------------------------------
# Phase 1 sends through the local Mailpit catcher only — no external SMTP
# relay, no Resend (`ABOUT.md`'s single notification channel: email).
# `.env` uses `localhost` for a host-side backend (Mailpit publishes :1025 on
# the host); the compose backend container pins `mailpit` (compose-network
# hostname) — see docker-compose.yml and Review.md Retrofit.
EMAIL_BACKEND = _require("EMAIL_BACKEND")
SMTP_HOST = _require("SMTP_HOST")
SMTP_PORT = int(_require("SMTP_PORT"))
SMTP_FROM = _require("SMTP_FROM")

# --- Password hashing -------------------------------------------------------
# bcrypt cost factor: 2^12 iterations (OWASP-current). Trade-off documented in
# Review.md §Module 2. Fixed application constant (deliberate exception).
BCRYPT_ROUNDS = 12