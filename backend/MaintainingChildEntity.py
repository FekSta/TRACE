"""CRUD examples for every TRACE database table.

This module is intentionally limited to CRUD operations.  The ORM functions
use the existing SQLAlchemy models; the raw SQL functions execute parameterized
SQL and accept only the table and column names listed in ``TABLE_COLUMNS``.

Example::

    with SessionLocal() as session:
        user = create(session, User, {"first_name": "Ada", ...})
        user = read(session, User, user.id)
        update(session, User, user.id, {"last_name": "Lovelace"})
        delete(session, User, user.id)

    with engine.begin() as connection:
        row = sql_read(connection, "users", 1)
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import delete as orm_delete
from sqlalchemy import select, text, update as orm_update
from sqlalchemy.engine import Connection, RowMapping
from sqlalchemy.orm import Session, aliased

from app.db import SessionLocal, engine
from app.models.attachment import Attachment
from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.claim import Claim
from app.models.collection_record import CollectionRecord
from app.models.found_item import FoundItem
from app.models.lost_item import LostItem
from app.models.match import Match
from app.models.notification import Notification
from app.models.user import User
from app.models.verification_record import VerificationRecord
from app.models.enums import (
    ClaimStatus,
    ClaimVerificationStatus,
    FoundItemStatus,
    LostItemStatus,
    UserRole,
    UserStatus,
)


# The complete set of application tables.  Foreign keys should be created in
# dependency order: users/categories, then items, then child/supporting rows.
CRUD_MODELS = (
    User,
    Category,
    LostItem,
    FoundItem,
    Claim,
    Match,
    Notification,
    VerificationRecord,
    CollectionRecord,
    Attachment,
    AuditLog,
)


# Explicit allowlists make dynamic SQL identifiers safe.  Values are always
# sent separately as bound parameters.
TABLE_COLUMNS: dict[str, tuple[str, ...]] = {
    "users": ("first_name", "last_name", "student_number", "email", "phone_number", "password_hash", "role", "status"),
    "categories": ("category_name", "description", "icon", "display_order", "status"),
    "lost_items": ("user_id", "category_id", "title", "description", "brand", "colour", "date_lost", "location_lost", "status"),
    "found_items": ("user_id", "category_id", "title", "description", "brand", "colour", "date_found", "storage_location", "status"),
    "claims": ("lost_item_id", "found_item_id", "user_id", "verification_status", "officer_id", "verification_notes", "collection_date", "status"),
    "matches": ("lost_item_id", "found_item_id", "match_score", "match_reason", "status"),
    "notifications": ("user_id", "title", "message", "notification_type", "is_read"),
    "verification_records": ("claim_id", "officer_id", "verification_method", "result", "notes"),
    "collection_records": ("claim_id", "collected_by", "officer_id", "recipient_signature", "remarks"),
    "attachments": ("file_name", "file_path", "file_type", "uploaded_by", "related_entity", "entity_id"),
    "audit_logs": ("user_id", "action", "entity_name", "entity_id", "ip_address"),
}


ADMIN_REPORT_SORTS: dict[str, tuple[str, ...]] = {
    "users": ("registered", "role", "status", "last_name"),
    "lost_items": ("date_lost", "status", "category", "title"),
    "found_items": ("date_found", "status", "category", "title"),
    "claims": ("claim_date", "verification_status", "status", "officer"),
}

ADMIN_REPORT_DEFAULT_SORT = {
    "users": "registered",
    "lost_items": "date_lost",
    "found_items": "date_found",
    "claims": "claim_date",
}


def _report_date(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    return value.date().isoformat() if isinstance(value, datetime) else value.isoformat()


def _report_sort(report_type: str, sort_by: str | None, sort_order: str) -> str:
    if report_type not in ADMIN_REPORT_SORTS:
        raise ValueError(f"Unknown report type: {report_type}")
    if sort_order not in ("asc", "desc"):
        raise ValueError("sort_order must be 'asc' or 'desc'")
    resolved = sort_by or ADMIN_REPORT_DEFAULT_SORT[report_type]
    if resolved not in ADMIN_REPORT_SORTS[report_type]:
        raise ValueError(
            f"Invalid sort_by {resolved!r} for {report_type}; "
            f"use one of {ADMIN_REPORT_SORTS[report_type]}"
        )
    return resolved


def admin_report_python(
    session: Session,
    report_type: str,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    category_id: int | None = None,
    role: str | None = None,
    user_id: int | None = None,
    officer_id: int | None = None,
    verification_status: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "desc",
) -> dict[str, Any]:
    """Generate the administrator report with SQLAlchemy query objects."""
    resolved_sort = _report_sort(report_type, sort_by, sort_order)
    descending = sort_order == "desc"

    if report_type == "users":
        query = select(User)
        if date_from:
            query = query.where(User.created_at >= datetime.combine(date_from, time.min))
        if date_to:
            query = query.where(User.created_at < datetime.combine(date_to + timedelta(days=1), time.min))
        if status:
            query = query.where(User.status == UserStatus(status))
        if role:
            query = query.where(User.role == UserRole(role))
        sort_columns = {
            "registered": User.created_at,
            "role": User.role,
            "status": User.status,
            "last_name": User.last_name,
        }
        sort_column = sort_columns[resolved_sort]
        query = query.order_by(sort_column.desc() if descending else sort_column.asc(), User.id.asc())
        rows = [
            {
                "id": item.id,
                "first_name": item.first_name,
                "last_name": item.last_name,
                "student_number": item.student_number,
                "email": item.email,
                "role": item.role.value,
                "status": item.status.value,
                "created_at": _report_date(item.created_at),
            }
            for item in session.scalars(query)
        ]
    elif report_type in ("lost_items", "found_items"):
        model: Any = LostItem if report_type == "lost_items" else FoundItem
        date_column: Any = model.date_lost if report_type == "lost_items" else model.date_found
        query = (
            select(model, Category.category_name, User.first_name, User.last_name)
            .join(Category, model.category_id == Category.id)
            .join(User, model.user_id == User.id)
        )
        if date_from:
            query = query.where(date_column >= date_from)
        if date_to:
            query = query.where(date_column <= date_to)
        if status:
            query = query.where(model.status == (LostItemStatus(status) if report_type == "lost_items" else FoundItemStatus(status)))
        if category_id is not None:
            query = query.where(model.category_id == category_id)
        if user_id is not None:
            query = query.where(model.user_id == user_id)
        sort_columns = {
            "date_lost": date_column,
            "date_found": date_column,
            "status": model.status,
            "category": Category.category_name,
            "title": model.title,
        }
        sort_column = sort_columns[resolved_sort]
        query = query.order_by(sort_column.desc() if descending else sort_column.asc(), model.id.asc())
        rows = []
        for item, category, first_name, last_name in session.execute(query):
            row = {
                "id": item.id,
                "item": item.title,
                "category": category,
                "date_lost" if report_type == "lost_items" else "date_found": _report_date(item.date_lost if report_type == "lost_items" else item.date_found),
                "status": item.status.value,
            }
            row["reported_by" if report_type == "lost_items" else "found_by"] = f"{first_name} {last_name}"
            row["location" if report_type == "lost_items" else "storage_location"] = item.location_lost if report_type == "lost_items" else item.storage_location
            rows.append(row)
    else:
        if report_type != "claims":
            raise ValueError(f"Unknown report type: {report_type}")
        claimant = aliased(User)
        officer = aliased(User)
        query = (
            select(Claim, LostItem.title, FoundItem.title, claimant.first_name, claimant.last_name, officer.first_name, officer.last_name)
            .join(LostItem, Claim.lost_item_id == LostItem.id)
            .join(FoundItem, Claim.found_item_id == FoundItem.id)
            .join(claimant, Claim.user_id == claimant.id)
            .outerjoin(officer, Claim.officer_id == officer.id)
        )
        if date_from:
            query = query.where(Claim.claim_date >= datetime.combine(date_from, time.min))
        if date_to:
            query = query.where(Claim.claim_date < datetime.combine(date_to + timedelta(days=1), time.min))
        if status:
            query = query.where(Claim.status == ClaimStatus(status))
        if verification_status:
            query = query.where(Claim.verification_status == ClaimVerificationStatus(verification_status))
        if officer_id is not None:
            query = query.where(Claim.officer_id == officer_id)
        sort_columns = {
            "claim_date": Claim.claim_date,
            "verification_status": Claim.verification_status,
            "status": Claim.status,
            "officer": officer.last_name,
        }
        sort_column = sort_columns[resolved_sort]
        query = query.order_by(sort_column.desc() if descending else sort_column.asc(), Claim.id.asc())
        rows = []
        for claim, lost_title, found_title, claimant_first, claimant_last, officer_first, officer_last in session.execute(query):
            rows.append({
                "id": claim.id,
                "lost_item": lost_title,
                "found_item": found_title,
                "claimant": f"{claimant_first} {claimant_last}",
                "officer": f"{officer_first} {officer_last}" if officer_first else None,
                "claim_date": _report_date(claim.claim_date),
                "verification_status": claim.verification_status.value,
                "status": claim.status.value,
                "collected": _report_date(claim.collection_date),
            })

    return {"report_type": report_type, "count": len(rows), "rows": rows}


def admin_report_sql(
    connection: Connection,
    report_type: str,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    category_id: int | None = None,
    role: str | None = None,
    user_id: int | None = None,
    officer_id: int | None = None,
    verification_status: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "desc",
) -> dict[str, Any]:
    """Generate the administrator report with pure, parameterized SQL."""
    resolved_sort = _report_sort(report_type, sort_by, sort_order)
    direction = "DESC" if sort_order == "desc" else "ASC"
    parameters: dict[str, Any] = {}
    conditions: list[str] = []

    if report_type == "users":
        select_sql = """
            SELECT id, first_name, last_name, student_number, email,
                   role, status, created_at
            FROM users AS u
        """
        sort_columns = {
            "registered": "created_at",
            "role": "role",
            "status": "status",
            "last_name": "last_name",
        }
        if date_from:
            conditions.append("created_at >= :date_from")
            parameters["date_from"] = datetime.combine(date_from, time.min)
        if date_to:
            conditions.append("created_at < :date_to_exclusive")
            parameters["date_to_exclusive"] = datetime.combine(date_to + timedelta(days=1), time.min)
        if status:
            conditions.append("status = :status")
            parameters["status"] = status
        if role:
            conditions.append("role = :role")
            parameters["role"] = role
    elif report_type in ("lost_items", "found_items"):
        table = "lost_items" if report_type == "lost_items" else "found_items"
        item_date = "date_lost" if report_type == "lost_items" else "date_found"
        person_label = "reported_by" if report_type == "lost_items" else "found_by"
        location_label = "location" if report_type == "lost_items" else "storage_location"
        location_column = "location_lost" if report_type == "lost_items" else "storage_location"
        select_sql = f"""
            SELECT i.id, i.title AS item, c.category_name AS category,
                   u.first_name || ' ' || u.last_name AS {person_label},
                   i.{item_date}, i.{location_column} AS {location_label}, i.status
            FROM {table} AS i
            JOIN categories AS c ON c.id = i.category_id
            JOIN users AS u ON u.id = i.user_id
        """
        sort_columns = {
            item_date: f"i.{item_date}",
            "status": "i.status",
            "category": "c.category_name",
            "title": "i.title",
        }
        if date_from:
            conditions.append(f"i.{item_date} >= :date_from")
            parameters["date_from"] = date_from
        if date_to:
            conditions.append(f"i.{item_date} <= :date_to")
            parameters["date_to"] = date_to
        if status:
            conditions.append("i.status = :status")
            parameters["status"] = status
        if category_id is not None:
            conditions.append("i.category_id = :category_id")
            parameters["category_id"] = category_id
        if user_id is not None:
            conditions.append("i.user_id = :user_id")
            parameters["user_id"] = user_id
    elif report_type == "claims":
        select_sql = """
            SELECT cl.id, li.title AS lost_item, fi.title AS found_item,
                   claimant.first_name || ' ' || claimant.last_name AS claimant,
                   officer.first_name || ' ' || officer.last_name AS officer,
                   cl.claim_date, cl.verification_status, cl.status,
                   cl.collection_date AS collected
            FROM claims AS cl
            JOIN lost_items AS li ON li.id = cl.lost_item_id
            JOIN found_items AS fi ON fi.id = cl.found_item_id
            JOIN users AS claimant ON claimant.id = cl.user_id
            LEFT JOIN users AS officer ON officer.id = cl.officer_id
        """
        sort_columns = {
            "claim_date": "cl.claim_date",
            "verification_status": "cl.verification_status",
            "status": "cl.status",
            "officer": "officer.last_name",
        }
        if date_from:
            conditions.append("cl.claim_date >= :date_from")
            parameters["date_from"] = datetime.combine(date_from, time.min)
        if date_to:
            conditions.append("cl.claim_date < :date_to_exclusive")
            parameters["date_to_exclusive"] = datetime.combine(date_to + timedelta(days=1), time.min)
        if status:
            conditions.append("cl.status = :status")
            parameters["status"] = status
        if verification_status:
            conditions.append("cl.verification_status = :verification_status")
            parameters["verification_status"] = verification_status
        if officer_id is not None:
            conditions.append("cl.officer_id = :officer_id")
            parameters["officer_id"] = officer_id
    else:
        raise ValueError(f"Unknown report type: {report_type}")

    where_sql = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    tie_breaker = "u.id" if report_type == "users" else (
        "i.id" if report_type in ("lost_items", "found_items") else "cl.id"
    )
    order_sql = f" ORDER BY {sort_columns[resolved_sort]} {direction}, {tie_breaker} ASC"
    result = connection.execute(text(select_sql + where_sql + order_sql), parameters)
    rows = [dict(row) for row in result.mappings()]
    for row in rows:
        for key in ("created_at", "date_lost", "date_found", "claim_date", "collected"):
            if key in row:
                row[key] = _report_date(row[key])
    return {"report_type": report_type, "count": len(rows), "rows": rows}


def create(session: Session, model: type[Any], values: Mapping[str, Any]) -> Any:
    """Create one row with the SQLAlchemy model and return it."""
    record = model(**dict(values))
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def read(session: Session, model: type[Any], record_id: int) -> Any | None:
    """Read one row by primary key."""
    return session.get(model, record_id)


def list_all(session: Session, model: type[Any]) -> list[Any]:
    """Read every row for one model."""
    return list(session.scalars(select(model)))


def update(session: Session, model: type[Any], record_id: int, values: Mapping[str, Any]) -> Any | None:
    """Update one row by primary key and return the refreshed row."""
    session.execute(
        orm_update(model).where(model.id == record_id).values(**dict(values))
    )
    session.commit()
    return read(session, model, record_id)


def delete(session: Session, model: type[Any], record_id: int) -> bool:
    """Delete one row by primary key and report whether it existed."""
    result = session.execute(orm_delete(model).where(model.id == record_id))
    session.commit()
    return getattr(result, "rowcount", 0) == 1


def _columns(table: str, values: Mapping[str, Any]) -> tuple[str, ...]:
    allowed = TABLE_COLUMNS[table]
    unknown = set(values) - set(allowed)
    if unknown:
        raise ValueError(f"Unknown columns for {table}: {sorted(unknown)}")
    if not values:
        raise ValueError("At least one column value is required")
    return tuple(values)


def sql_create(connection: Connection, table: str, values: Mapping[str, Any]) -> RowMapping:
    """Create one row with pure parameterized SQL and return the new row."""
    columns = _columns(table, values)
    names = ", ".join(columns)
    parameters = ", ".join(f":{column}" for column in columns)
    statement = text(
        f"INSERT INTO {table} ({names}) VALUES ({parameters}) RETURNING *"
    )
    return connection.execute(statement, dict(values)).mappings().one()


def sql_read(connection: Connection, table: str, record_id: int) -> RowMapping | None:
    """Read one row with pure parameterized SQL."""
    _columns(table, {TABLE_COLUMNS[table][0]: None})
    return connection.execute(
        text(f"SELECT * FROM {table} WHERE id = :record_id"),
        {"record_id": record_id},
    ).mappings().one_or_none()


def sql_list(connection: Connection, table: str) -> list[RowMapping]:
    """Read every row from one allowlisted table."""
    _columns(table, {TABLE_COLUMNS[table][0]: None})
    return list(connection.execute(text(f"SELECT * FROM {table}"), {}).mappings())


def sql_update(
    connection: Connection,
    table: str,
    record_id: int,
    values: Mapping[str, Any],
) -> RowMapping | None:
    """Update one row with pure parameterized SQL and return it."""
    columns = _columns(table, values)
    assignments = ", ".join(f"{column} = :{column}" for column in columns)
    parameters = {**values, "record_id": record_id}
    return connection.execute(
        text(
            f"UPDATE {table} SET {assignments} "
            "WHERE id = :record_id RETURNING *"
        ),
        parameters,
    ).mappings().one_or_none()


def sql_delete(connection: Connection, table: str, record_id: int) -> bool:
    """Delete one row with pure parameterized SQL."""
    _columns(table, {TABLE_COLUMNS[table][0]: None})
    result = connection.execute(
        text(f"DELETE FROM {table} WHERE id = :record_id"),
        {"record_id": record_id},
    )
    return result.rowcount == 1


__all__ = [
    "CRUD_MODELS",
    "SessionLocal",
    "TABLE_COLUMNS",
    "create",
    "read",
    "list_all",
    "update",
    "delete",
    "engine",
    "sql_create",
    "sql_read",
    "sql_list",
    "sql_update",
    "sql_delete",
    "ADMIN_REPORT_SORTS",
    "ADMIN_REPORT_DEFAULT_SORT",
    "admin_report_python",
    "admin_report_sql",
]