"""Administrator-only CRUD for User and Officer accounts."""

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.models.enums import UserRole, UserStatus
from app.modules.auth.admin_schemas import (
    AdminUserCreateRequest,
    AdminUserResponse,
    AdminUserUpdateRequest,
)
from app.modules.auth.admin_service import (
    create_user,
    deactivate_user,
    ensure_managed_role,
    get_managed_user,
    update_user,
)
from app.modules.auth.deps import require_role
from app.modules.notifications.service import notify_account_created

router = APIRouter(prefix="/admin/users", tags=["admin-users"])
admin_user = Depends(require_role(UserRole.ADMINISTRATOR))


@router.get("", response_model=list[AdminUserResponse])
def list_users(
    role: UserRole | None = None,
    status_filter: UserStatus | None = Query(default=None, alias="status"),
    _: User = admin_user,
    db: Session = Depends(get_db),
) -> list[User]:
    if role is not None:
        ensure_managed_role(role)
    query = select(User).where(User.role != UserRole.ADMINISTRATOR).order_by(User.id.desc())
    if role is not None:
        query = query.where(User.role == role)
    if status_filter is not None:
        query = query.where(User.status == status_filter)
    return list(db.scalars(query).all())


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    body: AdminUserCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    actor: User = admin_user,
    db: Session = Depends(get_db),
) -> User:
    user, password = create_user(db, body, actor, request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    background_tasks.add_task(notify_account_created, user.id, password)
    return user


@router.put("/{user_id}", response_model=AdminUserResponse)
def update_admin_user(
    user_id: int,
    body: AdminUserUpdateRequest,
    request: Request,
    actor: User = admin_user,
    db: Session = Depends(get_db),
) -> User:
    user = get_managed_user(db, user_id)
    update_user(db, user, body, actor, request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=AdminUserResponse)
def delete_admin_user(
    user_id: int,
    request: Request,
    actor: User = admin_user,
    db: Session = Depends(get_db),
) -> User:
    user = get_managed_user(db, user_id)
    deactivate_user(db, user, actor, request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return user