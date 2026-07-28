# TRACE — Consolidated Architecture Summary (Modular Monolith)

## What TRACE Is

**TRACE** (Tracking, Recovery, And Claim Engine) is a centralized lost & found platform for campuses, businesses, and public organizations. It automatically **matches** lost/found reports, runs an **ownership verification and claim workflow**, and gives admins **reporting/dashboards**.

> [!IMPORTANT]
> This is **infrastructure**, not a bulletin board. Not a classifieds platform, not a social network, not a plain database wrapper.

> [!WARNING]
> **V1 pilot scope is non-negotiable.** Scope creep disqualifies the MVP.
> -One deployment context — university campus (students, staff, visitors)
> -One claim workflow — Report → Match → Claim → Verify → Collect
> -One matching engine — Category + Location + Date + Description similarity scoring
> -One notification channel — email alerts only

### User Roles

| Role | Capabilities |
|---|---|
| **User** | Register/login, report lost/found items, upload photos, track claims, receive notifications |
| **Officer** | Verify reports, review ownership claims, approve collection, update item status |
| **Admin** | Manage users, manage categories, generate reports, configure system settings |

---

## Architecture: Modular Monolith (pivoted from microservices)

Original plan mirrored a ride-hailing project's 7-service split (`nginx / auth / trace-engine / backend / dispatcher / frontend / monitoring`). **Pivoted to a modular monolith**: one deployable app with strict internal module boundaries, able to run as multiple stateless replicas ("distributed") behind a reverse proxy — modules can be extracted into real microservices later with minimal rework.

```
nginx/         → reverse proxy + load balancer + JWT/WAF/rate-limit at the edge
trace-core/    → THE MODULAR MONOLITH (single deployable, N replicas)
celery/        → dedicated Celery worker deploy unit (imports tasks FROM trace-core)
frontend/      → React UI
monitoring/    → Prometheus/Grafana/Loki
```

> [!NOTE]
> **Clients submit reports.** The system does the matching. Officers close the loop.

### What changed vs. microservices

| Aspect | Before (microservices) | Now (modular monolith) |
|---|---|---|
| Deployment | 7 separate deployables | 1 app deployable (`trace-core`) + 1 worker deployable (`celery`), scaled independently |
| Communication | HTTP between services | In-process calls between modules, via each module's `services.py` |
| Database | One PostgreSQL per service | One PostgreSQL instance, **schema-per-module** |
| Celery | Per-service workers | **One shared Celery app**, code lives in `trace-core`, but deployed as its own top-level unit (see repo layout below) |
| nginx role | Router to different service upstreams | Load balancer across identical `trace-core` replicas |
| Future split | N/A | Any module can be extracted later — boundary discipline preserves this |

> [!TIP]
> The app layer is stateless and horizontally scalable. Add more `trace-core` replicas behind nginx to handle traffic spikes — no code changes needed as long as the statelessness rule (below) is respected.

---

## Root Repository Layout (final — mirrors the reference project structure)

```
trace-repo/
├── .github/                    ← CI workflows
├── .secrets/
│   └── postgres_user           ← Docker secrets, not raw .env values
├── assets/                     ← logos/images for docs (ABOUT.md, README.md)
├── celery/                     ← standalone Celery worker deploy unit
│   ├── Dockerfile
│   └── entrypoint               (runs `celery -A tracecore worker`, imports
│                                  task code from trace-core/modules/notifications)
├── frontend/                   ← React + Vite UI
├── trace-core/                 ← the modular monolith (replaces "trace-cms" role)
│   ├── modules/
│   │   ├── auth/
│   │   ├── matching/
│   │   ├── items/
│   │   ├── claims/
│   │   └── notifications/       (task definitions live here — celery/ just runs them)
│   ├── tracecore/ (settings/, config/urls.py, celery.py, asgi.py, wsgi.py)
│   ├── requirements/ (base/local/build/production .in + .txt)
│   ├── script/
│   ├── Dockerfile
│   └── main.py (or manage.py)
├── postgres/
│   ├── initdb/
│   │   └── init-db.sh
│   └── Dockerfile.postgres
├── nginx/
│   ├── conf/
│   ├── lua/
│   └── Dockerfile
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   ├── loki/
│   └── promtail/
├── .env
├── .env.example
├── .gitignore
├── ABOUT.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── docker-compose.yml
├── LICENSE
├── Makefile
├── README.md
├── SCHEDULE.md
├── SECURITY.md
└── SUPPORT.md
```

> [!IMPORTANT]
> **`celery/` is deployment plumbing, not a second codebase.** Its Dockerfile installs from `trace-core/requirements/` (or a shared base image) and runs the worker command — but the actual task logic (`send_match_notification`, `send_claim_update`, `send_collection_reminder`) is owned entirely by `trace-core/modules/notifications/`. This preserves the "one shared Celery app, tasks namespaced by module" rule while giving the worker its own container, its own scaling knob, and its own deploy lifecycle — matching the reference project's convention of a top-level `celery/` folder sitting next to the main app.

