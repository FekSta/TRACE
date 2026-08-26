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
| 3 | **Email** | `SmtpEmailBackend` pointed at local Mailpit (SMTP `:1025`, web UI `:8025`) — **implemented in Module 6** | `ResendEmailBackend` (Module 9) | Both implement the same `EmailBackend` interface (`send`); the active implementation is selected by the `EMAIL_BACKEND` env var |

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

All 11 persistent entities from `assets/diagrams/data-model.md`, kept in sync with
that document. Models live in the single shared package `backend/app/models/`
(one file per entity), all registered on `app.db.Base.metadata`. Column names are
snake_case; the `Entities.md` attribute name is shown in the first column. Native
Postgres enum types store the exact `Entities.md` value spellings (case-sensitive).

### 4.1 User — `backend/app/models/user.py` → table `users` (Core, #1)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| UserID (PK) | `id` | INTEGER identity PK | — | — |
| FirstName | `first_name` | VARCHAR(100) NOT NULL | | |
| LastName | `last_name` | VARCHAR(100) NOT NULL | | |
| StudentNumber | `student_number` | VARCHAR(50) NULL | | |
| Email | `email` | VARCHAR(255) NOT NULL, UNIQUE | | |
| PhoneNumber | `phone_number` | VARCHAR(30) NULL | | |
| PasswordHash | `password_hash` | VARCHAR(255) NOT NULL | | |
| Role | `role` | enum `user_role` NOT NULL, default `User` | `User`, `Officer`, `Administrator` | |
| Status | `status` | enum `user_status` NOT NULL, default `Active` | `Active`, `Suspended`, `Inactive` | |
| CreatedAt | `created_at` | TIMESTAMPTZ NOT NULL, default now() | | |

### 4.2 LostItem — `backend/app/models/lost_item.py` → table `lost_items` (Core, #2)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| LostItemID (PK) | `id` | INTEGER identity PK | — | — |
| UserID | `user_id` | INTEGER NOT NULL | | `users.id` (reporter) |
| CategoryID | `category_id` | INTEGER NOT NULL | | `categories.id` |
| Title | `title` | VARCHAR(200) NOT NULL | | |
| Description | `description` | TEXT NULL | | |
| Brand | `brand` | VARCHAR(100) NULL | | |
| Colour | `colour` | VARCHAR(50) NULL | | |
| DateLost | `date_lost` | DATE NULL | | |
| LocationLost | `location_lost` | VARCHAR(200) NULL | | |
| Status | `status` | enum `lost_item_status` NOT NULL, default `Reported` | `Reported`, `Matched`, `Claimed`, `Closed` | |

### 4.3 FoundItem — `backend/app/models/found_item.py` → table `found_items` (Core, #3)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| FoundItemID (PK) | `id` | INTEGER identity PK | — | — |
| UserID | `user_id` | INTEGER NOT NULL | | `users.id` (finder) |
| CategoryID | `category_id` | INTEGER NOT NULL | | `categories.id` |
| Title | `title` | VARCHAR(200) NOT NULL | | |
| Description | `description` | TEXT NULL | | |
| Brand | `brand` | VARCHAR(100) NULL | | |
| Colour | `colour` | VARCHAR(50) NULL | | |
| DateFound | `date_found` | DATE NULL | | |
| StorageLocation | `storage_location` | VARCHAR(200) NULL | | |
| Status | `status` | enum `found_item_status` NOT NULL, default `Available` | `Available`, `Claimed`, `Returned` | |

### 4.4 Claim — `backend/app/models/claim.py` → table `claims` (Core, #4)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| ClaimID (PK) | `id` | INTEGER identity PK | — | — |
| LostItemID | `lost_item_id` | INTEGER NOT NULL | | `lost_items.id` |
| FoundItemID | `found_item_id` | INTEGER NOT NULL | | `found_items.id` |
| UserID | `user_id` | INTEGER NOT NULL | | `users.id` (claimant) |
| ClaimDate | `claim_date` | TIMESTAMPTZ NOT NULL, default now() | | |
| VerificationStatus | `verification_status` | enum `claim_verification_status` NOT NULL, default `Pending` | `Pending`, `Approved`, `Rejected` | |
| OfficerID | `officer_id` | INTEGER NULL | | `users.id` (reviewer) |
| VerificationNotes | `verification_notes` | TEXT NULL | | |
| CollectionDate | `collection_date` | TIMESTAMPTZ NULL | | |
| Status | `status` | enum `claim_status` NOT NULL, default `Active` | `Active`, `Completed`, `Cancelled` | |

### 4.5 Category — `backend/app/models/category.py` → table `categories` (Core, #5)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| CategoryID (PK) | `id` | INTEGER identity PK | — | — |
| CategoryName | `category_name` | VARCHAR(100) NOT NULL, UNIQUE | | |
| Description | `description` | VARCHAR(255) NULL | | |
| Icon | `icon` | VARCHAR(100) NULL | | |
| DisplayOrder | `display_order` | INTEGER NULL | | |
| Status | `status` | enum `category_status` NOT NULL, default `Active` | `Active`, `Archived` | |
| CreatedAt | `created_at` | TIMESTAMPTZ NOT NULL, default now() | | |

### 4.6 Match — `backend/app/models/match.py` → table `matches` (Supporting, #6)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| MatchID (PK) | `id` | INTEGER identity PK | — | — |
| LostItemID | `lost_item_id` | INTEGER NOT NULL | | `lost_items.id` |
| FoundItemID | `found_item_id` | INTEGER NOT NULL | | `found_items.id` |
| MatchScore | `match_score` | NUMERIC(5,2) NOT NULL | | |
| MatchReason | `match_reason` | TEXT NULL | | |
| Status | `status` | enum `match_status` NOT NULL, default `Suggested` | `Suggested`, `Accepted`, `Rejected` | |
| GeneratedAt | `generated_at` | TIMESTAMPTZ NOT NULL, default now() | | |

> Unique constraint `uq_matches_lost_item_found_item` on (`lost_item_id`, `found_item_id`) — one match per pair (interpretation recorded in `Review.md` §3).

### 4.7 Notification — `backend/app/models/notification.py` → table `notifications` (Supporting, #7)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| NotificationID (PK) | `id` | INTEGER identity PK | — | — |
| UserID | `user_id` | INTEGER NOT NULL | | `users.id` (recipient) |
| Title | `title` | VARCHAR(200) NOT NULL | | |
| Message | `message` | TEXT NULL | | |
| NotificationType | `notification_type` | enum `notification_type` NOT NULL | `Match`, `Claim`, `Reminder`, `System` | |
| IsRead | `is_read` | BOOLEAN NOT NULL, default false | | |
| CreatedAt | `created_at` | TIMESTAMPTZ NOT NULL, default now() | | |

> Gap (flagged in `Review.md` §4): `Entities.md` gives `Notification` no reference to the match/claim/item it relates to.

### 4.8 VerificationRecord — `backend/app/models/verification_record.py` → table `verification_records` (Supporting, #8)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| VerificationID (PK) | `id` | INTEGER identity PK | — | — |
| ClaimID | `claim_id` | INTEGER NOT NULL | | `claims.id` |
| OfficerID | `officer_id` | INTEGER NOT NULL | | `users.id` |
| VerificationMethod | `verification_method` | VARCHAR(100) NULL | | |
| Result | `result` | enum `verification_result` NOT NULL | `Passed`, `Failed` | |
| Notes | `notes` | TEXT NULL | | |
| VerifiedAt | `verified_at` | TIMESTAMPTZ NOT NULL, default now() | | |

