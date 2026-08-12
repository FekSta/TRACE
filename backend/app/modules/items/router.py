"""Items module router — Module 3 stub (Module 2, issue 2).

This single protected route exists ONLY to prove that the Auth module's
``require_role`` dependency works outside the Auth module. Item Management
itself (Category/LostItem/FoundItem CRUD) is Module 3 and will replace this
stub.
"""

from fastapi import APIRouter, Depends

from app.models import User
from app.modules.auth.deps import require_role

router = APIRouter(prefix="/items", tags=["items"])


@router.get(
    "/lost",
    summary="Stub: list lost items (replaced by real CRUD in Module 3)",
)
def list_lost_items_stub(
    current_user: User = Depends(require_role("User", "Officer", "Administrator")),
) -> dict:
    return {"items": [], "stub": True, "requested_by": current_user.email}
