"""Dashboard reporting service — read-only joins over the five core entities.

`GET /dashboard/reports` is deliberately **one** endpoint parameterised by
``type`` rather than four routes: `ABOUT.md` puts cross-entity reporting in the
Dashboard module. The service only joins, filters and sorts for display — it
never writes and contains no workflow logic (the guardrail in the task spec).

Invalid input is surfaced as ``400`` with a plain-language message, never a
silent fallback: an unknown ``type``, an unknown ``sort_by`` for the chosen
report, or a ``status`` value outside that report's enum all raise.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from fastapi import HTTPException, status as http_status
from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.models import Category, Claim, FoundItem, LostItem, User
from app.models.enums import (
    ClaimStatus,
    ClaimVerificationStatus,
    FoundItemStatus,
    LostItemStatus,
    UserRole,
    UserStatus,
)
from app.modules.dashboard.schemas import (
    ClaimReportRow,
    FoundItemReportRow,
    LostItemReportRow,
    ReportType,
    UserReportRow,
)

# Plain-language report names used in error messages.
REPORT_LABELS: dict[ReportType, str] = {
    ReportType.USERS: "users",
    ReportType.LOST_ITEMS: "lost items",
    ReportType.FOUND_ITEMS: "found items",
    ReportType.CLAIMS: "claims",
}

# The enum each report's `status` filter accepts (per the per-report tables).
STATUS_ENUMS: dict[ReportType, type] = {
    ReportType.USERS: UserStatus,
    ReportType.LOST_ITEMS: LostItemStatus,
    ReportType.FOUND_ITEMS: FoundItemStatus,
    ReportType.CLAIMS: ClaimStatus,
}

# Valid `sort_by` keys per report — mirrors the sort-field lists in Notes.md
# §15 / the task spec. Kept snake_case so the frontend radios map 1:1.
SORT_FIELDS: dict[ReportType, tuple[str, ...]] = {
    ReportType.USERS: ("registered", "role", "status", "last_name"),
    ReportType.LOST_ITEMS: ("date_lost", "status", "category", "title"),
    ReportType.FOUND_ITEMS: ("date_found", "status", "category", "title"),
    ReportType.CLAIMS: ("claim_date", "verification_status", "status", "officer"),
}

# Sensible default sort when the caller omits `sort_by` (most recent first).
DEFAULT_SORT: dict[ReportType, str] = {
    ReportType.USERS: "registered",
    ReportType.LOST_ITEMS: "date_lost",
    ReportType.FOUND_ITEMS: "date_found",
    ReportType.CLAIMS: "claim_date",
}


# ---------------------------------------------------------------------------
# Validation helpers — every failure is a clear 400, never a fallback
# ---------------------------------------------------------------------------


def _parse_report_type(value: str) -> ReportType:
    try:
        return ReportType(value)
    except ValueError:
        valid = ", ".join(t.value for t in ReportType)
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid report type {value!r}. Valid types: {valid}.",
        )


def _parse_status(report: ReportType, value: str) -> Any:
    enum_cls = STATUS_ENUMS[report]
    try:
        return enum_cls(value)
    except ValueError:
        valid = ", ".join(m.value for m in enum_cls)
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status {value!r} for the {REPORT_LABELS[report]} "
                f"report. Valid values: {valid}."
            ),
        )


def _parse_role(value: str) -> UserRole:
    try:
        return UserRole(value)
    except ValueError:
        valid = ", ".join(m.value for m in UserRole)
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role {value!r}. Valid values: {valid}.",
        )


def _parse_verification_status(value: str) -> ClaimVerificationStatus:
    try:
        return ClaimVerificationStatus(value)
    except ValueError:
        valid = ", ".join(m.value for m in ClaimVerificationStatus)
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid verification status {value!r}. "
                f"Valid values: {valid}."
            ),
        )


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------


def _fmt_date(value: date | datetime | None) -> str | None:
    """Render a DATE/TIMESTAMP as 'YYYY-MM-DD' (the one consistent format)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    return value.isoformat()


def _start_of_day(value: date) -> datetime:
    return datetime.combine(value, time.min)


def _end_of_day_exclusive(value: date) -> datetime:
    return datetime.combine(value, time.min) + timedelta(days=1)


def _order_clause(column: Any, sort_order: str, tiebreaker: Any) -> tuple[Any, Any]:
    ordered = column.desc() if sort_order == "desc" else column.asc()
    return ordered, tiebreaker.asc()


# ---------------------------------------------------------------------------
# Per-report builders — joins happen here, server-side
# ---------------------------------------------------------------------------


