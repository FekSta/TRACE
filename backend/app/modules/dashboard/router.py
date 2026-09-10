"""Dashboard module router — Administrator reporting.

One route, ``GET /dashboard/reports``, parameterised by ``type`` (per
`ABOUT.md`, the Dashboard module owns cross-entity reporting). Administrator
only via ``require_role("Administrator")``; the same dependency stack as every
other module, so `User`/`Officer` tokens get ``403`` and missing tokens ``401``.

Read-only: joins every other module's tables for display, never writes.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.modules.auth.deps import require_role
from app.modules.dashboard.schemas import ReportResponse
from app.modules.dashboard.service import generate_report

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/reports",
    response_model=ReportResponse,
    summary="Generate an on-demand Administrator report",
)
def get_reports(
    report_type: str = Query(
        ...,
        alias="type",
        description="users | lost_items | found_items | claims",
    ),
    date_from: date | None = Query(
        None, description="Inclusive YYYY-MM-DD lower bound on the report's date field"
    ),
    date_to: date | None = Query(
        None, description="Inclusive YYYY-MM-DD upper bound on the report's date field"
    ),
    status_value: str | None = Query(
        None, alias="status", description="Report-specific status enum value"
    ),
    category_id: int | None = Query(None, description="lost_items / found_items only"),
    role: str | None = Query(
        None, description="users only — User | Officer | Administrator"
    ),
    user_id: int | None = Query(
        None, description="lost_items / found_items only — reporting user"
    ),
    officer_id: int | None = Query(None, description="claims only — reviewing officer"),
    verification_status: str | None = Query(
        None, description="claims only — Pending | Approved | Rejected"
    ),
    sort_by: str | None = Query(None, description="Report-specific sort field key"),
    sort_order: str = Query("desc", description="asc | desc"),
    _: User = Depends(require_role("Administrator")),
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Generate a filtered, sorted report on demand.

    Errors: ``401`` no/invalid token, ``403`` non-Administrator caller,
    ``400`` invalid ``type`` / ``sort_by`` / ``status`` etc. (clear message,
    never a silent fallback), ``422`` malformed query value (e.g. bad date).
    """
    report, rows = generate_report(
        db,
        report_type=report_type,
        date_from=date_from,
        date_to=date_to,
        status_value=status_value,
        category_id=category_id,
        role=role,
        user_id=user_id,
        officer_id=officer_id,
        verification_status=verification_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return ReportResponse(
        report_type=report,
        generated_at=datetime.now(timezone.utc),
        count=len(rows),
        rows=rows,
    )
