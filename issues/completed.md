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