---

## Modules inside `trace-core/`

| Module | Owns | Calls (in-process, via services.py only) |
|---|---|---|
| **auth** | Users, roles, JWT, password reset, admin settings | — (foundational, no inbound deps) |
| **matching** (was trace-engine) | Scoring formula, duplicate detection, config weights | Reads item data via `items.services` |
| **items** (was backend) | Lost/found CRUD, images, categories, status state machine, reports | Calls `auth`, `matching`, `notifications` |
| **claims** (was dispatcher) | Claim state machine (submit→review→verify→approve→collect), evidence | Calls `auth`, `items`, `notifications` |
| **notifications** | Celery task definitions: match/claim/reminder emails — executed by the top-level `celery/` worker | Leaf module — triggered in-process by `items`/`claims` |

> [!CAUTION]
> **Golden rule**: modules never query another module's tables directly — only call its public `services.py` functions. Breaking this rule silently destroys the "extractable into microservices later" property, even if the app still works today.

---

## Item Status State Machine (in `items`)

```
PENDING_REVIEW → OPEN → MATCHED → CLAIMED → CLOSED
```
`PENDING_REVIEW → OPEN` is **officer-only** (this is where "Officer verifies reports" lives — distinct from claim verification).

## Claim State Machine (in `claims`)

```
SUBMITTED → UNDER_REVIEW → VERIFIED → APPROVED → COLLECTED
                    ↓            ↓
                 REJECTED     REJECTED
```

---

## Resolved Gaps (folded into module design)

| Gap (from microservices version) | Fix in monolith |
|---|---|
| Match-found notification had no trigger path | `items` calls `notifications.services` directly, in-process, after a match is found — actual sending happens in the `celery/` worker |
| Officer report-verification had no state | `PENDING_REVIEW → OPEN` transition added to `items`, officer-gated |
| No home for admin system settings | Added to `auth` module (`/auth/settings`) |
| Claim evidence upload undefined | `claims` reuses `items`' existing S3 image storage service instead of a separate client |

---

## Build Order

1. **`trace-core/`** — build modules in dependency order: `auth` → `matching` → `items` → `claims`/`notifications` (sequential in one repo, not parallel teams)
2. **`celery/`** — thin worker deploy unit, built once `notifications` module has task definitions to run
3. **`nginx/`** — reverse proxy + LB config (`least_conn` upstream of `trace-core` replicas), JWT/WAF/rate-limit unchanged from before
4. **`frontend/`** — build against `trace-core`'s OpenAPI spec
5. **`monitoring/`** — last; scrapes `trace-core` replicas, `celery` worker, and nginx

---

## Non-negotiables for the monolith

- **Statelessness**: sessions/tokens live in Redis, not in-memory, so nginx can load-balance across `trace-core` replicas
- **Schema-per-module** in the single PostgreSQL instance, enforced by convention + migrations scoped per module
- **No cross-module ORM imports** — enforced via code review or a lint/test rule
- **Celery stays a deploy-unit split, not a code split** — `celery/` never defines its own task logic, only runs what `trace-core/modules/notifications/` provides
- **README "extraction guide"** documenting what it would take to pull any one module into a standalone service later

---

## Deployment Reality Check

> [!IMPORTANT]
> The full architecture (nginx + trace-core + celery + Postgres + Redis + monitoring, orchestrated via `docker-compose.yml`) **cannot run as-is on Vercel, GitHub Pages, or free serverless platforms.** Those platforms don't execute Docker Compose, don't run persistent background workers, and don't provide always-on databases for free.

> [!TIP]
> **Demo-only deployment** (cheapest, good enough to showcase the product):
> -`frontend/` → Vercel or Render Static Site (free, no sleep)
> -`trace-core/` → Render free Web Service (free, sleeps after 15 min idle, ~30-50s cold start)
> -Postgres → Render free Postgres (free, auto-deleted after 30 days — re-seed as needed)
> -`celery/` + `nginx/` + `monitoring/` → **skipped for the demo** (fake notifications inline inside `trace-core`, rely on Render's own edge instead of nginx, drop the observability stack entirely)

> [!WARNING]
> A **faithful production deployment** matching the full architecture (persistent Postgres, a real `celery/` worker, nginx, monitoring) requires either paid Render tiers (~$25–40+/mo, since background workers aren't on Render's free tier) or a single low-cost VPS (~$4–6/mo) running the actual `docker-compose.yml` unchanged. There is currently no genuinely free way to run the complete stack as designed.

## Open Decision
s
Whether to add a root-level `docker-compose.yml` orchestrating `trace-core` (N replicas) + `celery` + `nginx` + `frontend` + `monitoring` for local dev — and separately, whether to build the demo-mode deployment (Render free tier) as an explicit, documented "lite mode" alongside the full architecture.