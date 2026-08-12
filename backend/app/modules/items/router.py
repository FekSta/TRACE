"""Items module router aggregate — exposes Category and Lost/Found CRUD.

Module 3 scope: Item Management only. Matching (Module 4), Claims (Module 5),
and Notifications (Module 6) are separate modules.
"""

from fastapi import APIRouter

from app.modules.items.categories import router as categories_router
from app.modules.items.lost_found import router as lost_found_router

router = APIRouter()
router.include_router(categories_router)
router.include_router(lost_found_router)
