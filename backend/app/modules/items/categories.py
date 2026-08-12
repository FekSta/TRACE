"""Category CRUD (Module 3, issue 1).

Per `assets/diagrams/data-flow.md` — "Maintain Categories" is an
Administrator capability (view/add/update/delete). Any authenticated role may
*view* active categories, because Users need the picker when reporting items.

`DELETE` is implemented as an **archive** (Status → `Archived`), not a hard
delete: `Entities.md` gives `Category.Status` the value `Archived`, and items
hold FKs to categories. See `Review.md` §Module 3 for the justification.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Category, User
from app.models.enums import CategoryStatus, UserRole
from app.modules.auth.deps import get_current_user, require_role
from app.modules.items.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["items"])

_ADMIN_ONLY = require_role(UserRole.ADMINISTRATOR)


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Category]:
    """List categories (active by default; archived only for Administrators)."""
    if include_archived and current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view archived categories",
        )
    q = select(Category).order_by(Category.display_order.asc(), Category.id.asc())
    if not include_archived:
        q = q.where(Category.status == CategoryStatus.ACTIVE)
    return list(db.scalars(q).all())


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryCreate,
    _: User = Depends(_ADMIN_ONLY),
    db: Session = Depends(get_db),
) -> Category:
    """Add a category (Administrator only)."""
    name = body.category_name.strip()
    if db.scalar(select(Category).where(Category.category_name == name)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Category name already exists"
        )
    category = Category(
        category_name=name,
        description=body.description,
        icon=body.icon,
        display_order=body.display_order,
        status=CategoryStatus.ACTIVE,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    body: CategoryUpdate,
    _: User = Depends(_ADMIN_ONLY),
    db: Session = Depends(get_db),
) -> Category:
    """Update a category (Administrator only)."""
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    data = body.model_dump(exclude_unset=True)
    new_name = (data.get("category_name") or "").strip()
    if new_name and new_name != category.category_name:
        if (
            db.scalar(select(Category).where(Category.category_name == new_name))
            is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Category name already exists",
            )
    for field, value in data.items():
        setattr(category, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", response_model=CategoryResponse)
def delete_category(
    category_id: int,
    _: User = Depends(_ADMIN_ONLY),
    db: Session = Depends(get_db),
) -> Category:
    """Archive a category (Administrator only) — soft delete, not a hard drop."""
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    category.status = CategoryStatus.ARCHIVED
    db.commit()
    db.refresh(category)
    return category
