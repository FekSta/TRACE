"""Password hashing and JWT helpers for the Auth module.

- **Passwords**: the `bcrypt` library directly (`$2b$` scheme). passlib is
  deliberately avoided — it is unmaintained and incompatible with bcrypt 5.x
  on Python 3.14 (see `Review.md` §Module 2). bcrypt only uses the first 72
  bytes of a password; the request schemas enforce `max_length=72`.
- **Tokens**: PyJWT, HS256, minimal claims (`sub`, `UserID`, `Role`, `iat`,
  `exp`) — see `Review.md` §Module 2 for the minimal-vs-rich trade-off.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt import InvalidTokenError

from app import config
from app.models import User

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "InvalidTokenError",
]


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt at the configured cost factor."""
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds=config.BCRYPT_ROUNDS)
    ).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Constant-time compare of a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), password_hash.encode("utf-8")
        )
    except ValueError:
        # Malformed stored hash — treat as a mismatch, never crash.
        return False


def create_access_token(user: User) -> str:
    """Sign a JWT for the user. Claims: sub, UserID, Role, iat, exp.

    `UserID` and `Role` are explicit claims (per Module 2 DoD). `Role` is
    informational for clients (e.g. frontend portal selection); authorization
    always re-checks the live role from the database (see `deps.py`).
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "UserID": user.id,
        "Role": user.role.value,
        "iat": now,
        "exp": now + timedelta(minutes=config.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT (signature + exp).

    Raises :class:`jwt.InvalidTokenError` on any failure — callers convert it
    to a 401 response.
    """
    return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
