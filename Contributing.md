# Contributing to TRACE

> **T**racking, **R**ecovery, **A**nd **C**laim **E**ngine — *"Every lost item leaves a trace."* 🧭

Welcome! 👋 This guide gets you from a clean clone to a running, tested stack,
explains how the codebase is organized, and shows how we work day to day. It is
written for the **CMPG213/CMPG223** team and for anyone reviewing the project.

**If you're new to the stack**, don't worry — this guide assumes only basic
Python, TypeScript, and Docker. TRACE-specific concepts (the modular monolith,
matching engine, role scoping, the `403`→`404` convention) are explained as we
go.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [Project Overview](#-project-overview)
3. [Prerequisites](#-prerequisites)
4. [One-Time Setup](#-one-time-setup)
5. [Understanding the Codebase](#-understanding-the-codebase)
6. [Day-to-Day Development](#-day-to-day-development)
7. [Git Workflow](#-git-workflow)
8. [Testing](#-testing)
9. [Code Quality](#-code-quality)
10. [Pull Request Checklist](#-pull-request-checklist)
11. [Glossary](#-glossary)
12. [Troubleshooting](#-troubleshooting)

---

## 📜 Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md). By
participating you are expected to uphold it. Please report unacceptable
behaviour to the maintainers (see the [Team](#-team--getting-help) section).
Be kind, assume good faith, and review the code — not the person.

---

## 🧭 Project Overview

TRACE is a **centralized Lost & Found management system** for a university
campus. It is deliberately **not** a classifieds board and **not** a manual
ticketing system — it is infrastructure for recovery, and it stops at
recovery + trust.

| Capability | How it works |
|---|---|
| **Report lost / found items** | Users report a lost item or register a found one, with category, description, colour, brand, dates, and location |
| **Automatic matching** | A single in-process matching engine scores every new report against open opposite-type items (category + location + date + description similarity) |
| **Ownership claims** | Accepting a suggested match creates a `Claim` — accepting **is** the claim submission |
| **Verification workflow** | Officers/Admins verify claims (`VerificationRecord`), approve collection, and record handover (`CollectionRecord`) |
| **Notifications** | Match, claim, and collection events persist a `Notification` and send an email (local Mailpit in Phase 1) |
| **Dashboards & reports** | Administrators see platform metrics, reports, and an audit trail |
| **Role-based access** | Three roles — `User`, `Lost & Found Officer`, `Administrator` — each with its own portal |

### User roles

| Role | What they can do |
|---|---|
| **User** | Register/login, report lost items, register found items, upload photos, view matches, submit/track claims, receive notifications |
| **Lost & Found Officer** | Verify reports, review ownership claims, approve collections, update item status |
| **Administrator** | Manage users and categories, run reports, view the audit log |

### Architecture — a modular monolith

TRACE is **one FastAPI backend**, **one PostgreSQL database**, and **six
internal modules** that talk to each other through **direct in-process function
calls** (each module's `services.py`) — **never HTTP calls between modules, and
never a message queue**.

| Module | Owns |
|---|---|
| **Auth** | Registration, login, JWT issuance, admin user management, self-service profile/password |
| **Items** | Categories, `LostItem`/`FoundItem` CRUD, attachments, storage backends, role scoping |
| **Matching** | The matching engine, `Match` rows, accept/reject (accept hands off to Claims) |
| **Claims** | Claim creation (from an accepted match), verify/approve/reject, collection |
| **Dashboard** | Admin metrics and reports |
| **Notifications** | `Notification` rows + email delivery (match/claim/collection events) |

The React SPA exposes **three role-based portals** — Student, Officer, and
Administration. Modules are isolated behind interfaces and direct service
calls so any one can later be extracted into a microservice without rewriting
business logic (see `ABOUT.md`).

### Phase 1 (local) vs Phase 2 (cloud)

Phase 1 runs **100% locally with no cloud accounts**: React bundle in nginx →
FastAPI on `localhost` → Postgres in Docker → local disk (`uploads/`) +
Mailpit for email. Exactly three plumbing seams move to the cloud in Phase 2,
behind interfaces that already exist:

| Seam | Phase 1 | Phase 2 | Swap mechanism |
|---|---|---|---|
| Database | Docker Postgres | Hosted Postgres | `DATABASE_URL` value only |
| File storage | `LocalDiskStorage` | `SupabaseStorage` | `STORAGE_BACKEND` env var |
| Email | SMTP → Mailpit | `ResendEmailBackend` | `EMAIL_BACKEND` env var |

The **modules, the React app, and the database schema do not change** between
phases. Phase 2 is planned but **not implemented** — keep Phase 1 working
without cloud credentials.

---

## 🛠 Prerequisites

Install these before cloning:

| Tool | Why you need it | When it's needed |
|---|---|---|
| **Docker** + **Docker Compose (v2+)** | Runs the whole stack | Always |
| **Make** | Runs convenience commands (`make demo`, `make test-backend`, …) | Always (optional — every target has a plain equivalent) |
| **Git** | Version control | Always |
| **Python 3.14** | Backend venv, Alembic, migrations, backend tests | Backend work |
| **Node.js 22** | Frontend dev server, type-check, lint, tests | Frontend work |

> **💡 Tip (Windows):** install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install)
> with Ubuntu and run everything inside WSL. The stack and Makefile assume a
> POSIX shell.

> **💡 No secrets directory needed.** Unlike some multi-service projects, TRACE
> has **no Docker secrets** and **no `uv`**. Credentials live in a single
> gitignored `.env` file (see below), and backend dependencies are standard
> `pip` + pip-tools.

Verify your tools:

```bash
docker --version && docker compose version
make --version
python3 --version     # 3.14.x
node --version        # v22.x (frontend work only)
```

---

## 🔧 One-Time Setup

### Step 1 — Clone

```bash
git clone <repo-url>
cd TRACE
```

### Step 2 — Create your `.env` (one file, the single source of truth)

```bash
cp .env.example .env
make check-env      # fails loudly listing any variable you're missing
```

`.env` is **gitignored — never commit it**. It holds host-side values
(`DATABASE_URL` on `localhost`, etc.). Compose composes the *container's*
`DATABASE_URL` from `POSTGRES_*`, so a host-side URL never leaks into a
container. See [Environment variables](#environment-variables) for the full
list.

### Step 3 — Bring up the whole system with one command

```bash
make demo
```

This builds the four images (first build takes a few minutes), starts the
database first, then the backend — whose entrypoint **runs `alembic upgrade
head` and the idempotent demo seed automatically** — then the frontend and the
email catcher. `make demo` waits until the API answers `/health`.

You're done when you see **`TRACE is up 🧭`**. If you don't have `make`, the
same thing is:

```bash
docker compose up --build -d
```

### Step 4 — Verify

```bash
make ps                        # all four services should be running/healthy
docker compose logs backend    # entrypoint prints migrations → seed → uvicorn
```

### Step 5 — Log in (seeded accounts)

The seed creates one account per role. **These are the demo logins:**

| Role | Email | Password |
|---|---|---|
| User (lost items reported here) | `ada@example.com` | `SuperSecret1!` |
| User (found items registered here) | `bob@example.com` | `SuperSecret1!` |
| Lost & Found Officer | `officer@example.com` | `TestPass123!` |
| Administrator | `admin@example.com` | `TestPass123!` |

Each login routes automatically to that role's portal.

### Step 6 — Host tooling (only when you work on the backend)

Running the stack needs no host Python. Alembic authoring and backend tests do:

```bash
make venv          # creates backend/.venv and installs requirements/local.txt
```

The venv is gitignored. See [Testing](#-testing) and [Alembic](#adding-a-database-migration).

---

## 🗺 Understanding the Codebase

TRACE is a **monorepo** — backend, frontend, and docs live together.

```
TRACE/
│
├── backend/                     # 🟢 FastAPI — the modular monolith
│   ├── app/
│   │   ├── main.py               #    FastAPI app + router wiring
│   │   ├── config.py             #    Reads the repo-root .env (fails fast if missing)
│   │   ├── db.py                 #    Session/engine + Base
│   │   ├── models/               #    SQLAlchemy models — the 11 entities, one file each
│   │   └── modules/              #    The six modules (see below)
│   ├── alembic/                  #    Migrations (generated from app/models)
│   ├── tests/                    #    pytest suite (test_auth, test_items, test_claims, …)
│   ├── requirements/             #    base.in/.txt, local.in/.txt, test.in/.txt (hash-pinned)
│   ├── seed.py                   #    Idempotent demo seed
│   ├── docker-entrypoint.sh      #    migrate → seed → uvicorn (runs on every start)
│   └── Dockerfile
│
├── frontend/                    # ⚛️ React 19 + Vite + Tailwind
│   ├── src/
│   │   ├── main.tsx              #    Entry point (providers + router)
│   │   ├── App.tsx               #    Route table / role portals
│   │   ├── lib/                  #    api.ts, auth.ts, auth-context.tsx, types.ts, filterRows.ts
│   │   ├── hooks/                #    useFetch / useAuthedFetch
│   │   ├── components/
│   │   │   ├── layout/           #       AppShell (sidebar + topbar, one per portal)
│   │   │   ├── ui/               #       Modal, Button, Field, Card, Toast, StatusBadge, …
│   │   │   └── profile/          #       ProfileModal
│   │   └── routes/
│   │       ├── auth/             #       Login, Register, success screens
│   │       ├── user/             #       Student portal
│   │       ├── officer/          #       Officer portal
│   │       ├── admin/            #       Administration portal
│   │       └── guards.tsx        #       Auth/role route guards
│   ├── vitest.config.ts          #    Vitest + coverage thresholds
│   └── package.json
│
├── assets/diagrams/             # 📐 data-model.md (11 entities) and data-flow.md — binding
├── design/                      # 🎨 Design references/mockups
├── demo/                        # 🌐 Static product demo (deployed to GitHub Pages on `deploy`)
├── issues/                      # 🗂 Trace_Issues.md (task breakdown) + completed.md
├── .github/workflows/           # 🔄 CI: backend tests, frontend tests, Pages deploy
├── docker-compose.yml           # The four services (db, backend, frontend, mailpit)
├── Makefile                     # Every developer command
├── ABOUT.md                     # Architecture (binding)
├── Notes.md                     # Technical reference (API, entities, env vars, migrations)
├── Review.md                    # Decision record (ADR-style "why")
├── README.md                    # Course brief / project overview
└── Tutorial.md                  # End-to-end demo walkthrough
```

### Module layout (backend)

Every module under `backend/app/modules/<name>/` follows the same shape, which
is also the module boundary:

```
<module>/
├── router.py        # HTTP routes (thin — validate, call service, commit)
├── schemas.py       # Pydantic request/response models
├── service.py       # Business logic + the module's public in-process API
└── admin_router.py  # (Auth only) administrator-only account management
```

**Import rule:** cross-module calls go through the other module's service
functions (e.g. Matching calls `claims.service.create_from_match`). Never call
another module's HTTP routes, and never import another module's ORM internals.
The one sanctioned dependency is **Matching → Claims** (one-way); Claims must
never import Matching.

### Services and ports

| Service | Host URL / port | What it is |
|---|---|---|
| **Frontend** | <http://localhost:5173> | Built React bundle served by nginx (not the Vite dev server) |
| **Backend API** | <http://localhost:8000> | FastAPI — docs at `/docs`, liveness at `/health` |
| **Database** | `localhost:5432` | Postgres 16 (user `trace`, password from `.env`) |
| **Mailpit** | <http://localhost:8025> | Email inbox; SMTP on `localhost:1025` |

```
            ┌────────────┐
            │  Frontend  │  built React bundle (nginx) :5173
            └─────┬──────┘
                  │  fetch  (VITE_API_URL, baked at build time)
            ┌─────▼──────┐
            │  Backend   │  FastAPI :8000  ── six modules, in-process ──┐
            └──┬──────┬──┘                                             │
               │      │                                                │
        ┌──────▼──┐ ┌─▼───────────┐                            (matching, claims,
        │ Postgres│ │  Mailpit    │                             notifications…)
        │  :5432  │ │  :8025/:1025│
        └─────────┘ └─────────────┘
```

### Request lifecycle (follow it in the code)

1. **Register** → `frontend/src/routes/auth/Register.tsx` → `POST /auth/register` → `modules/auth/router.py`.
   Self-registration always creates role `User`.
2. **Login** → `POST /auth/login` → a signed JWT. The frontend decodes the
   claims (`frontend/src/lib/auth.ts`) and routes to the portal for `Role`.
3. **Report an item** → `POST /items/lost` (or `/items/found`) → row persisted,
   then the matching engine runs as a **BackgroundTask** so the response never
   waits on scoring.
4. **Match appears** → `GET /matches` (a User only ever sees matches touching
   their own items). Accepting calls `POST /matches/{id}/accept`, which flips
   `Match.Status` and creates the `Claim` **in one transaction**, then emails
   the parties (background).
5. **Officer verifies** → `POST /claims/{id}/verify` (approve moves
   `LostItem → Claimed`, `FoundItem → Claimed`) and `POST /claims/{id}/collect`
   (moves them to `Closed` / `Returned`). Both are atomic and write an
   `AuditLog` row.

### Documentation contract (read this before changing anything)

TRACE keeps its documentation deliberately layered. If your change touches a
contract, update the matching doc **in the same PR**:

| Doc | Authority | Update when |
|---|---|---|
| `ABOUT.md` | **Binding** architecture | Module boundaries or the Phase 1/2 seams change |
| `assets/diagrams/data-model.md` | **Binding** entities | A column/table is added or changed |
| `assets/diagrams/data-flow.md` | **Binding** role access | Who touches which entity changes |
| `Notes.md` | Technical reference | An endpoint, env var, migration, or entity changes |
| `Review.md` | Decision record | You make a non-obvious choice others would re-litigate |
| `issues/Trace_Issues.md` + `issues/completed.md` | Task tracking | You start/finish a milestone task |
| `README.md` / `Tutorial.md` | Entry points | User-facing setup or the demo flow changes |

The rule is simple: **a future reader should never have to re-litigate a
decision, and should never find the docs disagreeing with the code.**

### Key architecture decisions

| Decision | Why |
|---|---|
| **Modular monolith, one deployable** | Team size + timeline favor one app; a single transaction boundary keeps matching → claim → verification consistent |
| **In-process module calls, no HTTP/queue between modules** | Simpler, transactional, and still extractable into microservices later |
| **Integer identity PKs, snake_case tables** | Simpler FK/indexes than UUIDs; maps cleanly onto the `Entities.md` names |
| **Native Postgres enums storing exact `Entities.md` spellings** | Real type safety; enum *values* must match the entity doc case-for-case |
| **JWT bearer tokens; authorization re-checks the live DB role** | Role changes take effect immediately; the token's `Role` claim is informational only |
| **Role scoping inside each endpoint, cross-user access → `404` not `403`** | One route tree serves all roles, and a User can never confirm another user's row exists |
| **Hash-pinned dependencies (`--require-hashes`)** | Reproducible builds; CI and the Docker image install the same locked set |
| **Built static frontend bundle (nginx), not a dev-server container** | `docker compose up` from a clean checkout is the only prerequisite for a demo |
| **Local Mailpit + local disk** | Phase 1 needs no cloud accounts; both sit behind swappable interfaces |

---

## 💻 Day-to-Day Development

### Common `make` commands

```bash
# Bring everything up (build + migrate + seed + wait)
make demo

# Start / stop without rebuilding (data volume preserved)
make up
make down

# Logs and status
make logs
make ps

# Stop and wipe ALL data — fresh demo reset
make clean

# Re-run the idempotent demo seed against the running stack
make seed

# Migrations
make migrate-backend       # alembic upgrade head inside the backend container (idempotent)
make check-migrations      # fail unless the history has exactly ONE head

# Config sanity
make check-env             # .env defines every variable from .env.example

# Host environment (backend venv: Alembic CLI, ruff, pip-tools)
make venv

# Tests
make test-backend
make test-frontend
make test                  # both

# Lint / format backend (ruff)
make lint-backend
make lint-backend-fix

# Re-pin dependency lockfiles (do NOT hand-edit the .txt files)
make update-requirements            # backend + frontend
make update-requirements-backend
make update-requirements-frontend
```

Run `make` with no target to list everything with its one-line description.

### Environment variables

`.env` at the repo root is the **single source of truth** (copy
`.env.example`). `make check-env` fails if a variable is missing and warns
about stale extras.

| Variable | Consumed by | Notes |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `docker-compose.yml`, host tools | Database name / role / password |
| `DATABASE_URL` | `app/config.py`, Alembic, seed | Host-side URL on `localhost`; the compose backend builds its own `db`-host URL |
| `JWT_SECRET` | Backend | Signing secret — never hardcode or commit it |
| `JWT_EXPIRE_MINUTES` | Backend | Access-token lifetime (default 60) |
| `STORAGE_BACKEND` | Backend | `local` now; `supabase` in Phase 2 |
| `UPLOAD_DIR` | `LocalDiskStorage` | Upload root for host-side runs; the container pins `/app/uploads` |
| `EMAIL_BACKEND` | Backend | `smtp` now; `resend` in Phase 2 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` | Backend | `mailpit:1025` in compose; `localhost:1025` for a host-side backend |
| `VITE_API_URL` | Frontend | **Build-time** — baked into the bundle; changing it needs a rebuild |

> **Rule:** every environment-dependent value lives in `.env`/`.env.example`
> only. A repo-wide search for a value should match the env files, `${VAR}`
> interpolation, or an `ARG` — nowhere else.

### Workflow example 1 — add a backend endpoint

1. Pick the owning module under `backend/app/modules/<name>/` (or create a new
   module package with `__init__.py`, `router.py`, `schemas.py`, `service.py`).
2. Add request/response models in that module's `schemas.py`. Reuse the model
   enums so the API cannot drift from the entities.
3. Add the route in `router.py`. Put business logic in `service.py`; keep the
   route thin. Use `get_current_user` / `require_role(...)` from
   `modules/auth/deps.py` for auth, and commit once per request.
4. Wire a new module router into `backend/app/main.py` if it's new.
5. If it returns data with role scoping, reuse the scoping pattern (`is_staff`,
   `get_scoped`) and remember: **cross-user access returns `404`, never `403`.**
6. Add tests under `backend/tests/test_<module>.py`.
7. Update `Notes.md` with the endpoint and `Review.md` if you made a judgment
   call. Try it at <http://localhost:8000/docs>.

### Workflow example 2 — adding a database migration

Migrations are generated from the models in `backend/app/models/`. **Never**
hand-edit `down_revision`, and never delete a migration file.

```bash
# 1. Sync first — never generate off a stale local history
git checkout develop && git pull --rebase

# 2. Verify the history is a single line BEFORE generating
make check-migrations        # must say exactly one head

# 3. Create the migration (host venv required: `make venv`)
cd backend && .venv/bin/alembic revision --autogenerate -m "describe the change"

# 4. Re-check heads, apply, then re-check again
make check-migrations
make migrate-backend
```

Three rules that keep demos alive:

- **One head at all times.** Two engineers generating migrations without
  syncing `develop` is what branched the history once before. If you ever see
  two heads, merge them (`alembic merge -m "merge heads" <head1> <head2>`)
  before writing anything on top.
- **Migrations are additive and nullable** — never a destructive `ALTER`, and
  never a backfill that could fail on a live demo volume.
- **Adding/changing a column is a deviation from the data-model contract** —
  update `assets/diagrams/data-model.md` and `Notes.md` §4 in the same PR.

The container entrypoint runs `alembic upgrade head` automatically on every
start, so a running demo is always up to date; `make migrate-backend` is for
explicit control against an already-running stack.

### Workflow example 3 — change the frontend

- Screens live in `frontend/src/routes/<role>/`; shared primitives in
  `frontend/src/components/ui/`; the shared shell (`AppShell`) in
  `components/layout/`.
- Use the existing primitives (`Modal`, `Button`, `Field`, `Card`, `Toast`)
  and the design-system tokens — don't introduce a new component library or a
  second modal pattern.
- API calls go through `frontend/src/lib/api.ts`; session/auth state through
  `lib/auth-context.tsx`. Mirror backend payloads in `lib/types.ts`.
- For a dev server with hot reload: `cd frontend && npm install && npm run dev`
  (copy `frontend/.env.example` → `frontend/.env` if present, or set
  `VITE_API_URL=http://localhost:8000`).
- Before pushing: `npm run build` (type-checks + builds), `npm run lint`, and
  `npm run test:coverage`.

### Workflow example 4 — extend the demo seed

`backend/seed.py` is **idempotent**: re-running it must never duplicate rows.
If you add demo data, make it upsert-by-natural-key and keep the deliberately
matching pair (score `100.00`) intact so a fresh `make demo` still shows two
suggestions. Add an assertion to the seed where it's cheap to do so.

---

## 🌿 Git Workflow

### Branch naming

Branch from **`develop`**, not `main`:

```bash
git checkout develop
git pull --rebase origin develop
git checkout -b feature/short-description
```

| Prefix | Use for | Example |
|---|---|---|
| `feature/` | New functionality | `feature/display-enrichment` |
| `fix/` | Bug fixes | `fix/modal-focus-loss` |
| `refactor/` | Internal restructuring | `refactor/items-scoping` |
| `docs/` | Documentation only | `docs/update-notes` |
| `chore/` | Maintenance, deps, CI | `chore/repin-requirements` |

### Commit messages

Conventional-commit style, focused on the **why**:

```
<type>: <short description>

<optional longer description — why, not what>

<optional footer>
```

Examples:

```
feat: expose staff-only reporter/claimant names on list responses
fix: resolve modal inputs losing focus on every keystroke
refactor: centralise item role scoping in items/service
docs: record the profile retrofit in Review.md
chore: re-pin backend requirements
```

### Pull request flow

1. Create your branch from `develop`.
2. Make the change, following the module boundaries and docs contract.
3. Run the checks locally:
   ```bash
   make check-migrations
   make check-env
   make lint-backend
   make test-backend
   make test-frontend      # needs Node 22
   make test
   ```
4. Push your branch and open a PR **against `develop`**.
5. Request at least one review; address feedback with additional commits.
6. Merge once approved (squash merge preferred).

> **Don't push directly to `main` or `develop`.** Open a PR. All changes go
> through review, and CI (`.github/workflows/`) must be green.

---

## 🧪 Testing

TRACE has two test suites, both run in CI:

| Suite | Framework | Location | Wrapper |
|---|---|---|---|
| **Backend** | pytest (+ FastAPI `TestClient`) | `backend/tests/`, files named `test_<module>.py` | `make test-backend` |
| **Frontend** | Vitest + Testing Library | `frontend/src/**/*.test.tsx` | `make test-frontend` |

### Backend tests

```bash
make venv                 # once — creates backend/.venv
make test-backend         # installs test.txt, then runs pytest with coverage

# focused run while developing
cd backend && .venv/bin/python -m pytest tests/test_items.py -q
cd backend && .venv/bin/python -m pytest -k "staff" -q
```

Notes:

- The suite runs against an **in-memory SQLite database** (`backend/tests/conftest.py`
  overrides the DB dependency), so unit tests need **no running Postgres and no
  network** — they are hermetic and fast.
- Shared fixtures (`user`, `officer`, `admin`, `lost_item`, `claim`, tokens…)
  live in `conftest.py`. Prefer them over ad-hoc setup.
- Coverage is reported over `app/` (`--cov=app`); CI uploads `coverage.xml`.

### Frontend tests

```bash
cd frontend
npm ci                    # install exactly the lockfile
npm run test              # vitest run
npm run test:coverage     # with coverage thresholds (lines/statements: 35%)
```

Notes:

- Tests use `jsdom` and a shared `renderWithProviders` helper
  (`src/test-utils.tsx`) that wraps `AuthProvider`, `ToastProvider`, and the
  router. Sign in a fake user with `storeToken(fakeJwt({...}))` first.
- Network calls are stubbed with `vi.stubGlobal("fetch", …)` — follow the
  existing patterns rather than hitting a real API.
- Mocks must be reset between tests (`afterEach` → `vi.unstubAllGlobals()`,
  `clearToken()`).

### When you add code, add tests

- **Unit tests** for business logic and helpers (scoping, scoring, status
  transitions).
- **API tests** for endpoint behaviour: status codes, validation, auth, and
  **role scoping** — test both a `User` and an `Officer` call.
- **Component tests** for user-visible behaviour, not implementation details.

### Test guidelines

- Don't test the database engine in unit tests — use the SQLite fixtures.
- Assert the contract the docs promise (`Notes.md`); that's what future
  readers rely on.
- New endpoints that touch roles must include a **cross-user probe** proving
  the `404` (not `403`) behaviour.

---

## 📏 Code Quality

### Linting and formatting

| Area | Tool | Command |
|---|---|---|
| Backend | **ruff** (lint + format) | `make lint-backend` / `make lint-backend-fix` |
| Frontend | **oxlint** | `cd frontend && npm run lint` |
| Frontend types | **TypeScript** | `cd frontend && npx tsc -b` (also run by `npm run build`) |

There is **no pre-commit hook in TRACE** — run these locally before you push.
CI runs them for you as a backstop.

### Code style guidelines

| Rule | Python | TypeScript |
|---|---|---|
| **Formatting** | ruff format (double quotes) | existing style (single quotes in React code) |
| **Indentation** | 4 spaces | 2 spaces |
| **Naming** | `snake_case` functions/vars, `PascalCase` classes | `camelCase` functions/vars, `PascalCase` components/types |
| **Types** | Type hints on functions | Full TypeScript types; no `any` without a comment |
| **Imports** | stdlib → third-party → `app.*` | react → third-party → local |
| **Docstrings** | Explain *why* on non-obvious code | JSDoc on shared primitives |

### What we don't do

| ❌ Never do this | ✅ Instead |
|---|---|
| `f"SELECT * FROM {user_input}"` | Parameterised queries via SQLAlchemy |
| Import another module's ORM internals / call its HTTP routes | Call that module's `service.py` function |
| Return `403` for a User reaching another user's row | Return **`404`** (never confirm the row exists) |
| Hardcode secrets or commit `.env` | `.env` is gitignored; keep it that way |
| Hand-edit `requirements/*.txt` or `package-lock.json` | Edit the `.in` / `package.json`, then `make update-requirements` |
| Add a non-nullable column in a migration | Additive, nullable migrations only |
| Push directly to `main` / `develop` | Branch + PR |
| Introduce a new modal/component library | Reuse `components/ui/*` and the design tokens |

---

## ✅ Pull Request Checklist

- [ ] My branch is up to date with `develop` and branched from it
- [ ] The change respects module boundaries (no cross-module HTTP/ORM imports)
- [ ] Role scoping is preserved — I tested a `User` **and** an `Officer` call
- [ ] Cross-user access returns `404`, not `403`
- [ ] `make check-migrations` reports exactly one head (if I touched migrations)
- [ ] `make check-env` passes (if I touched `.env.example`)
- [ ] `make lint-backend` and `npm run lint` pass
- [ ] `make test-backend` and `make test-frontend` pass
- [ ] I added/updated tests for the behaviour I changed
- [ ] `Notes.md` (and `Review.md` for non-obvious choices) is updated
- [ ] `assets/diagrams/data-model.md` / `Notes.md` §4 updated for any column change
- [ ] `issues/completed.md` reflects the finished task
- [ ] No secrets, debug logs, or `.env` values were committed

---

## 📖 Glossary

| Term | Meaning |
|---|---|
| **TRACE** | Trace Recovery And Claim Engine — the system you're contributing to |
| **Modular monolith** | One deployable app with six internal modules that call each other in-process |
| **LostItem / FoundItem** | The two core report entities; a User owns theirs, staff see all |
| **Match** | A system-generated suggestion linking a `LostItem` to a `FoundItem`, with a score |
| **Claim** | Created when a User accepts a match; carries verification status and collection data |
| **VerificationRecord** | An Officer's pass/fail decision + notes on a claim |
| **CollectionRecord** | The handover record written when an approved item is collected |
| **Attachment** | An uploaded file row (stores the URL, never the bytes) |
| **AuditLog** | System/actor audit rows, one per mutating workflow step |
| **Matching engine** | The single in-process scorer (category + location + date + description similarity) |
| **`MATCH_THRESHOLD`** | Score threshold (60.00) above which a match is suggested |
| **Role scoping** | Users see only their own rows; Officers/Admins are unscoped |
| **`is_staff`** | The shared helper deciding Officer/Administrator visibility |
| **`403`→`404` convention** | Hiding existence of another user's row by returning 404 |
| **BackgroundTask** | FastAPI mechanism used so scoring/email never block a response |
| **`StorageBackend`** | Interface with `LocalDiskStorage` (Phase 1) and later `SupabaseStorage` |
| **`EmailBackend`** | Interface with SMTP/Mailpit (Phase 1) and later Resend |
| **Alembic** | The migration tool; migrations are generated from `app/models` |
| **Single-head guardrail** | `make check-migrations` + the entrypoint fail if the history branched |
| **Hash-pinned** | `pip install --require-hashes` against compiled `requirements/*.txt` |
| **pip-tools** | Compiles `.in` specs into pinned, hashed `.txt` lockfiles |
| **Idempotent seed** | `backend/seed.py` — safe to re-run; never duplicates demo data |
| **Phase 1 / Phase 2** | Local-first now; three cloud plumbing seams behind interfaces later |

---

## 🔍 Troubleshooting

### "Port already in use"

Something is using `5432`, `8000`, `5173`, `8025`, or `1025` — often a leftover
dev server or an old container.

```bash
docker compose down
# stop leftovers (adjust if your paths differ):
pkill -f "frontend/node_modules/.bin/vite" ; pkill -f "uvicorn app.main"
make demo
```

### "The backend never becomes ready"

Check where the entrypoint is stuck — migrations, seed, or uvicorn:

```bash
docker compose logs backend
docker compose ps
```

The most common cause is the database not being reachable; the backend retries
for ~30s before giving up.

### "`.env` not found" / `make check-env` fails

```bash
cp .env.example .env
make check-env
```

It lists exactly which variable names are missing. Don't add a value you can't
explain — `.env.example` defines the full set.

### "I changed code but nothing happened"

| Change | What to do |
|---|---|
| Backend Python | The compose stack does **not** hot-reload — `docker compose restart backend`, or run uvicorn on the host for dev |
| Frontend | Run `npm run dev` for HMR, or rebuild the image (`docker compose build frontend`) to see it in the bundled stack |
| Dependencies (`*.in` / `package.json`) | `make update-requirements`, then `docker compose build backend` / `frontend` |
| A new migration | `make migrate-backend` (or restart the backend — the entrypoint applies it) |

### "I need a fresh demo"

```bash
make clean      # stops everything and wipes the data volume
make demo       # fully re-seeded, pristine state
```

`make demo` alone is always safe (the seed is idempotent), but it won't
resurrect matches/claims you already consumed — only `make clean` restores the
pristine state.

### "Multiple Alembic heads" / migrations branched

This is the one incident that has bitten this repo before. Do **not** edit
`down_revision` by hand and never delete a migration file:

```bash
cd backend && .venv/bin/alembic heads
cd backend && .venv/bin/alembic merge -m "merge heads" <head1> <head2>
make check-migrations        # back to exactly one head
```

Prevent it by syncing `develop` **before** generating any migration.

### Connecting to the database

```bash
docker compose exec db psql -U trace -d trace
# host tools: host localhost, port 5432, db/user trace, password from .env
```

### "ruff / alembic / pip-compile not found"

They live in the host venv, not on your PATH:

```bash
make venv
cd backend && .venv/bin/ruff check .
```

### Frontend tests fail with "fetch is not defined" / leaked mocks

Every test that stubs `fetch` must reset globals and the session:

```ts
afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});
```

### CI is red but it passes locally

Check you're on the CI versions: **Python 3.14** (`.github/workflows/backend-unit-tests.yml`)
and **Node 22** (`.github/workflows/frontend-unit-tests.yml`). CI installs from
the pinned lockfiles (`npm ci`, `requirements/*.txt`), so a stale lockfile is a
common culprit — run `make update-requirements` if you changed dependencies.

---

## 👥 Team & getting help

- **Team members** are listed in `Contribute.txt` and the README's
  *Contributions* section.
- **Task breakdown:** `issues/Trace_Issues.md` (planned) and
  `issues/completed.md` (done).
- **"Why is it built this way?"** — check `Review.md` first; it exists so
  decisions aren't re-litigated.
- **Stuck?** Open an issue or ask in the team channel. Include the command you
  ran, the output, and `docker compose ps`.

Happy coding — and remember: *every lost item leaves a trace.* 🚀
