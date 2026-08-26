"""LostItem / FoundItem CRUD (Module 3, issue 1).

Scoping (per `assets/diagrams/data-flow.md`) is a role branch **inside each
endpoint**: plain `User`s get `WHERE UserID = ?` filters, while
Officer/Administrator requests are unscoped — there is no separate route tree
per role.

Status transitions: new items start at the first value of their `Entities.md`
enum (`Reported` for LostItem, `Available` for FoundItem). Updates accept any
valid enum value for now; the matching/claims milestones will introduce real
transition rules.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import FoundItem, LostItem, User
from app.models.enums import FoundItemStatus, LostItemStatus
from app.modules.auth.deps import get_current_user
# Module 4: matching runs in a BackgroundTask after the response is sent, so
# item creation never blocks on the scoring pass (see matching/service.py).
from app.modules.matching.service import (
    run_matching_for_found_item,
    run_matching_for_lost_item,
)
from app.modules.items.schemas import (
    FoundItemCreate,
    FoundItemResponse,
    FoundItemUpdate,
    LostItemCreate,
    LostItemResponse,
    LostItemUpdate,
)
from app.modules.items.service import (
    ensure_active_category,
    get_scoped,
    is_staff,
)

router = APIRouter(tags=["items"])


# --- LostItem ---------------------------------------------------------------

@router.post(
    "/items/lost",
    response_model=LostItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lost_item(
    body: LostItemCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LostItem:
    """Report a lost item (any authenticated role; owner is the caller).

    Matching against `Available` FoundItems runs in a BackgroundTask *after*
    this response is sent (Module 4) — creation never blocks on scoring.
    """
    ensure_active_category(db, body.category_id)
    item = LostItem(
        user_id=current_user.id,
        **body.model_dump(),
        status=LostItemStatus.REPORTED,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    background_tasks.add_task(run_matching_for_lost_item, item.id)
    return item


@router.get("/items/lost", response_model=list[LostItemResponse])
def list_lost_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LostItem]:
    """List lost items — Users see only their own; Officer/Admin see all."""
    q = select(LostItem).order_by(LostItem.id.desc())
    if not is_staff(current_user):
        q = q.where(LostItem.user_id == current_user.id)
    return list(db.scalars(q).all())


@router.get("/items/lost/{item_id}", response_model=LostItemResponse)
def get_lost_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LostItem:
    """Get one lost item — 404 for cross-user access attempts."""
    return get_scoped(db, LostItem, item_id, current_user)


@router.patch("/items/lost/{item_id}", response_model=LostItemResponse)
def update_lost_item(
    item_id: int,
    body: LostItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LostItem:
    """Update a lost item (owner, or Officer/Admin for any item)."""
    item = get_scoped(db, LostItem, item_id, current_user)
    data = body.model_dump(exclude_unset=True)
    # Explicit nulls are never applied (NOT NULL columns must not receive null).
    data = {k: v for k, v in data.items() if v is not None}
    if "category_id" in data:
        ensure_active_category(db, data["category_id"])
    for field, value in data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/lost/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lost_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a lost item (owner, or Officer/Admin for any item)."""
    item = get_scoped(db, LostItem, item_id, current_user)
    db.delete(item)
    db.commit()


# --- FoundItem --------------------------------------------------------------

@router.post(
    "/items/found",
    response_model=FoundItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_found_item(
    body: FoundItemCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FoundItem:
    """Register a found item (any authenticated role; owner is the caller).

    Matching against `Reported` LostItems runs in a BackgroundTask *after*
    this response is sent (Module 4) — creation never blocks on scoring.
    """
    ensure_active_category(db, body.category_id)
    item = FoundItem(
        user_id=current_user.id,
        **body.model_dump(),
        status=FoundItemStatus.AVAILABLE,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    background_tasks.add_task(run_matching_for_found_item, item.id)
    return item


@router.get("/items/found", response_model=list[FoundItemResponse])
def list_found_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FoundItem]:
    """List found items — Users see only their own; Officer/Admin see all."""
    q = select(FoundItem).order_by(FoundItem.id.desc())
    if not is_staff(current_user):
        q = q.where(FoundItem.user_id == current_user.id)
    return list(db.scalars(q).all())


@router.get("/items/found/{item_id}", response_model=FoundItemResponse)
def get_found_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FoundItem:
    """Get one found item — 404 for cross-user access attempts."""
    return get_scoped(db, FoundItem, item_id, current_user)


@router.patch("/items/found/{item_id}", response_model=FoundItemResponse)
def update_found_item(
    item_id: int,
    body: FoundItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FoundItem:
    """Update a found item (owner, or Officer/Admin for any item)."""
    item = get_scoped(db, FoundItem, item_id, current_user)
    data = body.model_dump(exclude_unset=True)
    # Explicit nulls are never applied (NOT NULL columns must not receive null).
    data = {k: v for k, v in data.items() if v is not None}
    if "category_id" in data:
        ensure_active_category(db, data["category_id"])
    for field, value in data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/found/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_found_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a found item (owner, or Officer/Admin for any item)."""
    item = get_scoped(db, FoundItem, item_id, current_user)
    db.delete(item)
    db.commit()
