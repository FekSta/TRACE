# TRACE — Completed Issues Log

Append-only log of closed issues, **one entry per issue**, in completion order.
An issue is only logged here when its listed **Definition of done** is actually
met and independently verified. Issue bodies live in `issues/Trace_isses.md`.

---

## [Module 0] Team sketch + architecture review session

**Closed:** 2026-08-12
**Branch:** `docs/module-0-orientation`
**Definition of done met:** Solo-agent deliverable produced and committed — `Notes.md` §2 names the three things that change between Phase 1 and Phase 2 (database connection, file storage, email) and explains why the six backend modules and the React app don't change at all; `Notes.md` §3 documents who creates and who reads each of the 11 entities (verified against `assets/diagrams/data-flow.md` and `User_Actions.md`).

**Files committed:**
- `Notes.md` (backbone: overview, Phase 1→2 seams, entity ownership matrix)
- `Review.md` (decision record: modular monolith confirmation)
- `issues/completed.md` (this log)
- `issues/Trace_isses.md` (authoritative issue bodies, previously untracked)

**Commits:**
- `docs: add Module 0 orientation notes, review, and issue log`

---

## [Module 1] Add `db` (Postgres) service to docker-compose.yml

**Closed:** 2026-08-12
**Branch:** `chore/docker-postgres-service`
**Definition of done met:** `docker compose up db` from a wiped state brought up a fresh, empty Postgres 16.14 (healthcheck green) with no manual steps; host TCP connection to `localhost:5432` confirmed; a marker table survived `docker compose restart db`, proving the named volume persists data.

**Files committed:**
- `docker-compose.yml`
- `.env.example` (DATABASE_URL → `postgresql+psycopg://`, host-note comment added)
- `Notes.md` (local database section)
- `issues/completed.md` (this entry)

**Commits:**
- `chore: add db service to docker-compose.yml`
- `docs: document db service usage in Notes.md and issue log`

> Note: `.env` was written locally (per the issue: "Set local-only credentials via `.env`") but is gitignored and intentionally not committed.

---

## [Module 1] SQLAlchemy models for all 11 entities

**Closed:** 2026-08-12
**Branch:** `feature/sqlalchemy-models`
**Definition of done met:** All 11 models exist in the single shared package `backend/app/models/` (one file per entity), import cleanly with no circular-import errors, all 17 FK relationships from `Entities.md` are declared in code, every attribute type and Enum value matches `Entities.md` exactly, and the Postgres DDL for all 11 tables compiles.

**Files committed:**
- `backend/app/__init__.py`
- `backend/app/db.py` (shared `Base`)
- `backend/app/models/__init__.py` (registers all 11 models)
- `backend/app/models/enums.py` (Python enums + native Postgres enum types)
- `backend/app/models/{user,lost_item,found_item,claim,category,match,notification,verification_record,collection_record,attachment,audit_log}.py`
- `backend/requirements.txt` (SQLAlchemy 2.0.52, alembic 1.19.1, psycopg 3.3.4)
- `Notes.md` (entity reference §4)
- `issues/completed.md` (this entry)

**Commits:**
- `feat: add SQLAlchemy models for all 11 entities`
- `docs: document entity reference in Notes.md and issue log`

---

## [Module 1] Alembic migration + seed Category table

**Closed:** 2026-08-12
**Branch:** `feature/alembic-migration-seed`
**Definition of done met:** `alembic upgrade head` against a fresh `db` container created all 11 tables with correct foreign keys (verified in Postgres: 11 tables, 17 FKs in `information_schema`), and the seed script populated the 4 starter categories (Electronics, Bags, Clothes, Documents & Cards) — re-running the seed reports "exists", proving idempotency. Native enum values stored exactly as spelled in `Entities.md` (verified via `pg_enum`, e.g. `user_role` = User/Officer/Administrator).

**Files committed:**
- `backend/alembic.ini` (dev URL default + `prepend_sys_path`)
- `backend/alembic/env.py` (registers `app.models`, reads `DATABASE_URL`)
- `backend/alembic/versions/405c749934b5_initial_schema_11_entities.py`
- `backend/seed.py` (idempotent starter-category seed)
- `Notes.md` (Alembic usage §6, quick verification sequence §7)
- `Review.md` (exact tool versions, new risks)
- `issues/completed.md` (this entry)

**Commits:**
- `feat: add alembic initial schema migration and category seed`
- `docs: document alembic workflow and verification sequence`
