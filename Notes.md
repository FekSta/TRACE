# TRACE — Technical Reference Notes

> **T**racking, **R**ecovery, **A**nd **C**laim **E**ngine — a centralized Lost &
> Found management system for a university campus (CMPG213/CMPG223).
>
> This is the hand-written technical reference for the **whole app**, kept in the
> same style and level of detail as an `api.md`: endpoint tables, request/response
> examples, error formats, a quick end-to-end test sequence, env var knobs, and
> testing notes. Since Milestones 0–1 expose no HTTP API yet, this document
> currently documents what *does* exist: the local database, the ORM models, and
> the migration/seed workflow. As later milestones add real endpoints, this
> document grows to look exactly like `api.md` does for auth today.
>
> **Authoritative sources**
> - `ABOUT.md` — system architecture (binding)
> - `assets/diagrams/data-model.md` — the 11 entities (the `Entities.md` equivalent, binding)
> - `assets/diagrams/data-flow.md` — which role touches which entity, and how (binding)
> - `README.md` — course brief / requirements (CMPG213/CMPG223)
> - `issues/Trace_isses.md` — authoritative task breakdown by milestone
> - `Review.md` — decision record (ADR-style summary of *why* things are built this way)

---

## 1. System overview

TRACE is a centralized platform for lost & found management. Users report lost and
found items, the system **automatically matches** reports using a single matching
engine (category + location + date + description similarity scoring), users submit
**ownership claims**, officers **verify** claims and approve collection, and
administrators get dashboards and reports. It is deliberately **not** a
classifieds board or a manual ticketing system — it is infrastructure for
recovery, and it stops at recovery + trust.