### 4.9 CollectionRecord — `backend/app/models/collection_record.py` → table `collection_records` (Supporting, #9)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| CollectionID (PK) | `id` | INTEGER identity PK | — | — |
| ClaimID | `claim_id` | INTEGER NOT NULL | | `claims.id` |
| CollectedBy | `collected_by` | VARCHAR(200) NULL | | |
| OfficerID | `officer_id` | INTEGER NOT NULL | | `users.id` |
| CollectionDate | `collection_date` | TIMESTAMPTZ NOT NULL, default now() | | |
| RecipientSignature | `recipient_signature` | VARCHAR(255) NULL | | |
| Remarks | `remarks` | TEXT NULL | | |

### 4.10 Attachment — `backend/app/models/attachment.py` → table `attachments` (Supporting, #10)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| AttachmentID (PK) | `id` | INTEGER identity PK | — | — |
| FileName | `file_name` | VARCHAR(255) NOT NULL | | |
| FilePath | `file_path` | VARCHAR(500) NOT NULL | | |
| FileType | `file_type` | VARCHAR(50) NOT NULL | | |
| UploadedBy | `uploaded_by` | INTEGER NOT NULL | | `users.id` (uploader) |
| UploadedAt | `uploaded_at` | TIMESTAMPTZ NOT NULL, default now() | | |
| RelatedEntity | `related_entity` | enum `related_entity` NOT NULL | `LostItem`, `FoundItem`, `Claim` | |

> Gap (flagged in `Review.md` §4): `Entities.md` gives `Attachment` no FK to the related item/claim row.

### 4.11 AuditLog — `backend/app/models/audit_log.py` → table `audit_logs` (Supporting, #11)

| Entities.md | Column | Type / constraints | Enum values | FK → |
|---|---|---|---|---|
| AuditID (PK) | `id` | INTEGER identity PK | — | — |
| UserID | `user_id` | INTEGER NULL (system actions have no actor — `Review.md` §3) | | `users.id` |
| Action | `action` | VARCHAR(50) NOT NULL | | |
| EntityName | `entity_name` | VARCHAR(100) NOT NULL | | |
| EntityID | `entity_id` | INTEGER NULL | | |
| Timestamp | `timestamp` | TIMESTAMPTZ NOT NULL, default now() | | |
| IPAddress | `ip_address` | VARCHAR(50) NULL | | |

---

## 5. Running the full stack (Module 8 demo kit)

Since Module 8 the **whole system** (database + backend + frontend + email)
comes up with **one command** from a clean checkout. Migrations run
automatically on backend startup and the demo data is seeded automatically —
there is no manual `alembic upgrade head`, no `npm install`, no `.env` to
write.

### 5.1 One-command startup

```bash
make demo          # build + start + migrate + seed + wait (primary path)
# …or the equivalent without make:
docker compose up --build
```

What happens: `docker compose up --build` builds the four images (first run
only — roughly 3–6 min: backend pip install + frontend `npm ci`/`vite build`;
later runs are seconds), starts `db` first (the backend waits on its
`pg_isready` healthcheck), then the backend container entrypoint runs
`alembic upgrade head` **and** the idempotent demo seed before starting
uvicorn. `make demo` additionally waits for `GET /health` and prints the URLs
and logins below.

Each service ends up listening on:

| Service | Host URL | Notes |
|---------|----------|-------|
| **frontend** | http://localhost:5173 | built React bundle served by nginx (not a dev server) |
| **backend API** | http://localhost:8000 | FastAPI — interactive docs at `/docs`, liveness at `/health` |
| **db** | localhost:5432 | Postgres 16 (`trace`/`trace`/`trace_local_password`) |
| **mailpit** | http://localhost:8025 | email inbox; SMTP on localhost:1025 |

### 5.2 Seeded accounts

`backend/seed.py` creates one account per role (all `Active`, passwords
bcrypt-hashed by the app itself). **These are the logins to present in a
demo:**

| Role | Email | Password |
|------|-------|----------|
| User (lost items reported here) | `ada@example.com` | `SuperSecret1!` |
| User (found items registered here) | `bob@example.com` | `SuperSecret1!` |
| Officer | `officer@example.com` | `TestPass123!` |
| Administrator | `admin@example.com` | `TestPass123!` |

### 5.3 Seeded data

After a fresh `make demo` the database contains:

- **4 categories** — Electronics, Bags, Clothes, Documents & Cards.
- **3 lost items** (reported by `ada`) — *Black Nike backpack* (Bags),
  *Blue Sony headphones* (Electronics), *Silver laptop* (Electronics).
- **3 found items** (registered by `bob`) — *Black Nike backpack* (Bags),
  *Blue Sony headphones* (Electronics), *Red Nike jacket* (Clothes).
- **2 `Suggested` Matches, both scored 100.00** — the *deliberately-matching
  pairs*: `Black Nike backpack ↔ Black Nike backpack` and
  `Blue Sony headphones ↔ Blue Sony headphones` (identical
  category/location/date/description, so they clear the Module 4 threshold of
  60.00). Everything else is intentionally non-matching (different category or
  thin overlap), so a fresh demo shows exactly these two suggestions.
- **4 notifications + 4 emails** — the match triggers fire `notify_match_suggested`
  (one row + one Mailpit email per party), so Mailpit is pre-populated.

**Confirm the matches yourself** (the seed already asserts them, but here is
the API check):

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"officer@example.com","password":"TestPass123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/matches
# -> two matches, each { "match_score": "100.00", "status": "Suggested" }
```

### 5.4 Makefile targets

| Target | What it does |
|--------|--------------|
| `make demo` | **Build + start + migrate + seed + wait for `/health`** — the one command |
| `make seed` | Re-run the idempotent seed against the running stack (safe any time) |
| `make up` / `make down` | Start / stop the stack (data volume preserved) |
| `make clean` | Stop and **wipe all data** (`docker compose down -v`) — fresh-demo reset |
| `make logs` / `make ps` | Follow logs / show service status |

### 5.5 The `db` service in isolation (focused debugging)

The per-service commands from earlier milestones still work for focused
debugging, but `make demo` is now the primary path:

```bash
docker compose up -d db      # just the database (empty unless already seeded)
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

Migrations live in `backend/alembic/` and are generated from the models in
`backend/app/models/` (via `env.py` → `Base.metadata`). Alembic reads the
`DATABASE_URL` env var; without it, it falls back to the dev URL in
`backend/alembic.ini`. Host-side tools run from `backend/` using the venv
(`backend/.venv`, gitignored).

> **Module 8:** in the dockerized stack you never run `alembic upgrade head`
> yourself — the backend container entrypoint (`backend/docker-entrypoint.sh`)
> runs it (plus the seed) automatically on every start. Host-side Alembic is
> only needed when authoring new migrations.

```bash
# One-time setup (per checkout)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

export DATABASE_URL='postgresql+psycopg://trace:trace_local_password@localhost:5432/trace'
```

Generate a migration from the models:

```bash
cd backend
.venv/bin/alembic revision --autogenerate -m "describe the change"
```

Apply / inspect:

```bash
.venv/bin/alembic upgrade head   # apply all pending migrations
.venv/bin/alembic current        # current revision
.venv/bin/alembic history        # revision list
.venv/bin/alembic downgrade -1   # roll back one revision
```

Re-run the seed script (idempotent — safe to run any time):

```bash
cd backend
.venv/bin/python seed.py
```

---

## 7. Quick verification sequence

> **Module 8:** for the full-stack equivalent of this, just run `make demo` —
> it migrates AND seeds automatically. This section is the DB-layer-only
> sequence (migration + seed against a bare `db`), for focused debugging.

Copy-paste commands proving DB + models + migration + seed all work together
(mirrors `api.md`'s "quick end-to-end test sequence" — no GUI needed; `psql`
runs inside the `db` container):

