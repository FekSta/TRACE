"""Items module internal helpers (Module 3).

The role-based scoping rules from `assets/diagrams/data-flow.md` live here so
every endpoint (CRUD + attachment upload) applies them identically:

- **User** sees/modifies only their own rows (`WHERE UserID = ?`).
- **Officer / Administrator** see and may modify *all* rows (unscoped).
- Cross-user access attempts return **404** (not 403) so the API never
  reveals whether another user's row exists.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, User
from app.models.enums import CategoryStatus, UserRole

_STAFF_ROLES = (UserRole.OFFICER, UserRole.ADMINISTRATOR)


def is_staff(user: User) -> bool:
    """Officer/Administrator see all rows; plain Users are scoped to their own."""
    return user.role in _STAFF_ROLES


def load_category_names(db: Session, category_ids: set[int]) -> dict[int, str]:
    """Batch-resolve ``category id -> name`` in one query.

    Categories are readable by every role, so this is not scope-sensitive —
    it exists so item responses can carry a human category label instead of a
    raw `category_id` (Notes.md §9.9).
    """
    if not category_ids:
        return {}
    rows = db.execute(
        select(Category.id, Category.category_name).where(Category.id.in_(category_ids))
    ).all()
    return {category_id: name for category_id, name in rows}


def load_reporter_names(db: Session, user_ids: set[int]) -> dict[int, str]:
    """Batch-resolve ``user id -> "First Last"`` in a single query.

    Slice A display enrichment for staff callers only. This lives in the Items
    module because Items owns the response it decorates — there is deliberately
    no shared cross-module user-directory helper, and no public ``GET /users``.
    """
    if not user_ids:
        return {}
    rows = db.execute(
        select(User.id, User.first_name, User.last_name).where(User.id.in_(user_ids))
    ).all()
    return {user_id: f"{first} {last}".strip() for user_id, first, last in rows}


def get_scoped(db: Session, model: type, item_id: int, user: User):
    """Fetch a row by id with ownership scoping; 404 for missing or out-of-scope."""
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )
    if not is_staff(user) and item.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )
    return item


def ensure_active_category(db: Session, category_id: int) -> Category:
    """Validate that a category exists and is not archived (400 otherwise)."""
    category = db.get(Category, category_id)
    if category is None or category.status != CategoryStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category does not exist or is not active",
        )
    return category
