"""Auth module router — registration and login (Module 2, issue 1).

Module 2 scope only: no password reset, no email confirmation, no refresh
tokens (see `TRACE_Issues.md` Module 2). Admin user management (role changes,
suspend/activate) belongs to the Dashboard module in a later milestone.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.models.enums import UserRole, UserStatus
from app.modules.auth.deps import get_current_user, require_role
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.modules.auth.security import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new User account",
)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> User:
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )
    user = User(
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        student_number=body.student_number,
        email=email,
        phone_number=body.phone_number,
        password_hash=hash_password(body.password),
        # Self-registration always creates a plain User; assigning Officer /
        # Administrator roles is an Administrator action in a later milestone.
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a signed JWT access token",
)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = body.email.lower()
    user = db.scalar(select(User).where(User.email == email))
    # Uniform message for both unknown email and wrong password — the API
    # never reveals whether an email is registered (anti-enumeration).
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    # Active/Suspended/Inactive gating: only Active accounts may log in.
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )
    return TokenResponse(access_token=create_access_token(user), token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the signed-in user's own profile",
)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the caller's own account — the source for the frontend profile
    modal. Any active role may call it; the row is resolved from the token, so
    a caller can never read another user's profile through this route."""
    return current_user


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update the signed-in user's own personal details",
)
def update_me(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Self-service profile edit: first name, last name, email, phone number.

    An Administrator-managed field such as ``role`` is not part of the request
    schema and is rejected with 422, so this route can never escalate a role.
    """
    if body.first_name is not None:
        current_user.first_name = body.first_name.strip()
    if body.last_name is not None:
        current_user.last_name = body.last_name.strip()
    if body.email is not None:
        email = str(body.email).lower()
        duplicate = db.scalar(select(User).where(User.email == email, User.id != current_user.id))
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered",
            )
        current_user.email = email
    # `phone_number` is nullable: an explicit null clears it, an omitted field
    # leaves it untouched (which is why we check the fields the client sent).
    if "phone_number" in body.model_fields_set:
        current_user.phone_number = body.phone_number.strip() if body.phone_number else None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post(
    "/me/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change the signed-in user's own password",
)
def change_my_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Rotate the caller's password after verifying the current one.

    A wrong current password is a ``400`` (not ``401``): the bearer token is
    still valid, and the frontend treats ``401``/``403`` as an expired session
    that logs the user out.
    """
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.password_hash = hash_password(body.new_password)
    db.commit()


@router.get(
    "/test-protected",
    summary="THROWAWAY: admin-only test route proving 401/403 (remove later)",
)
def test_protected(
    current_user: User = Depends(require_role(UserRole.ADMINISTRATOR)),
) -> dict:
    """Proves the dependency stack: no token -> 401, wrong role -> 403,
    Administrator -> 200. Throwaway route; remove in a later milestone."""
    return {"message": "Administrator access granted", "user": current_user.email}