```bash
# 1. Fresh database from a clean state
cd <repo root>
docker compose down -v
docker compose up -d db

# 2. Host tooling
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://trace:trace_local_password@localhost:5432/trace'

# 3. Migrate to head
.venv/bin/alembic upgrade head

# 4. Seed the 4 starter categories
.venv/bin/python seed.py

# 5. Verify: 11 tables, 17 FKs, 4 categories
docker compose exec db psql -U trace -d trace -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'alembic_version';"
docker compose exec db psql -U trace -d trace -c \
  "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';"
docker compose exec db psql -U trace -d trace -c \
  "SELECT category_name FROM categories ORDER BY display_order;"

# Expected: 11 tables, 17 FKs, and Electronics / Bags / Clothes / Documents & Cards
```

---

## 8. Authentication API (Module 2)

The Auth module (`backend/app/modules/auth/`) implements registration, login,
and JWT issuance — the first real HTTP API in TRACE. Modules 3–6 will be
referenced in this same style.

### 8.1 Authentication scheme & tokens

- **Scheme**: Bearer tokens — `Authorization: Bearer <access_token>`.
- **Algorithm**: HS256, signed with `JWT_SECRET` from `.env` (never hardcoded,
  never committed).
- **Lifetime**: `JWT_EXPIRE_MINUTES` minutes (default **60**). No refresh
  tokens in this milestone.
- **Claims** (minimal set):

  | Claim | Type | Meaning |
  |---|---|---|
  | `sub` | string | Standard subject — user id as a string |
  | `UserID` | int | User primary key (DoD-required claim) |
  | `Role` | string | Role at issue time (`User`/`Officer`/`Administrator`) — **informational**; authorization re-checks the live DB role |
  | `iat` | int | Issued-at epoch seconds |
  | `exp` | int | Expiry epoch seconds |

- **Status gating** (`Active`/`Suspended`/`Inactive`): only `Active` accounts
  can log in (others get 403), and any token used by a non-`Active` account is
  rejected on use (403).

### 8.2 Endpoint summary

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | none | Create a `User` account (role always `User`) |
| `POST` | `/auth/login` | none | Exchange email + password for a JWT |
| `GET` | `/auth/test-protected` | Bearer, `Administrator` only | THROWAWAY route proving 401/403 (remove later) |
| `GET` | `/items/lost` | Bearer, any active role | Module 3 stub proving `require_role` works outside Auth |

### 8.3 Per-endpoint reference

#### `POST /auth/register`

Request body:

```json
{
  "first_name": "Ada",
  "last_name": "Lovelace",
  "student_number": "s1234567",
  "email": "ada@example.com",
  "phone_number": "+27123456789",
  "password": "SuperSecret1!"
}
```

curl:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"first_name":"Ada","last_name":"Lovelace","email":"ada@example.com","password":"SuperSecret1!"}'
```

`201 Created`:

```json
{
  "id": 1,
  "first_name": "Ada",
  "last_name": "Lovelace",
  "student_number": "s1234567",
  "email": "ada@example.com",
  "phone_number": "+27123456789",
  "role": "User",
  "status": "Active",
  "created_at": "2026-08-12T20:45:12.229548Z"
}
```

Errors: `409` (email already registered), `422` (validation).

#### `POST /auth/login`

Request body: `{"email": "...", "password": "..."}`. curl:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecret1!"}'
```

`200 OK`:

```json
{"access_token": "eyJ...", "token_type": "bearer"}
```

Errors: `401` (incorrect email or password — one uniform message, no user
enumeration), `403` (account not active), `422` (validation).

#### `GET /auth/test-protected` (throwaway)

`200` only for `Administrator`; `401` no/invalid/expired token; `403` wrong role.

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/test-protected
```

#### `GET /items/lost` (Module 3 stub)

`200` for any active account → `{"items": [], "stub": true, "requested_by": "..."}`;
`401` without a token.

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/items/lost
```

### 8.4 Error format

All errors use FastAPI's standard shape `{"detail": "..."}`. Validation errors
are `422` with a `detail` array. Codes in use so far:

| Code | Meaning |
|---|---|
| `401` | Missing / malformed / expired token, or bad credentials (includes `WWW-Authenticate: Bearer` on protected routes) |
| `403` | Wrong role, or account not `Active` |
| `409` | Duplicate email on register |
| `422` | Request body validation failure |

### 8.5 `require_role` usage pattern (copy-paste for Modules 3–6)

```python
from fastapi import APIRouter, Depends
from app.models import User
from app.modules.auth.deps import require_role

router = APIRouter(prefix="/things", tags=["things"])


@router.get("")
def list_things(
    _: User = Depends(require_role("User", "Officer", "Administrator")),
) -> dict:
    return {"things": []}
```

- Accepts role strings **or** `UserRole` members (e.g. `require_role(UserRole.ADMINISTRATOR)`).
- `401` when the token is missing/invalid/expired; `403` when the caller's
  live DB role is not allowed; otherwise it resolves to the `User` row (use it
  as the parameter if the handler needs the user).

### 8.6 Quick end-to-end test sequence

```bash
# 0. prerequisites (from §5.5 and §6): docker compose up -d db; venv ready
cd backend
.venv/bin/uvicorn app.main:app --port 8000 &   # start the API

# 1. register
curl -s -X POST http://localhost:8000/auth/register -H 'Content-Type: application/json' \
  -d '{"first_name":"Ada","last_name":"Lovelace","email":"ada@example.com","password":"SuperSecret1!"}'

# 2. login and capture the token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# 3. decode locally and confirm UserID + Role claims
printf '%s' "$TOKEN" | cut -d. -f2 | python3 -c 'import sys,base64,json; s=sys.stdin.read().strip(); s+="="*(-len(s)%4); print(json.loads(base64.urlsafe_b64decode(s)))'
# -> {'sub': '1', 'UserID': 1, 'Role': 'User', 'iat': ..., 'exp': ...}
# (or paste the token at https://jwt.io)

# 4. protected routes — 401 without a token, 200 with one
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/items/lost          # 401
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/items/lost          # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/auth/test-protected  # 401
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/auth/test-protected                                         # 403 (User is not an Administrator)
```

### 8.7 Testing notes

- Test users created during this milestone: `ada@example.com` (User),
  `officer@example.com` (Officer), `admin@example.com` (Administrator). The
  officer/admin accounts were inserted directly into the DB using the app's own
  bcrypt hasher (password `TestPass123!`); Module 8's demo seed will do this
  properly.
- `email-validator` rejects reserved domains (`.local`, `.test`) — use
  `example.com` or a real campus domain in tests.
- Password `min_length` 8, `max_length` 72 chars; any password over bcrypt's **72-byte** hard limit is truncated to 72 bytes (in both hash and verify), so multibyte passwords never 500.
- Status gating test: set a user `Suspended` in the DB, confirm login → `403`.

---

## 9. Item Management API (Module 3)

The Items module (`backend/app/modules/items/`) manages Categories, LostItems,
FoundItems, and Attachments, with role-based scoping and a storage abstraction.

### 9.1 Scoping rules (read this before touching scoping)

- **User** — sees and modifies **only their own** LostItems/FoundItems
  (`WHERE UserID = ?`). Accessing another user's row returns **404** (never
  403), so the API does not reveal whether another user's row exists.
- **Officer / Administrator** — see and may modify **all** items, unscoped.
- **Categories** — viewable by everyone (needed for the reporting forms);
  create/update/delete are **Administrator-only**. Archived categories are
  hidden unless the caller is an Administrator requesting
  `?include_archived=true`.
- Scoping is a role branch **inside each endpoint** (one route serves both
  scopes); there is no separate route tree per role.
- Attachments: uploading to an item follows the same scoping (owner, or
  Officer/Admin for any item).