The system is a **modular monolith**: one FastAPI backend, one PostgreSQL
database, and six internal modules — **Auth, Items (Item Management), Matching,
Claims, Dashboard, Notifications** — that communicate through direct in-process
function calls (each module's `services.py`), **never** HTTP calls between modules
and **never** a message queue. Modules can later be extracted into standalone
microservices without rewriting business logic (see `ABOUT.md`). The client is a
React 19 SPA exposing role-based portals for Users, Lost & Found Officers, and
Administrators.

---

## 2. Phase 1 (local) vs Phase 2 (cloud) seams

Phase 1 runs 100% locally with no cloud accounts: React dev server → FastAPI on
`localhost` → Postgres in Docker → local disk (`uploads/` volume) + Mailpit for
email. Phase 2 (`ABOUT.md`'s diagram) moves exactly three "plumbing" pieces to
cloud services. The Module 0 sketch exercise (see `issues/completed.md`) circles
**three boxes** that differ between the two sketches:

| # | Seam | Phase 1 (local) | Phase 2 (cloud) | How the swap happens |
|---|------|-----------------|-----------------|----------------------|
| 1 | **Database connection** | Docker Postgres on `localhost:5432` (`DATABASE_URL` in `.env`) | Supabase-hosted Postgres | Only the `DATABASE_URL` value changes; the same SQLAlchemy models and Alembic migrations run unchanged against Supabase |
| 2 | **File storage** | `LocalDiskStorage` writing into a Docker-mounted `uploads/` volume | `SupabaseStorage` | Both implement the same `StorageBackend` interface (`save`, `get_url`, `delete`); the active implementation is selected by the `STORAGE_BACKEND` env var |
| 3 | **Email** | `SmtpEmailBackend` pointed at local Mailpit (SMTP `:1025`, web UI `:8025`) | `ResendEmailBackend` | Both implement the same `EmailBackend` interface (`send`); the active implementation is selected by the `EMAIL_BACKEND` env var |

**What does NOT change between Phase 1 and Phase 2:**

- The **six backend modules** (Auth, Items, Matching, Claims, Dashboard,
  Notifications) and their in-process call boundaries.
- The **React app** and all its API interactions.
- The **database schema** (models, migrations, seed data).

**Why:** every external dependency is isolated behind an interface (`StorageBackend`,
`EmailBackend`) or a config value (`DATABASE_URL`, `STORAGE_BACKEND`,
`EMAIL_BACKEND`). Business logic is written against the interfaces, never against a
concrete provider, so the modules have no reason to change when the underlying
provider does. The same reasoning that makes the seams cheap to swap is what keeps
the modular monolith extractable into microservices later (per `ABOUT.md`).

---

## 3. Entity ownership matrix

Who creates and who reads each of the 11 persistent entities, agreed from
`assets/diagrams/data-flow.md` and `assets/diagrams/User_Actions.md`. "System"
means the backend creates the row as a side effect of a workflow, not a human.

| Entity | Created by | Read by |
|--------|-----------|---------|
| **User** | User (self-registration); Administrator (add/manage users) | User (own), Officer, Administrator |
| **LostItem** | User | User (own, `WHERE UserID = ?`), Officer (all), Administrator (all) |
| **FoundItem** | User, Officer | User (all — needed to submit claims), Officer (all), Administrator (all) |
| **Category** | Administrator | Everyone (all roles) |
| **Claim** | User | User (own), Officer (review), Administrator |
| **Match** | System (matching engine) | User (own), Officer, Administrator |
| **Notification** | System (notifications) | User (own), Administrator |
| **VerificationRecord** | Officer | Officer, Administrator |
| **CollectionRecord** | Officer | Officer, Administrator, User |
| **Attachment** | User (uploader) | User, Officer, Administrator |
| **AuditLog** | System | Administrator |

Scoping rules (from `assets/diagrams/data-flow.md`): Users are scoped to their own
rows (`SELECT * FROM LostItem WHERE UserID = ?`); Officers and Administrators view
all items/claims unscoped. The system, not a human, creates `Match`, `Notification`,
and `AuditLog` rows as side effects of business workflows.

---

## 4. Entity reference

Populated in Module 1 as the SQLAlchemy models land — full attribute/type/enum/FK
tables for all 11 entities, kept in sync with `assets/diagrams/data-model.md`.
_(Added on the `feature/sqlalchemy-models` branch.)_

---

## 5. Local database (`docker compose up db`)

Phase 1 uses a local Postgres 16 container defined by the `db` service in the
root `docker-compose.yml`. No cloud account involved.

```bash
docker compose up db          # start the db service (fresh Postgres, empty)
docker compose ps             # status — `db` should report (healthy)
docker compose down -v        # stop and wipe the data volume (fresh start)
```

Connecting:

- **psql (in container)** — `docker compose exec db psql -U trace -d trace`
- **psql (host, if installed)** — `psql -h localhost -p 5432 -U trace -d trace`
  (password = `POSTGRES_PASSWORD`)
- **GUI (pgAdmin / TablePlus / DBeaver)** — host `localhost`, port `5432`,
  database `trace`, user `trace`

Env vars used (from `.env`, gitignored; sensible defaults are inlined in
`docker-compose.yml` via `${VAR:-default}` so a fresh checkout works with no
`.env`):

| Var | Default | Used for |
|-----|---------|----------|
| `POSTGRES_DB` | `trace` | Database name |
| `POSTGRES_USER` | `trace` | Role / owner |
| `POSTGRES_PASSWORD` | `trace_local_password` | Role password |
| `DATABASE_URL` | `postgresql+psycopg://trace:trace_local_password@localhost:5432/trace` | Host-side tools (Alembic, seed) — host `localhost` here; use `db` when running on the compose network |

Data lives in the named volume `trace_pgdata`: it survives `docker compose
restart` and `docker compose down` — only `docker compose down -v` wipes it.

---

## 6. Alembic usage

Populated in Module 1 as the migration setup lands. _(Added on the
`feature/alembic-migration-seed` branch.)_

---

## 7. Quick verification sequence

Populated in Module 1 — copy-paste commands proving DB + models + migration +
seed all work together (mirrors `api.md`'s "quick end-to-end test sequence"
section). _(Added on the `feature/alembic-migration-seed` branch.)_

---

## 8. Module status

| Milestone | Status |
|-----------|--------|
| Module 0 — Orientation | ✅ closed (see `issues/completed.md`) |
| Module 1 — Local Postgres & schema | in progress |
| Modules 2–8 | not started (per scope) |
| Module 9 — Cloud migration (optional) | not started |
