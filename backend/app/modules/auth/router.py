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
from app.modules.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.modules.auth.security import create_access_token, hash_password, verify_password

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