### 9.2 Endpoint summary

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| `GET` | `/categories` | Bearer (any role) | List active categories (`?include_archived=true` for Admin) |
| `POST` | `/categories` | Bearer, `Administrator` | Add a category |
| `PATCH` | `/categories/{id}` | Bearer, `Administrator` | Update a category |
| `DELETE` | `/categories/{id}` | Bearer, `Administrator` | **Archive** a category (soft delete) |
| `POST` | `/items/lost` | Bearer (any role) | Report a lost item (status `Reported`) |
| `GET` | `/items/lost` | Bearer | List lost items (own for User; all for Officer/Admin) |
| `GET` | `/items/lost/{id}` | Bearer | Get one (404 for cross-user access) |
| `PATCH` | `/items/lost/{id}` | Bearer | Update (owner, or Officer/Admin for any) |
| `DELETE` | `/items/lost/{id}` | Bearer | Delete (owner, or Officer/Admin for any) |
| `POST` | `/items/found` | Bearer (any role) | Register a found item (status `Available`) |
| `GET` | `/items/found` | Bearer | List found items (scoped like lost) |
| `GET` | `/items/found/{id}` | Bearer | Get one (scoped) |
| `PATCH` | `/items/found/{id}` | Bearer | Update (scoped) |
| `DELETE` | `/items/found/{id}` | Bearer | Delete (scoped) |
| `POST` | `/items/lost/{id}/attachments` | Bearer | Upload an attachment for a lost item |
| `POST` | `/items/found/{id}/attachments` | Bearer | Upload an attachment for a found item |
| `GET` | `/media/{filename}` | **none** (public) | Serve a stored file (UUID-prefixed names) |

### 9.3 Category endpoints

**Create (Admin)** — `POST /categories`

```bash
curl -X POST http://localhost:8000/categories \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"category_name":"Sports Gear","description":"Sporting equipment","icon":"sports","display_order":5}'
```

`201` → `{"id":5,"category_name":"Sports Gear","description":"Sporting equipment","icon":"sports","display_order":5,"status":"Active","created_at":"..."}`

Errors: `403` (non-Admin), `409` (duplicate name), `422` (validation).

**List** — `GET /categories` (any role) returns active categories ordered by
`display_order`; Admin adds `?include_archived=true` to see archived ones.

**Update (Admin)** — `PATCH /categories/{id}` (partial; all fields optional,
including `status` so an Admin can restore an archived category).

**Archive (Admin)** — `DELETE /categories/{id}` sets `Status` to `Archived`
(soft delete — the row stays for FK integrity and history).

### 9.4 LostItem endpoints

**Report a lost item** — `POST /items/lost` (any authenticated role; the
caller becomes the owner). New items start at `Reported`.

```bash
curl -X POST http://localhost:8000/items/lost \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Black backpack","brand":"Nike","colour":"Black","date_lost":"2026-08-10","location_lost":"Library"}'
```

`201` → `{"id":1,"user_id":1,"category_id":1,"title":"Black backpack",...,"status":"Reported"}`

Errors: `400` (unknown/inactive category), `422` (validation), `401` (no token).

**List** — `GET /items/lost`

```bash
# User token — own items only
curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:8000/items/lost
# Officer token — all items
curl -H "Authorization: Bearer $OFFICER_TOKEN" http://localhost:8000/items/lost
```

**Get / Update / Delete** — `GET|PATCH|DELETE /items/lost/{id}`. PATCH is
partial (any field optional, including `status`); DELETE returns `204`.
Cross-user access returns `404`.

### 9.5 FoundItem endpoints

Identical to LostItem under `/items/found`, except fields `date_found` and
`storage_location`, and new items start at `Available`.

### 9.6 Status transitions (this stage)

| Entity | Enum (from `Entities.md`) | Starts at | Set by |
|---|---|---|---|
| LostItem | `Reported`, `Matched`, `Claimed`, `Closed` | `Reported` | creation; PATCH may set any valid value for now |
| FoundItem | `Available`, `Claimed`, `Returned` | `Available` | creation; PATCH may set any valid value for now |

Real transition rules now arrive with Claims (Module 5): accept creates a
Claim without touching item statuses; approve moves LostItem `Reported`→
`Claimed` and FoundItem `Available`→`Claimed`; collect moves them
`Claimed`→`Closed`/`Returned` (see §11.3 — the authoritative table). The
`Matched` value is not driven by this workflow (see `Review.md` §Module 5);
PATCH still accepts any enum value for officer overrides.

### 9.7 Storage & attachments

- Interface: `StorageBackend` (`save(content, original_filename) -> stored_name`,
  `get_url(stored_name) -> url`, `delete(stored_name)`) in
  `backend/app/modules/items/storage.py`.
- Phase 1 implementation: `LocalDiskStorage` writes to `backend/uploads/`
  (`UPLOAD_DIR` env var), storing files as `<uuid4-hex>_<original-name>` so
  names never collide and are unguessable. Module 9 adds `SupabaseStorage`
  behind the same interface — no Items-module code changes.
- Attachments: `POST /items/lost/{id}/attachments` (or `/items/found/{id}/...`)
  with a multipart `file` field. The `Attachment` row stores **only the URL**
  (`file_path`), never bytes; `related_entity` is inferred from the route and
  `entity_id` links the row to the item (see `Review.md` §Module 3).
- Serving: `GET /media/{filename}` is **public** in Phase 1; the UUID prefix
  is the access control, and path traversal is blocked server-side.

```bash
# upload (multipart)
curl -X POST http://localhost:8000/items/lost/3/attachments \
  -H "Authorization: Bearer $TOKEN" -F 'file=@/tmp/photo.jpg;type=image/jpeg'
# -> 201 {"id":1,"file_name":"photo.jpg","file_path":"/media/<uuid>_photo.jpg",...}

# fetch it back by URL
curl http://localhost:8000/media/<uuid>_photo.jpg -o photo.jpg
```

### 9.8 Quick end-to-end test sequence

```bash
# login as User and Officer (tokens from §8)
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# 1. create a lost item (starts at Reported)
ITEM=$(curl -s -X POST http://localhost:8000/items/lost \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Silver laptop"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 2. upload an attachment for it and fetch the file back by URL
ATT=$(curl -s -X POST http://localhost:8000/items/lost/$ITEM/attachments \
  -H "Authorization: Bearer $TOKEN" -F 'file=@/tmp/photo.txt' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["file_path"])')
curl -s http://localhost:8000$ATT

# 3. Officer logs in and sees ALL lost items (unscoped)
OTOKEN=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"officer@example.com","password":"TestPass123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
curl -s -H "Authorization: Bearer $OTOKEN" http://localhost:8000/items/lost

# expected: the User sees only their own items; the Officer sees all
```

## 10. Matching Engine API (Module 4)

The Matching module (`backend/app/modules/matching/`) scores every new
LostItem/FoundItem against opposite-type items and writes `Match` rows —
**one matching engine, in-process with the rest of the monolith** (no message
queue, no HTTP between modules, per `ABOUT.md`). The scoring pass runs as a
`BackgroundTask` *after* the creation response is sent, so item creation never
blocks on matching.

### 10.1 Scoring model (`utils/similarity.py`)

Pure, deterministic, offline scoring — no LLM, no network, no external
service. One LostItem/FoundItem pair → a numeric `MatchScore` (0–100,
`Decimal`/`Numeric(5,2)`) plus a human-readable `MatchReason`.

Formula (weights sum to 100):

| Factor | Weight | Rule |
|---|---|---|
| **Category** | 40 | **Hard gate** — different `category_id` → score `0.00` (reason `Different category (X vs Y)`) |
| **Location** | 15 | `15 × Jaccard(location_lost tokens, storage_location tokens)`; reason mentions location only when similarity ≥ 0.4 (score still earns partial credit below that) |
| **Date** | 15 | `15 × max(0, 1 − days_apart / 14)` — identical dates score 15, decaying linearly to 0 at ≥ 14 days apart |
| **Description** | 30 | `30 × Jaccard(description tokens)` (lowercased, punctuation stripped, small stopword list) |

