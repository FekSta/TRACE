# TRACE — Consolidated Architecture Summary (Modular Monolith)

## What TRACE Is

**TRACE** (Tracking, Recovery, And Claim Engine) is a centralized lost & found platform for campuses, businesses, and public organizations. It automatically **matches** lost/found reports, runs an **ownership verification and claim workflow**, and gives admins **reporting/dashboards** — not a classifieds board or plain database wrapper.

**V1 pilot scope**: one context (university campus), one claim workflow (Report → Match → Claim → Verify → Collect), one matching engine (category + location + date + description scoring), one notification channel (email).

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
frontend/      → React UI
monitoring/    → Prometheus/Grafana/Loki
```

### What changed vs. microservices
| Aspect | Before (microservices) | Now (modular monolith) |
|---|---|---|
| Deployment | 7 separate deployables | 1 deployable (`trace-core`), scaled via replicas |
| Communication | HTTP between services | In-process calls between modules, via each module's `services.py` |
| Database | One PostgreSQL per service | One PostgreSQL instance, **schema-per-module** |
| Celery | Per-service workers | One shared Celery app, tasks namespaced by module |
| nginx role | Router to different service upstreams | Load balancer across identical `trace-core` replicas |
| Future split | N/A | Any module can be extracted later — boundary discipline preserves this |

---

## Modules inside `trace-core/`

| Module | Owns | Calls (in-process, via services.py only) |
|---|---|---|
| **auth** | Users, roles, JWT, password reset, admin settings | — (foundational, no inbound deps) |
| **matching** (was trace-engine) | Scoring formula, duplicate detection, config weights | Reads item data via `items.services` |
| **items** (was backend) | Lost/found CRUD, images, categories, status state machine, reports | Calls `auth`, `matching`, `notifications` |
| **claims** (was dispatcher) | Claim state machine (submit→review→verify→approve→collect), evidence | Calls `auth`, `items`, `notifications` |
| **notifications** | Celery tasks: match/claim/reminder emails | Leaf module — triggered by `items`/`claims` |

**Golden rule**: modules never query another module's tables directly — only call its public `services.py` functions. This is what keeps future microservice extraction viable.

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
| Match-found notification had no trigger path | `items` calls `notifications.services` directly, in-process, after a match is found |
| Officer report-verification had no state | `PENDING_REVIEW → OPEN` transition added to `items`, officer-gated |
| No home for admin system settings | Added to `auth` module (`/auth/settings`) |
| Claim evidence upload undefined | `claims` reuses `items`' existing S3 image storage service instead of a separate client |

---

## Build Order
1. **`trace-core/`** — build modules in dependency order: `auth` → `matching` → `items` → `claims`/`notifications` (sequential in one repo, not parallel teams)
2. **`nginx/`** — reverse proxy + LB config (`least_conn` upstream of `trace-core` replicas), JWT/WAF/rate-limit unchanged from before
3. **`frontend/`** — build against `trace-core`'s OpenAPI spec
4. **`monitoring/`** — last; scrapes `trace-core` replicas + nginx

---

## Non-negotiables for the monolith
- **Statelessness**: sessions/tokens live in Redis, not in-memory, so nginx can load-balance across replicas
- **Schema-per-module** in the single PostgreSQL instance, enforced by convention + migrations scoped per module
- **No cross-module ORM imports** — enforced via code review or a lint/test rule
- **README "extraction guide"** documenting what it would take to pull any one module into a standalone service later

## Open Decision
Whether to add a root-level `docker-compose.yml` orchestrating `trace-core` (N replicas) + `nginx` + `frontend` + `monitoring` for local dev.