# TRACE — Completed Issues Log

> Append-only closed-issue log. Each entry confirms that the Definition of
> Done was actually met, not assumed.

---

## [Module 0] Team sketch + architecture review session

**Closed:** 2026-08-26
**Branch:** `docs/architecture-review`
**Definition of done met:** All Phase 1 → Phase 2 seams documented in `Notes.md` §2 (DB connection, file storage, email) and entity ownership matrix in `Notes.md` §4 — all team members can name the three changing components and explain why the six modules and React app don't change.

**Files committed:**
- `Notes.md` (Phase 1 vs Phase 2 seam summary, entity ownership matrix)
- `Trace_Architecture_Summary_Monolith.md`
- `submission/docs/database.md`

**Commits:**
- `docs: Team architecture review session`

---

## [Module 1] Add `db` (Postgres) service to docker-compose.yml

**Closed:** 2026-08-26
**Branch:** `chore/docker-postgres-service`
**Definition of done met:** `docker compose up db` brings up a fresh Postgres container accepting connections on `localhost:5432` with credentials `trace / trace_local_password` — verified with `pg_isready`.

**Files committed:**
- `docker-compose.yml`
- `.env.example`

**Commits:**
- `chore(#11): add db service to docker-compose.yml with named volume and healthcheck`

---

## [Module 1] SQLAlchemy models for all 11 entities

**Closed:** 2026-08-26
**Branch:** `feature/sqlalchemy-models` (original) → `fix/plural-table-names-and-cleanup` (corrected)
**Definition of done met:** All 11 models exist, import without errors, and every FK relationship documented in `Entities.md` is declared in code — verified via `python -c "from backend.app.models import *; print(len(Base.metadata.tables))"` returning 11.

**Files committed:**
- `backend/app/models/user.py`
- `backend/app/models/category.py`
- `backend/app/models/lost_item.py`
- `backend/app/models/found_item.py`
- `backend/app/models/claim.py`
- `backend/app/models/match.py`
- `backend/app/models/notification.py`
- `backend/app/models/verification_record.py`
- `backend/app/models/collection_record.py`
- `backend/app/models/attachment.py`
- `backend/app/models/audit_log.py`
- `backend/app/models/enums.py`
- `backend/app/models/base.py`
- `backend/app/models/__init__.py`

**Commits:**
- `feat(#14): add SQLAlchemy models for all 11 entities`
- `fix: rewrite models to match Entities.md exactly` (corrected: integer PKs, plural table names, centralized enums, ondelete behavior)

---

## [Module 1] Alembic migration + seed Category table

**Closed:** 2026-08-26
**Branch:** `feature/alembic-migration-seed` (original) → `fix/plural-table-names-and-cleanup` (corrected)
**Definition of done met:** `alembic upgrade head` against a fresh `db` container creates all 11 tables with correct foreign keys (17 FK constraints), and the seed script populates the 4 starter categories (Electronics, Bags, Clothes, Documents & Cards) — verified via direct `psql` queries.

**Files committed:**
- `backend/alembic/env.py`
- `backend/alembic/versions/f0b8febaf3b9_initial_schema_all_11_entities.py`
- `backend/seed.py`
- `backend/app/database.py`

**Commits:**
- `feat: add Alembic migration + seed script for Category table`
- `fix: rewrite models to match Entities.md exactly` (corrected migration with plural names and ondelete)