Missing data for a factor contributes 0 (neutral) — it never penalises the
other factors. Total is capped at 100. Note: the FoundItem side uses
`storage_location` (the only location the model stores) as its location —
interpretation recorded in `Review.md`.

**Worked examples** (from the issue-1 shell-test proof — the exact samples and
outputs):

```
OBVIOUS MATCH:     score=100.00 (SUGGESTED) reason='same category (category 1); same location; same date; 100% description overlap'
OBVIOUS NON-MATCH: score=0.00    (below threshold) reason='Different category (category 1 vs 3)'
PARTIAL MATCH:     score=78.22   (SUGGESTED) reason='same category (category 2); 3 day(s) apart; 71% description overlap'
```

### 10.2 Threshold

`MATCH_THRESHOLD = 60.00` (defined in `similarity.py`). A `Match` row with
`Status='Suggested'` is created only for scores `≥ 60.00`. Rationale: with
category as a hard gate (40 pts), 60 requires meaningful additional signal —
e.g. close dates, strong description overlap, or a combination — while
staying permissive enough for a campus pilot. Tuning guidance in
`Review.md` §Module 4.

### 10.3 Endpoint summary

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| `GET` | `/matches` | Bearer, any active role (scoped) | List matches; Users see only matches on their own items |
| `POST` | `/matches/{match_id}/accept` | Bearer, owner of either item, or staff | Set `Match.Status` → `Accepted` (from `Suggested` only) |
| `POST` | `/matches/{match_id}/reject` | Bearer, owner of either item, or staff | Set `Match.Status` → `Rejected` (from `Suggested` only) |

