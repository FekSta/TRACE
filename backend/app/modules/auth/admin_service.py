"""Administrator-only User account operations owned by Auth."""

import secrets
import string

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, User
from app.models.enums import UserRole
from app.modules.auth.admin_schemas import AdminUserCreateRequest, AdminUserUpdateRequest
from app.modules.auth.security import hash_password

MANAGED_ROLES = {UserRole.USER, UserRole.OFFICER}


def audit(db: Session, actor: User, action: str, entity_id: int, ip_address: str | None) -> None:
    db.add(
        AuditLog(
            user_id=actor.id,
            action=action,
            entity_name="User",
            entity_id=entity_id,
            ip_address=ip_address,
        )
    )


def ensure_managed_role(role: UserRole) -> None:
    if role not in MANAGED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only User and Officer accounts can be managed here",
        )


def get_managed_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator accounts cannot be managed here")
    return user


def temporary_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(14))


def create_user(
    db: Session,
    body: AdminUserCreateRequest,
    actor: User,
    ip_address: str | None,
) -> tuple[User, str]:
    ensure_managed_role(body.role)
    email = str(body.email).lower()
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    password = body.password or temporary_password()
    user = User(
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        student_number=body.student_number,
        email=email,
        phone_number=body.phone_number,
        password_hash=hash_password(password),
        role=body.role,
        status=body.status,
    )
    db.add(user)
    db.flush()
    audit(db, actor, "UserCreated", user.id, ip_address)
    return user, password


def update_user(
    db: Session,
    user: User,
    body: AdminUserUpdateRequest,
    actor: User,
    ip_address: str | None,
) -> User:
    if body.role is not None:
        ensure_managed_role(body.role)
    if body.email is not None:
        email = str(body.email).lower()
        duplicate = db.scalar(select(User).where(User.email == email, User.id != user.id))
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        user.email = email
    for field in ("first_name", "last_name", "student_number", "phone_number", "role", "status"):
        value = getattr(body, field)
        if value is not None:
            setattr(user, field, value.strip() if isinstance(value, str) and field in {"first_name", "last_name"} else value)
    audit(db, actor, "UserUpdated", user.id, ip_address)
    return user


def deactivate_user(db: Session, user: User, actor: User, ip_address: str | None) -> User:
    user.status = user.status.__class__.INACTIVE
    audit(db, actor, "UserDeleted", user.id, ip_address)
    return user