# TRACE — Review & Decision Record

> Architecture Decision Record (ADR) summary for Milestone 0–1.
> Not a task log — see `issues/completed.md` for completion status.

---

## 1. Modular Monolith — Confirmed

**Decision:** TRACE uses a FastAPI modular monolith with one deployable app,
one Postgres database, and six internal modules communicating via direct
in-process function calls.

**Rationale:**
- Team size (2 developers) cannot sustain microservices overhead
- V1 timeline demands rapid iteration; monoliths are faster to develop
- Module boundaries are preserved via `services.py` interfaces, so extraction
  to microservices later requires no business logic changes
- Single DB transaction boundary simplifies data consistency

**Source:** `ABOUT.md` § "Why a Modular Monolith?", `Trace_Architecture_Summary_Monolith.md`

---

## 2. Decisions Made During Implementation

### 2.1 SQLAlchemy 2.0 with Mapped type annotations
**Decision:** Use SQLAlchemy 2.0's `Mapped[type]` annotation style for all models.
**Rationale:** Modern SQLAlchemy 2.0 requires type annotations for `mapped_column`
when primary arguments are absent. This is the current recommended pattern.

### 2.2 UUID Primary Keys (not Integer)
**Decision:** All 11 entities use UUID primary keys, generated server-side via
`gen_random_uuid()`.
**Rationale:** `assets/diagrams/data-model.md` specifies "UUID / Integer" for all
PKs. UUIDs were chosen because:
- They avoid ID conflicts if the system ever runs multiple replicas
- They make API IDs safe for external consumers (no sequential leaking)
- Postgres 16 has native `gen_random_uuid()` — zero application overhead

### 2.3 Native Postgres ENUMs (not VARCHAR with CHECK constraints)
**Decision:** Enum values (`Role`, `Status`, `LostItemStatus`, etc.) are modeled
as native Postgres ENUMs via SQLAlchemy's `Enum()` type.
**Rationale:**
- Type-safe at the database level — invalid values cannot be inserted
- Matches the enum semantics in `Entities.md` exactly
- Trade-off: adding new enum values requires a migration (acceptable for V1)

### 2.4 Alembic revision naming convention
**Decision:** Migration filenames use Alembic's default auto-generated format
(`<revision>_<slug>.py`).
**Rationale:** No team convention exists yet; default is sufficient. First
migration: `ff0a486902ce_initial_schema_all_11_entities.py`.

### 2.5 Package structure: single `models/` package
**Decision:** All 11 models live in `backend/app/models/`, not one package per module.
**Rationale:** The issue spec explicitly says "a single shared
`backend/app/models/` package — not one package per module." This keeps
Alembic autogeneration simple (one `Base.metadata` to scan).

### 2.6 Sync engine for Alembic, async for FastAPI
**Decision:** `database.py` provides a sync `engine` + `SessionLocal` for
Alembic and seed scripts. FastAPI will use an async engine at runtime.
**Rationale:** Alembic does not support async engines. The sync/async split
is a standard SQLAlchemy pattern.

---

## 3. Deviations from Specification

### None
All entity definitions, attribute names, types, enum values, and FK
relationships match `assets/diagrams/data-model.md` exactly. No silent
guesses were made. The only interpretive decisions are:

- **`ondelete` behavior:** Not specified in `Entities.md`. Chose:
  - `CASCADE` for owned entities (User → items, Claim → records)
  - `RESTRICT` for classification (Category → items) to prevent accidental deletion
  - `SET NULL` for references that can exist independently (Claim → LostItem/FoundItem)
- **`Nullable` for `VerificationRecord.officer_id` and `CollectionRecord.officer_id`:**
  Set to nullable because the officer reference could become stale if the user
  is deleted. `SET NULL` on delete preserves the record.

---

## 4. Known Gaps & Risks Going into Milestone 2

1. **No `backend/app/` entry point configured for `uvicorn` yet.**
   `main.py` exists but is not wired to a Dockerfile or docker-compose service.
   This is expected — the backend service is added in a later milestone.

2. **No authentication dependency (`require_role`) exists yet.**
   Module 2 will build this. Models are ready to support it.

3. **Enum value changes require migrations.**
   Native Postgres ENUMs cannot have values removed or renamed without a
   migration. For V1 this is fine. If Phase 2 adds new roles or statuses,
   an Alembic migration will be needed. Consider using `VARCHAR` with
   Python-level validation if enum values are expected to change frequently.

4. **No indexes on `LostItem.status` or `FoundItem.status`.**
   Status filtering is expected to be common (e.g. "show all Open items").
   Indexes on status columns should be added when query patterns are
   established in Module 3.

5. **`Attachment` table has no FK to a specific item/claim row.**
   `RelatedEntity` + `related_entity_id` would be cleaner than the current
   `related_entity` enum alone. However, `Entities.md` does not include a
   `related_entity_id` column, so the Attachment table is a reference-only
   entity for now — actual linking will be implemented when file uploads
   are built in Module 3.

6. **No `dashboard` module yet.** Dashboard endpoints are Milestone 7.