`GET /matches` supports optional query filters: `item_id` (match where the
lost **or** found item is that id), `user_id` (staff only — filters matches
touching that user's items; non-staff always get their own scoped view), and
`status` (`Suggested`/`Accepted`/`Rejected`).

### 10.4 Scoping rules (callout)

A plain `User` only ever sees matches where **either** the lost item or the
found item is theirs. Officer/Administrator see **all** matches. Cross-user
access to accept/reject returns **404** (never 403), so the API never reveals
whether a match exists for another user's items. This reuses the Module 3
scoping pattern via `is_staff` from `items/service.py`.

### 10.5 Per-endpoint reference

#### `GET /matches`

curl (User — scoped to own items):

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/matches
```

curl (Officer — unscoped, filtered by status):

```bash
curl -H "Authorization: Bearer $OTOKEN" 'http://localhost:8000/matches?status=Suggested'
```

Success response (`200`):

```json
[
  {
    "id": 1,
    "lost_item_id": 4,
    "found_item_id": 3,
    "match_score": 100.00,
    "match_reason": "same category (category 1); same location; same date; 100% description overlap",
    "status": "Suggested",
    "generated_at": "2026-08-12T10:00:00.123456+00:00"
  }
]
```

Errors: `401` missing/invalid token; `403` suspended account. (List scopes
silently — a User filtering by another user's ids gets an empty list, never
an error.)

#### `POST /matches/{match_id}/accept` / `POST /matches/{match_id}/reject`

curl:

```bash
curl -X POST http://localhost:8000/matches/1/accept -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:8000/matches/2/reject -H "Authorization: Bearer $TOKEN"
```

Success response (`200`): the match with `status` now `Accepted` / `Rejected`.

Errors:

| Code | When |
|---|---|
| `401` | missing/invalid token |
| `403` | suspended account |
| `404` | match doesn't exist, or caller owns neither item |
| `409` | match already resolved (status ≠ `Suggested`) — `Match already accepted/rejected` |

### 10.6 Async behavior note

The Items module registers the scoring pass as a `FastAPI BackgroundTask` on
item creation (`POST /items/lost`, `POST /items/found`). The client gets the
`201` creation response **immediately**; `Match` rows appear a moment later.
Measured in the issue-2 verification: a FoundItem creation that produced a
`100.00` match returned in **~106 ms** with the `Match` row already queryable
right after. Do not poll for a match inside the same request that creates the
item — poll `GET /matches` after a short delay (or after a few hundred ms).

### 10.7 Quick end-to-end test sequence

```bash
# login as two different users (obvious match pair)
TA=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
TB=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# 1. ada reports a lost item; bob registers the matching found item
curl -s -X POST http://localhost:8000/items/lost -H "Authorization: Bearer $TA" \
  -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Black Nike backpack","description":"Black Nike backpack with a silver laptop sleeve","date_lost":"2026-08-10","location_lost":"Library"}'
curl -s -X POST http://localhost:8000/items/found -H "Authorization: Bearer $TB" \
  -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Black Nike backpack","description":"Black Nike backpack with a silver laptop sleeve","date_found":"2026-08-10","storage_location":"Library"}'

# 2. the creation response returns immediately; the Match appears right after
sleep 1
curl -s -H "Authorization: Bearer $TA" http://localhost:8000/matches

# 3. accept the suggested match, then confirm the status flipped
MATCH_ID=$(curl -s -H "Authorization: Bearer $TA" http://localhost:8000/matches \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
curl -s -X POST http://localhost:8000/matches/$MATCH_ID/accept -H "Authorization: Bearer $TB"
```

## 11. Claims & Verification API (Module 5)

The Claims module (`backend/app/modules/claims/`) owns the ownership-claim
workflow: Claim creation (handoff from an accepted Match), Officer/Admin
verification (approve/reject), and collection. It is the module that actually
drives the LostItem/FoundItem status transitions promised since Module 3.

### 11.1 How a Claim is created — internal, not a public `POST /claims`

There is **no public `POST /claims`**. Claim creation is the handoff from the
Matching module's accept endpoint: `POST /matches/{id}/accept` calls
`claims.service.create_from_match(...)` as a **direct in-process function
call** in the same request/session — never an HTTP request between modules
(`ABOUT.md`). The `Match.Status → Accepted` update and the new `Claim` row
(plus its `ClaimCreated` AuditLog row) commit in one transaction.

The Claim is populated with `LostItemID`, `FoundItemID`, and `UserID` = the
**LostItem reporter** (the claimant), `ClaimDate` (server now),
`VerificationStatus = 'Pending'`, and `Status = 'Active'` (the model default
implied by `Entities.md`; the choice is recorded in `Review.md` §Module 5).
Item statuses do **not** change at accept — approve/reject/collect drive them.
`create_from_match` is idempotent per (lost, found) pair.

### 11.2 Endpoint summary

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| `POST` | `/matches/{id}/accept` | owner of either item, or staff | (Module 4) Accept a `Suggested` match — **creates a Claim in-process** |
| `GET` | `/claims` | Bearer, any active role (scoped) | List claims; Users see only their own, staff see all (`?verification_status=` filter) |
| `GET` | `/claims/{id}` | Bearer, any active role (scoped) | One claim; cross-user access → 404 |
| `POST` | `/claims/{id}/verify` | Bearer, **Officer / Administrator** | Approve or reject a pending claim (writes a `VerificationRecord`) |
| `POST` | `/claims/{id}/collect` | Bearer, **Officer / Administrator** | Record the handover; completes the claim (writes a `CollectionRecord`) |

`Administrator` is treated as a superset of `Officer` (consistent with
`is_staff` from Module 3), so Admins can verify and collect.

### 11.3 Status transitions (Issue 2 DoD — the authoritative table)

Claim creation itself (from an accepted Match) leaves item statuses untouched:
Claim starts `Pending`/`Active`. From there, the three outcomes:

| Outcome | `Claim.VerificationStatus` | `Claim.Status` | `LostItem.Status` | `FoundItem.Status` |
|---|---|---|---|---|
| **Approve** | `Pending → Approved` | `Active → Active` (unchanged) | `Reported → Claimed` | `Available → Claimed` |
| **Reject** | `Pending → Rejected` | `Active → Cancelled` | `Reported → Reported` (unchanged) | `Available → Available` (unchanged) |
| **Collect** (after Approve) | `Approved → Approved` (unchanged) | `Active → Completed` | `Claimed → Closed` | `Claimed → Returned` |

Reads: approving a claim reserves the items for the claimant (`Claimed`);
rejecting it leaves both items exactly where they were — `Reported` /
`Available` — so they can be matched and claimed again; collecting the item
finishes everything (`Closed`/`Returned`/`Completed`). A rejected claim is
`Cancelled`; a completed one is `Completed`. Terminal states are guarded:
verifying or collecting an already-verified/completed/cancelled claim returns
`400`.

### 11.4 Per-endpoint reference

#### `POST /claims/{id}/verify`

Request body:

```json
{
  "result": "Approved",          // or "Rejected" — "Pending" is rejected (422)
  "notes": "ID matched student card",
  "verification_method": "Student card check"
}
```

curl:

```bash
curl -X POST http://localhost:8000/claims/1/verify \
  -H "Authorization: Bearer $OFFICER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"result":"Approved","notes":"ID matched student card","verification_method":"Student card check"}'
```

`200` — the Claim in its new state (e.g. `verification_status: "Approved"`).

Errors: `403` non-Officer/Admin; `404` unknown claim; `400` claim not
`Pending`+`Active` (e.g. already verified, completed, or cancelled — message
names the reason); `422` invalid body (`result: "Pending"`, bad types).

#### `POST /claims/{id}/collect`

Request body (all optional — send `{}`):

```json
{"collected_by": "Ada Lovelace", "recipient_signature": "A.Lovelace", "remarks": "Identity verified"}
```

curl:

```bash
curl -X POST http://localhost:8000/claims/1/collect \
  -H "Authorization: Bearer $OFFICER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"collected_by":"Ada Lovelace","recipient_signature":"A.Lovelace","remarks":"Identity verified; item handed over"}'
```

`200` — the Claim now `status: "Completed"` with `collection_date` set.

Errors: `403` non-Officer/Admin; `404` unknown claim; `400` claim not
`Approved` or no longer `Active` (already completed/cancelled).

#### `GET /claims` / `GET /claims/{id}`

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/claims
curl -H "Authorization: Bearer $OFFICER_TOKEN" 'http://localhost:8000/claims?verification_status=Pending'
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/claims/1
```

Errors: `401` no/invalid token; `403` suspended account; `404` on
`GET /claims/{id}` for a non-existent **or** cross-user claim (never 403).

### 11.5 Transaction boundary note

Every mutating step is **one atomic transaction**: the service functions
(`create_from_match`, `verify_claim`, `collect_claim`) only mutate the session;
the endpoint performs the single `db.commit()`. So on **approve**, the three
status updates (`Claim.VerificationStatus`, `LostItem.Status`,
`FoundItem.Status`) plus the `VerificationRecord` and `AuditLog` rows commit
together or not at all. If any write fails — verified by forcing an
`IntegrityError` (a `VerificationRecord` with a non-existent `officer_id`)
mid-approval — the whole transaction rolls back and a fresh session sees all
three statuses unchanged with no partial record left behind.

### 11.6 AuditLog

Exactly **one** `AuditLog` row is written per mutating step, with
`EntityName='Claim'`, `EntityID=<claim_id>`, and the acting user:

| Action | Actor | Sample row |
|---|---|---|
| `ClaimCreated` | match-accept caller | `(user_id=1, action='ClaimCreated', entity_name='Claim', entity_id=1)` |
| `ClaimApproved` | verifying Officer/Admin | `(user_id=2, action='ClaimApproved', entity_name='Claim', entity_id=2)` |
| `ClaimRejected` | verifying Officer/Admin | `(user_id=2, action='ClaimRejected', entity_name='Claim', entity_id=3)` |
| `ClaimCollected` | collecting Officer/Admin | `(user_id=3, action='ClaimCollected', entity_name='Claim', entity_id=2)` |

### 11.7 Quick end-to-end test sequences

**Happy path (Report → Match → Accept → Claim → Verify/Approve → Collect):**

```bash
# login as the claimant, the finder, and an officer
TA=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
TB=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
TO=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"officer@example.com","password":"TestPass123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# 1. ada reports the lost item; bob registers the matching found item
LOST=$(curl -s -X POST http://localhost:8000/items/lost -H "Authorization: Bearer $TA" \
  -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Blue Sony headphones","description":"Blue Sony wireless headphones with black carrying case","date_lost":"2026-08-12","location_lost":"Library"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
FOUND=$(curl -s -X POST http://localhost:8000/items/found -H "Authorization: Bearer $TB" \
  -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Blue Sony headphones","description":"Blue Sony wireless headphones with black carrying case","date_found":"2026-08-12","storage_location":"Library"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 2. the Match appears a moment later (BackgroundTask); accept it -> Claim created
sleep 1
MID=$(curl -s -H "Authorization: Bearer $TA" http://localhost:8000/matches \
  | python3 -c "import sys,json;ms=[m for m in json.load(sys.stdin) if m['lost_item_id']==$LOST and m['found_item_id']==$FOUND];print(ms[0]['id'])")
curl -s -X POST http://localhost:8000/matches/$MID/accept -H "Authorization: Bearer $TA"
CLAIM=$(curl -s -H "Authorization: Bearer $TA" http://localhost:8000/claims \
  | python3 -c "import sys,json;cs=[c for c in json.load(sys.stdin) if c['lost_item_id']==$LOST];print(cs[0]['id'])")
# claim: verification_status=Pending, status=Active; items still Reported/Available

# 3. officer approves (atomic: Claim->Approved, LostItem->Claimed, FoundItem->Claimed)
curl -s -X POST http://localhost:8000/claims/$CLAIM/verify -H "Authorization: Bearer $TO" \
  -H 'Content-Type: application/json' -d '{"result":"Approved","notes":"ID matched"}'

# 4. officer records collection (Claim->Completed, LostItem->Closed, FoundItem->Returned)
curl -s -X POST http://localhost:8000/claims/$CLAIM/collect -H "Authorization: Bearer $TO" \
  -H 'Content-Type: application/json' -d '{"collected_by":"Ada Lovelace","recipient_signature":"A.Lovelace"}'
```

**Reject path** (same steps 1–2, then):

```bash
# officer rejects (Claim: Pending->Rejected, Active->Cancelled; items stay Reported/Available)
curl -s -X POST http://localhost:8000/claims/$CLAIM/verify -H "Authorization: Bearer $TO" \
  -H 'Content-Type: application/json' \
  -d '{"result":"Rejected","notes":"Claimant could not describe item markings"}'
# a rejected claim cannot be collected or re-verified (both -> 400)
curl -s -X POST http://localhost:8000/claims/$CLAIM/collect -H "Authorization: Bearer $TO" \
  -H 'Content-Type: application/json' -d '{}'   # 400
```

---

## 12. Notifications & Email API (Module 6)

The Notifications module (`backend/app/modules/notifications/`) delivers the
single V1 notification channel — **email** (`ABOUT.md`) — for match, claim,
and collection events, and persists a `Notification` row per event. It is
triggered by **direct in-process calls** from the Matching and Claims modules
(no message queue, never HTTP between modules), and its email plumbing
mirrors Module 3's `StorageBackend` interface/adapter pattern exactly.

### 12.1 `EmailBackend` interface (mirrors `StorageBackend`)

`backend/app/modules/notifications/email_backend.py`:

- **Interface**: `EmailBackend.send(to, subject, body)` — the only email
  entry point in TRACE. Trigger code calls the shared `email_backend`
  singleton and never talks to SMTP directly, just as Items calls
  `storage.save(...)` and never touches the filesystem.
- **Implementation**: `SmtpEmailBackend(host, port, from_address)` using
  `smtplib` (stdlib — no new dependency).
- **Configuration** (from `.env`, defaults in `config.py`):

  | Var | Default | Meaning |
  |---|---|---|
  | `EMAIL_BACKEND` | `smtp` | Selects the active implementation (`smtp` now; `resend` in Module 9) |
  | `SMTP_HOST` | `localhost` | `localhost` for the host-side backend (Phase 1); `mailpit` for the Module 8 container on the compose network |
  | `SMTP_PORT` | `1025` | Mailpit's SMTP port |
  | `SMTP_FROM` | `no-reply@trace.local` | Envelope From address |

- **Zero-external-calls guarantee**: Phase 1 config resolves to loopback only
  (`localhost:1025`) — no external relay is ever contacted. Verified by
  pointing `SMTP_PORT` at a dead port and confirming the app logs the send
  failure and keeps running.
- **Module 9 swap**: `ResendEmailBackend` is added behind the same interface;
  switching `EMAIL_BACKEND=resend` + new env vars is the *only* change — no
  trigger code is touched.

### 12.2 Trigger table

All triggers run via `FastAPI BackgroundTask` (or inside Module 4's matching
background runners) — never in the request path, so creation/approval
responses never wait on email.

| # | Event | Call site | `NotificationType` | Email subject (recipient) |
|---|---|---|---|---|
| 1 | New `Suggested` match | `matching/service.py` runners (per created match) | `Match` | "TRACE: a potential match was found" (**both** the lost-item reporter and the finder) |
| 2 | Claim submitted | `matching/router.py` accept endpoint (BackgroundTask) | `Claim` | "TRACE: your claim was submitted" (claimant) |
| 3 | Claim **approved** | `claims/router.py` verify endpoint (BackgroundTask) | `Claim` | "TRACE: your claim was approved" (claimant) |
| 4 | Item ready for collection | `claims/router.py` verify endpoint, on approve (BackgroundTask) | `Claim` | "TRACE: your item is ready for collection" (claimant) |
| 5 | Claim **rejected** | `claims/router.py` verify endpoint (BackgroundTask) | `Claim` | "TRACE: your claim was rejected" + officer notes (claimant) |

Interpretation note: "item ready for collection" is fired together with
"claim approved" — once a claim is approved the FoundItem is ready to be
handed over (see `Review.md` §Module 6). Collecting the item itself does not
fire an email in this milestone (out of the four-event scope).

### 12.3 `Notification` row reference

Each trigger writes a `notifications` row with `user_id` (recipient),
`title`, `message`, and `notification_type`; `is_read` defaults `false` and
`created_at` is the server timestamp (per `Entities.md`).

**Rows are independent of email delivery.** Each trigger commits its
`Notification` row(s) *before* attempting the SMTP send; a send failure is
caught and logged (`email send to <to> failed (notification row already
persisted)`) and never rolls the row back. Verified concretely: with
`SMTP_PORT=9999` (dead), accepting a match still returned `200` in ~0.07 s
and the `Claim submitted` + `Match` rows were persisted with zero emails
delivered.

### 12.4 Local testing

```bash
# 1. Mailpit (and Postgres) up, inbox at http://localhost:8025
#    (Module 8: the whole stack is already up after `make demo`; this is the
#    host-side variant for focused debugging)
docker compose up -d db mailpit

# 2. backend on the host with the default smtp config
cd backend && .venv/bin/uvicorn app.main:app --port 8000

# 3. trigger each event (see §11.7 for the full claim sequence):
#    - new match:      create a LostItem and a matching FoundItem
#    - claim submitted: POST /matches/{id}/accept
#    - approved/ready:  POST /claims/{id}/verify {"result":"Approved"}
#    - rejected:        POST /claims/{id}/verify {"result":"Rejected","notes":"..."}
```

Watch `http://localhost:8025` — every TRACE email lands there (or inspect
programmatically via `GET http://localhost:8025/api/v1/messages`).

### 12.5 Quick end-to-end test sequence (check Mailpit after each step)

```bash
# login as claimant, finder, officer (tokens from §8)
TA=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
TB=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","password":"SuperSecret1!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
TO=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"officer@example.com","password":"TestPass123!"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# step 1: report a lost item + register the matching found item
# -> Mailpit: 2 x "a potential match was found" (one to ada, one to bob)
LOST=$(curl -s -X POST http://localhost:8000/items/lost -H "Authorization: Bearer $TA" \
  -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Blue Sony headphones","description":"Blue Sony wireless headphones with black carrying case","date_lost":"2026-08-12","location_lost":"Library"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
FOUND=$(curl -s -X POST http://localhost:8000/items/found -H "Authorization: Bearer $TB" \
  -H 'Content-Type: application/json' \
  -d '{"category_id":1,"title":"Blue Sony headphones","description":"Blue Sony wireless headphones with black carrying case","date_found":"2026-08-12","storage_location":"Library"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
sleep 2

# step 2: accept the suggested match -> claim created
# -> Mailpit: "your claim was submitted" (to ada)
MID=$(curl -s -H "Authorization: Bearer $TA" http://localhost:8000/matches \
  | python3 -c "import sys,json;ms=[m for m in json.load(sys.stdin) if m['lost_item_id']==$LOST and m['found_item_id']==$FOUND];print(ms[0]['id'])")
curl -s -X POST http://localhost:8000/matches/$MID/accept -H "Authorization: Bearer $TA"
CLAIM=$(curl -s -H "Authorization: Bearer $TA" http://localhost:8000/claims \
  | python3 -c "import sys,json;cs=[c for c in json.load(sys.stdin) if c['lost_item_id']==$LOST];print(cs[0]['id'])")

# step 3: officer approves
# -> Mailpit: "your claim was approved" + "your item is ready for collection" (to ada)
curl -s -X POST http://localhost:8000/claims/$CLAIM/verify -H "Authorization: Bearer $TO" \
  -H 'Content-Type: application/json' -d '{"result":"Approved","notes":"ID matched"}'

# reject path (fresh pair):
# -> Mailpit: "your claim was rejected" (to ada)
curl -s -X POST http://localhost:8000/claims/$CLAIM/verify -H "Authorization: Bearer $TO" \
  -H 'Content-Type: application/json' -d '{"result":"Rejected","notes":"could not verify ownership"}'
```

Each `Notification` row is queryable alongside the email:
`SELECT * FROM notifications ORDER BY id;` — one row per trigger, present
even when the email cannot be delivered.

---

## 13. Frontend & Dashboard (Module 7)

The React 19 SPA in `frontend/` consumes the Modules 2–6 API documented
above. Unlike the earlier sections this one documents the app's
**structure**, not a new API — the frontend is the API's consumer.

### 13.1 Project structure

| Path | Purpose |
|---|---|
| `frontend/src/routes/auth/` | Login / Register / RegisterSuccess / LoginSuccess — `demo/auth` identity |
| `frontend/src/routes/user/` | User portal: dashboard, report lost/found (photo upload), matches, claims, notifications |
| `frontend/src/routes/officer/` | Officer portal: dashboard, verify reports, review claims, collections, item status |
| `frontend/src/routes/admin/` | Admin portal: summary, categories CRUD, reports, audit log |
| `frontend/src/routes/guards.tsx` | `RequireRole` — portal gating from the decoded JWT role |
| `frontend/src/components/layout/AppShell.tsx` | Shared sidebar + topbar shell for all three portals |
| `frontend/src/components/ui/` | Shared design-system primitives (Button, Card, StatusBadge, StatCard, Modal, Field, Toast, …) |
| `frontend/src/lib/auth.ts` | JWT storage + dependency-free decode (`Role` claim), `getAuthSession`, `portalForRole` |
| `frontend/src/lib/auth-context.tsx` | Session context + logout |
| `frontend/src/lib/api.ts` | Fetch wrapper — the only place HTTP happens |
| `frontend/src/lib/types.ts` | TypeScript mirrors of the backend response schemas |
| `frontend/src/hooks/useFetch.ts`, `useAuthedFetch.ts` | Fetching with loading/error/reload; logout on 401 |
| `frontend/src/index.css` | Tailwind v4 `@theme` tokens — the design system's source of truth |

### 13.2 Design system reference

`demo/officer/style.css` is the **single source of visual truth** for all
three portals. Its tokens were extracted into `src/index.css` `@theme`:

| Token | Value | Officer source |
|---|---|---|
| `--color-brand` | `#008542` | `--green` |
| `--color-brand-dark` | `#006d35` | `--green-dark` |
| `--color-brand-light` | `#e8f5ed` | `--green-light` |
| `--color-canvas` | `#f6f8fb` | `--bg` |
| `--color-surface` / `--color-soft` | `#ffffff` / `#f1f5f9` | `--surface` / `--surface-soft` |
| `--color-ink` / `--color-muted` | `#0b1c30` / `#667085` | `--text` / `--muted` |
| `--color-line` | `#dbe1e7` | `--border` |
| `--color-danger` / `--color-warning` | `#ba1a1a` / `#d97706` | `--danger` / `--warning` |
| Fonts | Inter (body) + Manrope (display) | Google Fonts links in the demo |
| Cards | radius 12px, shadow `0 2px 10px rgba(15,23,42,.05)` | `--radius` / `--shadow` |

`StatusBadge.tsx` maps every backend status onto the officer badge palette
(found/approved → green, lost → amber, pending → slate, rejected → red),
and `src/components/ui/` implements the shared buttons, cards, modals and
toast once — no per-portal CSS copies. Auth screens keep `demo/auth/`'s own
identity (dark navy image side `#0f172a`, near-black primary `#111827`,
amber accents `#d97706`) via the `auth-ink`/`auth-navy`/`auth-amber` tokens.

### 13.3 Auth flow

- **Login**: `POST /auth/login` → token stored in `localStorage` under
  `trace.access_token`; the decoded `Role` claim is read back immediately
  (LoginSuccess renders it — the issue-1 DoD artifact).
- **Decode**: dependency-free `decodeToken`; `getAuthSession` enforces a
  strict payload shape (valid numeric `exp` + `UserID`, known `Role`), so a
  tampered payload cannot silently render privileged views.
- **Routing**: `RequireRole` reads the role from the decoded token **only**
  — no session → `/login`; wrong role for the URL → redirected to that
  role's own portal. `Administrator` is a superset of `Officer` (may open
  `/officer`, matching `is_staff`).
- **Logout / expiry**: logout clears the token; any API 401/403 also logs
  the user out. Expired tokens are detected client-side and cleared (no
  refresh tokens in this milestone). Storage-choice trade-off documented in
  `Review.md` §Module 7.

### 13.4 Portal → endpoint map (and demo translation record)

| Portal / screen | Endpoints used | Translated from |
|---|---|---|
| Login | `POST /auth/login` | `demo/auth/login.html` |
| Register / RegisterSuccess | `POST /auth/register` | `demo/auth/register.html` + `register-successful.html` |
| LoginSuccess | — (reads stored token) | `demo/auth/login-successful.html` |
| User dashboard | `GET /items/lost`, `GET /items/found`, `GET /claims` | `demo/user/index.html` dashboard |
| Report lost/found | `GET /categories`, `POST /items/lost|found`, `POST /items/{kind}/{id}/attachments` (photo, multipart) | `demo/user/` report pages |
| My matches | `GET /matches`, `POST /matches/{id}/accept` (submits a claim), `POST /matches/{id}/reject` | `demo/user/` matches surface |
| Track claims | `GET /claims` | `demo/user/` Track Claims |
| Notifications | — (gap: no `GET /notifications` yet — see §13.5) | `demo/user/` bell icon |
| Officer dashboard | `GET /items/lost`, `GET /items/found`, `GET /claims` | `demo/officer/` Dashboard |
| Verify reports | `GET /items/lost|found`, `PATCH /items/{kind}/{id}`, `DELETE /items/{kind}/{id}` | `demo/officer/` Verify Reports |
| Review claims | `GET /claims?verification_status=Pending`, `POST /claims/{id}/verify` | `demo/officer/` Review Claims |
| Collections | `GET /claims?verification_status=Approved`, `POST /claims/{id}/collect` | `demo/officer/` Approve Collections |
| Item status | `PATCH /items/{kind}/{id}` | `demo/officer/` Update Item Status |
| Admin summary | `GET /items/lost`, `/items/found`, `/claims`, `/matches`, `/categories` (computed client-side) | none — officer extension (see §13.5) |
| Categories | `GET /categories?include_archived=true`, `POST/PATCH/DELETE /categories` | `demo/UI/` Manage Categories (content only) |
| Admin reports | — (gap: `GET /dashboard/reports` deferred) | `demo/UI/` Reports |
| Audit log | — (gap: no `GET /audit-logs` yet) | none |

> **Demo → real-API mismatches** (each flagged in `Review.md` §Module 7):
> `demo/user/`'s standalone "Upload Photos" page folded into the report
> forms (photos attach to items); `demo/officer/`'s "Verify/Reject report"
> has no backing state — the real action is `PATCH` status / `DELETE`;
> `demo/user/`'s map panel has no geodata behind it and is not faked.

### 13.5 Documented gaps (deferred, not silently dropped)

- **No `GET /notifications`** — Module 6 writes rows + emails only; the
  User portal's Notifications view probes the route and shows an explained
  gap panel when it 404s.
- **No `GET /audit-logs`** — the Admin Audit Log view renders the same kind
  of gap panel.
- **`GET /dashboard/summary` + `GET /dashboard/reports`** (listed in the
  Module 7 issue) were **deferred** — the milestone guardrail forbids new
  backend endpoints this pass; the Admin summary is computed client-side.
  All three are the Module 8 handoff.

### 13.6 Local dev instructions

**Quickest path (Module 8 demo kit):** `make demo` from the repo root serves
the *built* bundle at http://localhost:5173 — no `npm install`, no dev server.

**Iterating on the frontend only:**

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 (replaces the containerized build)
```

- `VITE_API_URL` defaults to `http://localhost:8000` (`.env` is gitignored;
  `.env.example` is committed). The backend CORS-allows `http://localhost:5173`
  (middleware added to `backend/app/main.py` in Module 7).
