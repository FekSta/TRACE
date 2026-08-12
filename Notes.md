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

Migrations live in `backend/alembic/` and are generated from the models in
`backend/app/models/` (via `env.py` → `Base.metadata`). Alembic reads the
`DATABASE_URL` env var; without it, it falls back to the dev URL in
`backend/alembic.ini`. Host-side tools run from `backend/` using the venv
(`backend/.venv`, gitignored).

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
# 0. prerequisites (from §5 and §6): docker compose up db; venv ready
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
- Password max length is **72 bytes** (bcrypt's hard limit); `min_length` 8.
- Status gating test: set a user `Suspended` in the DB, confirm login → `403`.

---

## 9. Module status

| Milestone | Status |
|-----------|--------|
| Module 0 — Orientation | ✅ closed (see `issues/completed.md`) |
| Module 1 — Local Postgres & schema | ✅ closed (see `issues/completed.md`) |
| Module 2 — Authentication | ✅ closed (see `issues/completed.md`) |
| Modules 3–8 | not started (per scope) |
| Module 9 — Cloud migration (optional) | not started |
