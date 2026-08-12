"""Reusable authentication/authorization dependencies (Module 2, issue 2).

This is the ONLY place JWT decoding and role checks live. Any module can
protect a route by copy-pasting the pattern below:

    from fastapi import APIRouter, Depends
    from app.models import User
    from app.modules.auth.deps import require_role

    router = APIRouter(prefix="/things", tags=["things"])

    @router.get("")
    def list_things(
        _: User = Depends(require_role("User", "Officer", "Administrator")),
    ) -> dict:
        return {"things": []}

Authorization always checks the **live role from the database** (the `Role`
JWT claim is informational for clients). This means role changes take effect
immediately; the cost is one DB lookup per request — acceptable for Phase 1.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.models.enums import UserRole, UserStatus
from app.modules.auth.security import decode_access_token

# auto_error=False so WE control the status code: HTTPBearer's built-in
# missing-credentials error is 403, but the API contract requires 401 for
# missing tokens (Module 2 DoD).
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the bearer token to an Active user.

    401 — missing, malformed, expired, or unknown-user token.
    403 — account exists but is Suspended/Inactive.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError:
        raise unauthorized

    user_id = payload.get("UserID")
    if user_id is None:
        raise unauthorized
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        # Non-numeric UserID claim — treat as an invalid token, never 500.
        raise unauthorized

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )
    return user


def require_role(*roles: str | UserRole):
    """Dependency factory: allow only the given roles.

    Accepts role names or ``UserRole`` members:
        require_role("User", "Officer", "Administrator")
        require_role(UserRole.ADMINISTRATOR)
    """
    allowed = {r.value if isinstance(r, UserRole) else str(r) for r in roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency
