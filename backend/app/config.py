"""Application configuration — read from the repo-root `.env` (gitignored).

Phase 1 local-only. `load_dotenv(..., override=True)` makes the committed
`.env` file win over any stale values already exported in the shell, so the
backend always runs against the intended local configuration (see `Review.md`
for the Milestone-1 stale-`DATABASE_URL` note).
"""

import os

from dotenv import find_dotenv, load_dotenv

# Walk up from this file's directory to locate the repo-root `.env`.
load_dotenv(find_dotenv(), override=True)


def _get(name: str, default: str) -> str:
    return os.environ.get(name, default)


# --- Database ---------------------------------------------------------------
DATABASE_URL = _get(
    "DATABASE_URL",
    "postgresql+psycopg://trace:trace_local_password@localhost:5432/trace",
)

# --- Authentication (JWT) ---------------------------------------------------
# JWT_SECRET comes from .env — never hardcoded, never committed.
JWT_SECRET = _get("JWT_SECRET", "change-this-development-secret")
JWT_ALGORITHM = _get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(_get("JWT_EXPIRE_MINUTES", "60"))

# --- Password hashing -------------------------------------------------------
# bcrypt cost factor: 2^12 iterations (OWASP-current). Trade-off documented in
# Review.md §Module 2.
BCRYPT_ROUNDS = 12