def _users_rows(
    db: Session,
    *,
    date_from: date | None,
    date_to: date | None,
    status_value: UserStatus | None,
    role: UserRole | None,
    sort_by: str,
    sort_order: str,
) -> list[dict[str, Any]]:
    query = select(User)
    if date_from is not None:
        query = query.where(User.created_at >= _start_of_day(date_from))
    if date_to is not None:
        query = query.where(User.created_at < _end_of_day_exclusive(date_to))
    if status_value is not None:
        query = query.where(User.status == status_value)
    if role is not None:
        query = query.where(User.role == role)

    columns = {
        "registered": User.created_at,
        "role": User.role,
        "status": User.status,
        "last_name": User.last_name,
    }
    query = query.order_by(*_order_clause(columns[sort_by], sort_order, User.id))

    return [
        UserReportRow(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            student_number=user.student_number,
            email=user.email,
            role=user.role.value,
            status=user.status.value,
            created_at=_fmt_date(user.created_at),
        ).model_dump()
        for user in db.scalars(query).all()
    ]


def _lost_rows(
    db: Session,
    *,
    date_from: date | None,
    date_to: date | None,
    status_value: LostItemStatus | None,
    category_id: int | None,
    user_id: int | None,
    sort_by: str,
    sort_order: str,
) -> list[dict[str, Any]]:
    query = (
        select(LostItem, Category.category_name, User.first_name, User.last_name)
        .join(Category, LostItem.category_id == Category.id)
        .join(User, LostItem.user_id == User.id)
    )
    if date_from is not None:
        query = query.where(LostItem.date_lost >= date_from)
    if date_to is not None:
        query = query.where(LostItem.date_lost <= date_to)
    if status_value is not None:
        query = query.where(LostItem.status == status_value)
    if category_id is not None:
        query = query.where(LostItem.category_id == category_id)
    if user_id is not None:
        query = query.where(LostItem.user_id == user_id)

    columns = {
        "date_lost": LostItem.date_lost,
        "status": LostItem.status,
        "category": Category.category_name,
        "title": LostItem.title,
    }
    query = query.order_by(*_order_clause(columns[sort_by], sort_order, LostItem.id))

    return [
        LostItemReportRow(
            id=item.id,
            item=item.title,
            category=category_name,
            reported_by=f"{first_name} {last_name}",
            date_lost=_fmt_date(item.date_lost),
            location=item.location_lost,
            status=item.status.value,
        ).model_dump()
        for item, category_name, first_name, last_name in db.execute(query).all()
    ]


def _found_rows(
    db: Session,
    *,
    date_from: date | None,
    date_to: date | None,
    status_value: FoundItemStatus | None,
    category_id: int | None,
    user_id: int | None,
    sort_by: str,
    sort_order: str,
) -> list[dict[str, Any]]:
    query = (
        select(FoundItem, Category.category_name, User.first_name, User.last_name)
        .join(Category, FoundItem.category_id == Category.id)
        .join(User, FoundItem.user_id == User.id)
    )
    if date_from is not None:
        query = query.where(FoundItem.date_found >= date_from)
    if date_to is not None:
        query = query.where(FoundItem.date_found <= date_to)
    if status_value is not None:
        query = query.where(FoundItem.status == status_value)
    if category_id is not None:
        query = query.where(FoundItem.category_id == category_id)
    if user_id is not None:
        query = query.where(FoundItem.user_id == user_id)

    columns = {
        "date_found": FoundItem.date_found,
        "status": FoundItem.status,
        "category": Category.category_name,
        "title": FoundItem.title,
    }
    query = query.order_by(*_order_clause(columns[sort_by], sort_order, FoundItem.id))

    return [
        FoundItemReportRow(
            id=item.id,
            item=item.title,
            category=category_name,
            found_by=f"{first_name} {last_name}",
            date_found=_fmt_date(item.date_found),
            storage_location=item.storage_location,
            status=item.status.value,
        ).model_dump()
        for item, category_name, first_name, last_name in db.execute(query).all()
    ]


