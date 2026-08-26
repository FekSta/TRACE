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

---

## [Module 2] Auth module — register/login/JWT

**Closed:** 2026-08-12
**Branch:** `feature/auth-register-login-jwt`
**Definition of done met:** a curl login against the locally running backend returned an access token whose decoded payload (PyJWT, decoded with the app's own `JWT_SECRET`) contains `UserID` and `Role` claims. Register → 201, duplicate email → 409, wrong password / unknown email → 401, Suspended account → 403, validation → 422 — all verified with curl.

**Files committed:**
- `backend/requirements.txt`
- `backend/app/config.py` (env loading, JWT settings, bcrypt rounds)
- `backend/app/db.py` (engine + `SessionLocal` + `get_db`)
- `backend/app/main.py` (FastAPI app)
- `backend/app/modules/__init__.py`
- `backend/app/modules/auth/__init__.py`
- `backend/app/modules/auth/schemas.py` (register/login/response/token schemas)
- `backend/app/modules/auth/security.py` (bcrypt + JWT helpers)
- `backend/app/modules/auth/router.py` (register/login)
- `.env.example` (`JWT_SECRET` lengthened to 45 chars)

**Commits:**
- `feat: add register and login endpoints with JWT issuance`

---

## [Module 2] Reusable `require_role` dependency

**Closed:** 2026-08-12
**Branch:** `feature/require-role-dependency`
**Definition of done met:** `GET /items/lost` (outside the Auth module) uses `require_role("User", "Officer", "Administrator")` — no token → 401, valid User/Officer/Admin token → 200; the throwaway `GET /auth/test-protected` (admin-only) returned 401 without a token, 403 for User and Officer tokens, 200 for an Administrator token; expired and garbage tokens → 401. Role gating demonstrably discriminates across all three roles.

**Files committed:**
- `backend/app/modules/auth/deps.py` (`get_current_user`, `require_role`)
- `backend/app/modules/auth/router.py` (throwaway `GET /auth/test-protected`)
- `backend/app/modules/items/__init__.py`
- `backend/app/modules/items/router.py` (protected `GET /items/lost` stub)
- `backend/app/main.py` (wire items router)

**Commits:**
- `feat: add require_role dependency and protect items stub route`

---

## [Module 3] Category + LostItem/FoundItem CRUD

**Closed:** 2026-08-12
**Branch:** `feature/category-lostitem-founditem-crud`
**Definition of done met:** curl created, listed, updated, and deleted Category, LostItem, and FoundItem against the live backend. Scoping enforced on every endpoint: UserA could not GET/PATCH/DELETE UserB's items (all 404), Users list only their own rows, Officer lists all rows unscoped and can update any item's status; Category mutations 403 for non-Administrators; new LostItems start at `Reported`, FoundItems at `Available`; invalid/inactive category → 400; no token → 401.

**Files committed:**
- `backend/app/modules/items/schemas.py`
- `backend/app/modules/items/service.py` (scoping helpers)
- `backend/app/modules/items/categories.py`
- `backend/app/modules/items/lost_found.py`
- `backend/app/modules/items/router.py` (aggregate)
- `backend/app/modules/items/__init__.py`

**Commits:**
- `feat: add Category, LostItem and FoundItem CRUD with role-based scoping`

---

## [Module 3] `StorageBackend` interface + `LocalDiskStorage` implementation

**Closed:** 2026-08-12
**Branch:** `feature/storage-backend-local-disk`
**Definition of done met:** uploading a file via `POST /items/lost/{id}/attachments` returned 201 with an `Attachment` row whose `file_path` is a working URL; `GET /media/<uuid>_<name>` fetched the file back with identical content; unknown-file and path-traversal requests → 404; `grep` confirmed zero filesystem I/O outside `storage.py` (all writes go through `storage.save(...)`); cross-user upload → 404, officer upload → 201, no token → 401.

**Files committed:**
- `backend/app/modules/items/storage.py` (`StorageBackend`, `LocalDiskStorage`, singleton)
- `backend/app/modules/items/uploads.py` (upload routes + `/media/{filename}`)
- `backend/app/models/attachment.py` (+`entity_id`, interpretation of `Entities.md` — see `Review.md`)
- `backend/alembic/versions/60ec8bad202b_add_attachment_entity_id.py`
- `backend/app/modules/items/router.py`, `backend/app/config.py` (`UPLOAD_DIR`)
- `backend/requirements.txt` (`python-multipart`)
- `docker-compose.yml` (`trace_uploads` volume), `backend/uploads/.gitkeep`, `.env.example`

**Commits:**
- `feat: add StorageBackend interface and LocalDiskStorage`
- `feat: add Attachment entity_id column with migration`
- `chore: add uploads volume to docker-compose.yml`

---

## [Module 4] `similarity.py` scoring function + shell tests

**Closed:** 2026-08-12
**Branch:** `feature/similarity-scoring`
**Definition of done met:** ran the pure `score_pair()` against three hand-written sample dicts (obvious match / obvious non-match / partial match) in the backend's Python shell and captured the transcript (`/tmp/similarity_shell_test.txt`, reproduced in `Notes.md` §10.1): `OBVIOUS MATCH: score=100.00 (SUGGESTED) reason='same category (category 1); same location; same date; 100% description overlap'`; `OBVIOUS NON-MATCH: score=0.00 (below threshold) reason='Different category (category 1 vs 3)'`; `PARTIAL MATCH: score=78.22 (SUGGESTED) reason='same category (category 2); 3 day(s) apart; 71% description overlap'` — before any API wiring existed. Note: Phase 1 runs the backend from `backend/.venv` on the host (only Postgres is containerized), so the shell test ran in the exact interpreter the API uses (see `Review.md` §Module 4).

**Files committed:**
- `backend/app/modules/matching/__init__.py`
- `backend/app/modules/matching/utils/__init__.py`
- `backend/app/modules/matching/utils/similarity.py` (`score_pair`, `MatchResult`, `MATCH_THRESHOLD`)

**Commits:**
- `feat: add similarity.py scoring function`

---

## [Module 4] Wire matching into item creation via BackgroundTask

**Closed:** 2026-08-12
**Branch:** `feature/matching-background-task`
**Definition of done met:** creating a FoundItem matching an existing LostItem returned `201` in **~106 ms** (creation did not wait on scoring) and a `Match` row (`score=100.00`, `status=Suggested`, human-readable `match_reason`) was queryable via `GET /matches` immediately after. Verified through the live API: obvious match → `100.00` Suggested; obvious non-match (different category) → no row; partial match → `78.22` Suggested (matches the shell test exactly); scoping (grace sees 0, officer sees all, cross-user accept → 404); accept → `Accepted`, reject → `Rejected`, re-resolution → 409; filters `?status=`, `?item_id=`, `?user_id=`.

**Files committed:**
- `backend/app/modules/matching/service.py` (BackgroundTask runners, de-dup, scoped-match helper)
- `backend/app/modules/matching/schemas.py` (`MatchResponse`)
- `backend/app/modules/matching/router.py` (`GET /matches`, accept/reject)
- `backend/app/modules/items/lost_found.py` (creation registers the background task)
- `backend/app/main.py` (includes matching router)

**Commits:**
- `feat: wire matching into item creation via BackgroundTask`
- `feat: add GET /matches and accept/reject endpoints`

---

## [Module 5] Claim creation from accepted Match

**Closed:** 2026-08-13
**Branch:** `feature/claim-creation-from-match`
**Definition of done met:** accepting a `Suggested` Match via the live API produced a `Claim` row (id 1) correctly linked to the originating `LostItem` (id 7), `FoundItem` (id 6), and `User` (id 1, the LostItem reporter) with `VerificationStatus=Pending`, `Status=Active`, and a `ClaimCreated` AuditLog row — and the handoff is a **direct function call**: `matching/router.py:103` calls `claims.service.create_from_match` (AST-verified call site; `claims/service.py` contains no `matching` import, so the import graph is one-way). The `Match.Status→Accepted` flip and the `Claim` row commit in one transaction. Scoping confirmed: finder sees `[]` on `GET /claims`, cross-user `GET /claims/1` → 404.

**Files committed:**
- `backend/app/modules/claims/__init__.py`
- `backend/app/modules/claims/schemas.py` (ClaimResponse)
- `backend/app/modules/claims/service.py` (`audit`, `get_scoped_claim`, `create_from_match`)
- `backend/app/modules/claims/router.py` (`GET /claims`, `GET /claims/{id}`)
- `backend/app/modules/matching/router.py` (accept calls `create_from_match`)
- `backend/app/main.py` (wire claims router)

**Commits:**
- `feat: add claims module with create_from_match`
- `feat: wire claim creation into matching accept endpoint`

---

## [Module 5] Verify/approve/reject + VerificationRecord/CollectionRecord

**Closed:** 2026-08-13
**Branch:** `feature/claim-verify-collect-workflow`
**Definition of done met:** all three outcomes verified with curl and the status explanation written into `Notes.md` §11.3 (before → after for `Claim.VerificationStatus`, `Claim.Status`, `LostItem.Status`, `FoundItem.Status`): **approve** → `Pending→Approved` / `Active` / `Reported→Claimed` / `Available→Claimed`; **reject** → `Pending→Rejected` / `Active→Cancelled` / `Reported→Reported` / `Available→Available`; **collect** → `Approved→Approved` / `Active→Completed` / `Claimed→Closed` / `Claimed→Returned`. Each outcome was exercised end to end: approve wrote a `VerificationRecord` (`Passed`), collect wrote a `CollectionRecord` and set `CollectionDate`, reject recorded `VerificationNotes` and a `Failed` record. The three-way approval update is atomic — proven by forcing an `IntegrityError` (bad `officer_id` on the `VerificationRecord`) mid-transaction and confirming a full rollback (`Pending`/`Reported`/`Available` unchanged, no partial record). Guards tested: non-Officer verify/collect → 403, collect-before-approve → 400, re-verify/collect on terminal states → 400, `result:"Pending"` → 422, unknown claim → 404. AuditLog holds exactly one row per mutation (`ClaimCreated`/`ClaimApproved`/`ClaimRejected`/`ClaimCollected`, 6 rows across the full test run).

**Files committed:**
- `backend/app/modules/claims/schemas.py` (`ClaimVerifyRequest`, `ClaimCollectRequest`)
- `backend/app/modules/claims/service.py` (`verify_claim`, `collect_claim`, `_ensure_verifiable`)
- `backend/app/modules/claims/router.py` (`POST /claims/{id}/verify`, `POST /claims/{id}/collect`)

**Commits:**
- `feat: add claim verify endpoint with transactional status cascade`
- `feat: add claim collect endpoint and CollectionRecord`

---

## [Module 6] Add `mailpit` service to docker-compose.yml

**Closed:** 2026-08-13
**Branch:** `chore/add-mailpit-service`
**Definition of done met:** `docker compose up -d mailpit` started the `trace-mailpit` container cleanly (healthy), `http://localhost:8025/` served Mailpit's inbox UI (HTTP 200), and a manual test email sent via Python `smtplib` to `localhost:1025` appeared in Mailpit's store (confirmed via `GET /api/v1/messages`, the same API the web UI renders).

**Files committed:**
- `docker-compose.yml` (`mailpit` service: SMTP `1025`, web UI `8025`; header comment updated)

**Commits:**
- `chore: add mailpit service to docker-compose.yml`

---

## [Module 6] `EmailBackend` interface + `SmtpEmailBackend` implementation

**Closed:** 2026-08-13
**Branches:** `feature/email-backend-smtp`, `feature/notification-triggers`
**Definition of done met:** a claim approval produced **both** a `Notification` row in Postgres and a visible email in Mailpit — with zero external network calls (the SMTP host/port in use resolve to loopback `localhost:1025`, i.e. the local `mailpit` service; confirmed by config inspection). All four triggers verified end to end via curl: new Match suggested → 2 emails (both parties) + 2 rows; Claim submitted → 1 email + 1 row; Claim approved → "approved" + "ready for collection" emails + 2 rows; Claim rejected → 1 email + 1 row. Row/email decoupling proven by pointing `SMTP_PORT` at a dead port: the request still returned `200` in ~0.07 s, `Notification` rows were persisted, zero emails delivered, and the three send failures were caught and logged.

**Files committed:**
- `backend/app/config.py` (`EMAIL_BACKEND`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`)
- `backend/app/modules/notifications/__init__.py`
- `backend/app/modules/notifications/email_backend.py` (`EmailBackend`, `SmtpEmailBackend`, `email_backend` singleton)
- `backend/app/modules/notifications/service.py` (`notify_match_suggested`, `notify_claim_submitted`, `notify_claim_verified`)
- `backend/app/modules/matching/service.py` (runners fire `notify_match_suggested`)
- `backend/app/modules/matching/router.py` (accept fires `notify_claim_submitted` BackgroundTask)
- `backend/app/modules/claims/router.py` (verify fires `notify_claim_verified` BackgroundTask)
- `.env.example` (SMTP host duality comment)

**Commits:**
- `feat: add EmailBackend interface and SmtpEmailBackend`
- `feat: add notification trigger service and match-suggested wiring`
- `feat: wire claim notification triggers into accept and verify endpoints`

---

## [Module 7] React 19 + Vite + Tailwind scaffold, JWT decode

**Closed:** 2026-08-13
**Branch:** `feature/vite-tailwind-scaffold`
**Definition of done met:** `npm run dev` served the Tailwind-styled app (HTTP 200; the `--color-brand: #008542` token and a compiled `.bg-brand` utility were present in the served CSS), and the decoded `Role` claim was readable from the stored token — proven via the login console debug log, the LoginSuccess claims panel, and a node-level test of the compiled `auth.ts` against live logins for all three roles (User/Officer/Administrator).

**Files committed:**
- `backend/app/main.py` (CORSMiddleware for the Vite dev origin — user-approved deviation)
- `frontend/.env.example`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/index.css` (officer `@theme` tokens), `frontend/public/*`
- `frontend/src/lib/auth.ts` (JWT storage + decode), `frontend/src/lib/api.ts` (fetch wrapper)
- `frontend/src/App.tsx`, `frontend/src/routes/auth/Login.tsx`, `frontend/src/routes/auth/LoginSuccess.tsx`

**Commits:**
- `chore: enable CORS for the frontend dev server`
- `feat: scaffold React 19 + Vite + Tailwind frontend`
- `feat: add JWT storage/decode and API client`
- `feat: translate demo auth login flow into React`

---

## [Module 7] User / Officer / Admin portals

**Closed:** 2026-08-13
**Branch:** `feature/user-officer-admin-portals`
**Definition of done met:** portal selection is driven entirely by the decoded JWT `Role` claim (`RequireRole` guards — wrong role bounces to the correct portal; no/tampered token → `/login`), and each portal's core flows were verified against the local backend: the full curl sequence (register → report + photo upload → match → accept → claim → approve → collect → Closed/Returned/Completed; reject path → Rejected/Cancelled with items back to Reported/Available; re-verify → 400), the compiled `api.ts` wrapper exercised live (logins ×3, all list endpoints, category CRUD, user→403 role gate, and the `/notifications` + `/audit-logs` 404s the gap views handle), and cross-role 403 / no-token 401.

**Files committed:**
- `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/ui/*` (Button, Card, StatusBadge, StatCard, Modal, Field, EmptyState, Loading, Toast)
- `frontend/src/lib/auth-context.tsx`, `frontend/src/lib/types.ts`
- `frontend/src/hooks/useFetch.ts`, `frontend/src/hooks/useAuthedFetch.ts`
- `frontend/src/routes/guards.tsx`, `frontend/src/routes/auth/Register.tsx`, `frontend/src/routes/auth/RegisterSuccess.tsx`
- `frontend/src/routes/user/*` (dashboard, report lost/found + photos, matches, claims, notifications)
- `frontend/src/routes/officer/*` (dashboard, verify reports, review claims, collections, status)
- `frontend/src/routes/admin/*` (summary, categories CRUD, reports, audit log)
- `frontend/README.md`

**Commits:**
- `feat: add officer-styled shared UI layer and authed fetch hooks`
- `feat: wire register flow and role-gated portal routing`
- `feat: build user portal`
- `feat: build officer portal`
- `feat: build admin portal as an extension of the officer system`

---

## [Module 8] Complete root docker-compose.yml (all 4 services)

**Closed:** 2026-08-13
**Branch:** `chore/root-docker-compose`
**Definition of done met:** `docker compose up --build` from a genuinely clean checkout — a fresh `git clone` into an empty directory with no `.env`, no `node_modules`, no `.venv`, and the `trace_pgdata` volume removed — brought up all four services with zero manual intervention: `trace-db` (healthy), `trace-backend` (healthy, `GET /health` → `{"status":"ok"}`, `/docs` 200), `trace-frontend` (nginx serving the built TRACE bundle on :5173, 200), `trace-mailpit` (web UI 200). The backend entrypoint ran `alembic upgrade head` automatically (`alembic current` = `60ec8bad202b` head; all 11 tables + `alembic_version` present in a fresh DB) — no manual migration step anywhere.

**Files committed:**
- `docker-compose.yml` (all four services: `db` + healthcheck, `backend` with `depends_on: condition: service_healthy` + migration-on-startup entrypoint + `/health` check, `frontend` built-bundle nginx on :5173, `mailpit` pinned to `v1.30.7`; `trace_pgdata` + `trace_uploads` volumes)
- `backend/Dockerfile` (python:3.14-slim), `backend/docker-entrypoint.sh` (alembic-with-retry + seed + uvicorn), `backend/.dockerignore`
- `frontend/Dockerfile` (multi-stage: `npm ci` → `tsc -b && vite build` → `nginx:1.27-alpine`), `frontend/nginx.conf` (SPA fallback + hashed-asset caching on :5173), `frontend/.dockerignore`

**Commits:**
- `chore: consolidate services into root docker-compose.yml`
- `chore: add healthchecks and migration-on-startup entrypoint`

---

## [Module 8] Seed script + `make demo` target

**Closed:** 2026-08-13
**Branch:** `chore/seed-script-make-demo`
**Definition of done met:** `make demo` alone, from a clean checkout, produced a fully populated, ready-to-present system, verified live: 4 users seeded with the documented roles and credentials (ada/bob Users, officer, admin — all `Active`; API logins for all four return JWTs with the correct `Role` claim), 4 categories, 3 lost + 3 found items, and **both deliberately-matching pairs confirmed as real `Suggested` Matches via `GET /matches`** — `Black Nike backpack ↔ Black Nike backpack` and `Blue Sony headphones ↔ Blue Sony headphones`, both `match_score 100.00` (threshold 60.00), with the human-readable reasons. The seed itself runs the real matching module and asserts the pairs (fails loudly on regression). Idempotency proven: re-running `make seed` and restarting the backend container left counts unchanged (4 users / 4 categories / 3+3 items / 2 matches — no duplicates). The full Report → Match → Accept → Claim → Verify → Collect flow then completed on top of the seeded data (items → Closed/Returned, claim → Completed, 7 emails in Mailpit). Browser click-through not performed (no Chrome in this environment) — logins and flows were exercised via the exact API endpoints the SPA calls.

**Files committed:**
- `backend/seed.py` (extended in place: categories upsert + demo users with refresh + demo items gated on empty tables + matching-run-and-verify)
- `Makefile` (`make demo` = up --build -d + wait for `/health` + print URLs/logins; plus `seed`, `up`, `down`, `clean`, `logs`, `ps`)

**Commits:**
- `feat: add demo seed script with matching pair`
- `chore: add Makefile with make demo target`
