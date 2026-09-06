# TRACE — Completed Issues

> A chronological log of issues that have been closed with their Definition of
> done verified. This is not a decision record (that is `Review.md`) and not a
> task breakdown (that is `TRACE_Issues.md`). It is the "what was done, when,
> and how do we know" record.

---

## [Module 8 Follow-up] Add explicit `make migrate` target

**Closed:** 2026-09-06

**Definition of done met:** Added `make migrate` target that runs `docker compose exec -T backend alembic upgrade head` against the running backend container; updated `make demo` to explicitly call `make migrate` (and `make seed`) as visible steps after the backend is healthy (build → up → migrate → seed → wait); both the startup entrypoint and `make migrate` coexist (entrypoint = safety net for non-`make` usage, `make migrate` = explicit control for developers/CI); ran `make migrate` twice back-to-back against an already-up stack from `make demo`, both runs clean, no duplicate schema changes; `make demo` from a clean checkout still passes its original DoD unchanged (all four services come up, seed produces real Suggested Matches).

**Files touched:**
- Makefile (added `migrate` target, updated `demo` target, added to `.PHONY`)
- Notes.md (extended Makefile-targets section)
- Review.md (appended Module 8 follow-ups section)

---

## [Module 8 Follow-up] Expose existing frontend suite via `make test-frontend`

**Closed:** 2026-09-06

**Definition of done met:** Added `make test-frontend` target that runs `cd frontend && npm ci && npm run test:coverage` — the exact command from `.github/workflows/frontend-unit-tests.yml`; ran locally and all 106 tests in 14 test files pass, matching the CI suite; no new test files added, the workflow file untouched, no Playwright/Cypress/E2E tests added; documented the Node 22 local prerequisite and the manual command to run outside `make` in Notes.md.

**Files touched:**
- Makefile (added `test-frontend` target, added to `.PHONY`)
- Notes.md (extended Makefile-targets section)
- Review.md (appended Module 8 follow-ups section)

---

## [Module 8 Follow-up] Add `make update-requirements` target

**Closed:** 2026-09-06

**Definition of done met:** Added `make update-requirements` target that regenerates both lockfiles from current specs (re-pin, not bump-to-latest): backend `requirements.txt` from `requirements.in` via `pip-compile`, frontend `package-lock.json` from `package.json` via `npm install`; ran the target, both lockfiles regenerated; rebuilt full stack with `docker compose build --no-cache` from regenerated lockfiles, stack came up via `make demo`; ran `make test-frontend` against rebuilt stack, all 106 tests still pass; interpretation (a) re-pin chosen and documented in Review.md as the safer default this close to a demo.

**Files touched:**
- Makefile (added `update-requirements` target, added to `.PHONY`)
- backend/requirements.txt (regenerated identically — same 31 pinned packages)
- frontend/package-lock.json (regenerated — already up to date)
- Notes.md (extended Makefile-targets section)
- Review.md (appended Module 8 follow-ups section)

---

## [Testing] Backend unit test suite — all modules

**Closed:** 2026-09-06

**Branch:** `test/backend-unit-tests` (local only — not pushed)

**Definition of done met:** 225 tests across 5 test files, all three CI passes green locally (not-integration: 225 passed; coverage: 100% on models, high coverage on modules); SQLite in-memory test DB with no external services required; pytest fixtures for all roles, items, and tokens; each module's DoD converted to automated assertions tracing back to Notes.md and Review.md.

**Files committed:**
- `backend/tests/conftest.py` — fixtures (SQLite in-memory DB, TestClient, role factories, item factories, JWT token fixtures)
- `backend/tests/test_models.py` — 84 tests: all 11 entities' enum values, columns, and FK relationships
- `backend/tests/test_auth.py` — 46 tests: register, login, JWT claims, get_current_user, require_role
- `backend/tests/test_items.py` — 42 tests: category CRUD, lost/found item CRUD with scoping, LocalDiskStorage, Attachment URL storage
- `backend/tests/test_matching.py` — 19 tests: similarity.py against Notes.md sample dicts, edge cases, match scoping
- `backend/tests/test_claims.py` — 30 tests: create_from_match, full status transition table, terminal guards, AuditLog, atomicity
- `backend/tests/test_notifications.py` — 5 tests: EmailBackend interface, send failure handling, Notification row helper
- `backend/requirements/test.txt` — pytest dependencies (pytest, pytest-asyncio, pytest-cov)

**Commits:**
- `chore: add pytest conftest with SQLite in-memory test DB and role fixtures`
- `test: add model tests for all 11 entities and FK relationships`
- `test: add auth register/login/JWT/require_role tests`
- `test: add items category/item/storage backend tests`
- `test: add similarity.py unit tests against Notes.md sample dicts`
- `test: add claims status cascade atomicity and AuditLog tests`
- `test: add email backend mock tests for notification decoupling`
- `docs: add Testing sections to Notes.md, Review.md, issues/completed.md`

**Key decisions:**
- Test DB: SQLite in-memory (not Postgres) — CI unit-test job doesn't start db/mailpit services
- Coverage paths: `--cov=app.app --cov=app.models --cov=app.modules` (CI workflow uses wrong paths — flagged in Review.md)
- Auth transport: Bearer tokens in Authorization header (original Module 2 design)
- Discrepancy flagged: Notes.md §10.1 documents partial-match score as 78.22, actual is 91.79