- Test accounts: `ada@example.com` / `SuperSecret1!` (User),
  `bob@example.com` / `SuperSecret1!` (User), `officer@example.com` /
  `TestPass123!` (Officer), `admin@example.com` / `TestPass123!`
  (Administrator). Self-registration always creates a User.
- Typecheck + production build: `npm run build` (`tsc -b && vite build`).

---

## 14. Module status

| Milestone | Status |
|-----------|--------|
| Module 0 — Orientation | ✅ closed (see `issues/completed.md`) |
| Module 1 — Local Postgres & schema | ✅ closed (see `issues/completed.md`) |
| Module 2 — Authentication | ✅ closed (see `issues/completed.md`) |
| Module 3 — Item Management | ✅ closed (see `issues/completed.md`) |
| Module 4 — Matching Engine | ✅ closed (see `issues/completed.md`) |
| Module 5 — Claims & Verification | ✅ closed (see `issues/completed.md`) |
| Module 6 — Notifications | ✅ closed (see `issues/completed.md`) |
| Module 7 — Frontend & Dashboard | ✅ closed (see `issues/completed.md`) |
| Module 8 — Local demo kit | **in progress** — root compose ✅, seed + `make demo` ✅ (see `issues/completed.md`); offline smoke test + `Tutorial.md` follow-through is the remaining issue |
| Module 9 — Cloud migration (optional) | not started |