def _claims_rows(
    db: Session,
    *,
    date_from: date | None,
    date_to: date | None,
    status_value: ClaimStatus | None,
    verification_status: ClaimVerificationStatus | None,
    officer_id: int | None,
    sort_by: str,
    sort_order: str,
) -> list[dict[str, Any]]:
    claimant = aliased(User)
    officer = aliased(User)
    query = (
        select(
            Claim,
            LostItem.title,
            FoundItem.title,
            claimant.first_name,
            claimant.last_name,
            officer.first_name,
            officer.last_name,
        )
        .join(LostItem, Claim.lost_item_id == LostItem.id)
        .join(FoundItem, Claim.found_item_id == FoundItem.id)
        .join(claimant, Claim.user_id == claimant.id)
        .outerjoin(officer, Claim.officer_id == officer.id)
    )
    if date_from is not None:
        query = query.where(Claim.claim_date >= _start_of_day(date_from))
    if date_to is not None:
        query = query.where(Claim.claim_date < _end_of_day_exclusive(date_to))
    if status_value is not None:
        query = query.where(Claim.status == status_value)
    if verification_status is not None:
        query = query.where(Claim.verification_status == verification_status)
    if officer_id is not None:
        query = query.where(Claim.officer_id == officer_id)

    columns = {
        "claim_date": Claim.claim_date,
        "verification_status": Claim.verification_status,
        "status": Claim.status,
        "officer": officer.last_name,
    }
    query = query.order_by(*_order_clause(columns[sort_by], sort_order, Claim.id))

    rows: list[dict[str, Any]] = []
    for (
        claim,
        lost_title,
        found_title,
        claimant_first,
        claimant_last,
        officer_first,
        officer_last,
    ) in db.execute(query).all():
        officer_name = (
            f"{officer_first} {officer_last}" if officer_first is not None else None
        )
        rows.append(
            ClaimReportRow(
                id=claim.id,
                lost_item=lost_title,
                found_item=found_title,
                claimant=f"{claimant_first} {claimant_last}",
                officer=officer_name,
                claim_date=_fmt_date(claim.claim_date),
                verification_status=claim.verification_status.value,
                status=claim.status.value,
                collected=_fmt_date(claim.collection_date),
            ).model_dump()
        )
    return rows


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def generate_report(
    db: Session,
    *,
    report_type: str,
    date_from: date | None,
    date_to: date | None,
    status_value: str | None,
    category_id: int | None,
    role: str | None,
    user_id: int | None,
    officer_id: int | None,
    verification_status: str | None,
    sort_by: str | None,
    sort_order: str,
) -> tuple[ReportType, list[dict[str, Any]]]:
    """Validate the query, generate the report, return (type, row dicts).

    Filters are applied only for the report type they belong to; validation of
    a supplied value always happens, so a bad ``status``/``role``/
    ``verification_status`` is a 400 even if that report ignores the field.
    """
    report = _parse_report_type(report_type)

    if sort_order not in ("asc", "desc"):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_order {sort_order!r}. Use 'asc' or 'desc'.",
        )

    resolved_sort = sort_by or DEFAULT_SORT[report]
    if resolved_sort not in SORT_FIELDS[report]:
        valid = ", ".join(SORT_FIELDS[report])
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid sort_by {resolved_sort!r} for the "
                f"{REPORT_LABELS[report]} report. Valid fields: {valid}."
            ),
        )

    parsed_status = _parse_status(report, status_value) if status_value is not None else None
    parsed_role = (
        _parse_role(role) if report is ReportType.USERS and role is not None else None
    )
    parsed_verification = (
        _parse_verification_status(verification_status)
        if report is ReportType.CLAIMS and verification_status is not None
        else None
    )

    if report is ReportType.USERS:
        rows = _users_rows(
            db,
            date_from=date_from,
            date_to=date_to,
            status_value=parsed_status,  # type: ignore[arg-type]
            role=parsed_role,
            sort_by=resolved_sort,
            sort_order=sort_order,
        )
    elif report is ReportType.LOST_ITEMS:
        rows = _lost_rows(
            db,
            date_from=date_from,
            date_to=date_to,
            status_value=parsed_status,  # type: ignore[arg-type]
            category_id=category_id,
            user_id=user_id,
            sort_by=resolved_sort,
            sort_order=sort_order,
        )
    elif report is ReportType.FOUND_ITEMS:
        rows = _found_rows(
            db,
            date_from=date_from,
            date_to=date_to,
            status_value=parsed_status,  # type: ignore[arg-type]
            category_id=category_id,
            user_id=user_id,
            sort_by=resolved_sort,
            sort_order=sort_order,
        )
    else:
        rows = _claims_rows(
            db,
            date_from=date_from,
            date_to=date_to,
            status_value=parsed_status,  # type: ignore[arg-type]
            verification_status=parsed_verification,
            officer_id=officer_id,
            sort_by=resolved_sort,
            sort_order=sort_order,
        )

    return report, rows
