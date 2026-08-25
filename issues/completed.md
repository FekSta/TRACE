# TRACE — Completed Issues

> Append-only log. One entry per issue, in completion order.
> Branch/commit detail lives in `Issues/gitlogs/Milestone0&1.md`.

---

## [Module 0] Team sketch + architecture review session

**Closed:** 2026-08-25
**Branch:** `docs/architecture-review` (see Issues/gitlogs/Milestone0&1.md for full commit list)
**Definition of done met:** The Phase 1→Phase 2 seam summary is documented in `Notes.md` § 2 and `Review.md` § 2, identifying the three things that change (database connection, file storage, email) and confirming the six backend modules + React app remain unchanged. The entity ownership matrix in `Notes.md` § 4 lists all 11 entities with their create/read roles.

**Files committed:**
- Notes.md
- Review.md

---

## [Module 1] Add `db` (Postgres) service to docker-compose.yml

**Closed:** 2026-08-25
**Branch:** `chore/docker-postgres-service` (see Issues/gitlogs/Milestone0&1.md for full commit list)
**Definition of done met:** `docker compose up db` starts a fresh, empty Postgres 16 Alpine container on `localhost:5432` with healthcheck passing. Verified by running `docker compose up db -d` and confirming status shows "(healthy)".

**Files committed:**
- docker-compose.yml
- .env.example

---

## [Module 1] SQLAlchemy models for all 11 entities

**Closed:** 2026-08-25
**Branch:** `feature/sqlalchemy-models` (see Issues/gitlogs/Milestone0&1.md for full commit list)
**Definition of done met:** All 11 models exist in `backend/app/models/`, import without errors, and every FK relationship documented in `Entities.md` is declared in code. Verified by Python import test showing 11 tables with 17 FK constraints. All attribute types and enum values match `assets/diagrams/data-model.md` exactly.

**Files committed:**
- backend/__init__.py
- backend/app/__init__.py
- backend/app/models/__init__.py
- backend/app/models/base.py
- backend/app/models/user.py
- backend/app/models/category.py
- backend/app/models/lost_item.py
- backend/app/models/found_item.py
- backend/app/models/claim.py
- backend/app/models/match.py
- backend/app/models/notification.py
- backend/app/models/verification_record.py
- backend/app/models/collection_record.py
- backend/app/models/attachment.py
- backend/app/models/audit_log.py
- backend/app/database.py
- backend/app/main.py
- backend/requirements.txt

---

## [Module 1] Alembic migration + seed Category table

**Closed:** 2026-08-25
**Branch:** `feature/alembic-migration-seed` (see Issues/gitlogs/Milestone0&1.md for full commit list)
**Definition of done met:** `alembic upgrade head` against a fresh `db` container creates all 11 tables with correct foreign keys (verified via `information_schema.table_constraints` — 17 FK constraints). The seed script inserts 4 starter categories (Electronics, Bags, Clothes, Documents & Cards) confirmed by SELECT query. Full verification sequence documented in `Notes.md` § 7.

**Files committed:**
- backend/alembic.ini
- backend/alembic/env.py
- backend/alembic/script.py.mako
- backend/alembic/versions/ff0a486902ce_initial_schema_all_11_entities.py
- backend/seed.py
