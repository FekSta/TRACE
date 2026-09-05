# TRACE — Completed Issues Log

> One short entry per completed issue. Detailed records live in their own
> `issues/*.md` files.

---

## [Retrofit] Add frontend unit test suite + CI type-check/lint/test workflow

**Closed:** 2026-08-31
**Branch:** test/frontend-unit-tests
**Definition of done met:** test:coverage passes locally at 37.27% lines (threshold 35%), frontend-unit-tests.yml created for type-check/lint/test on push/PR to main/develop scoped to frontend/**; deliberate break-then-fix cycle requires GitHub remote — flagged as follow-up; full record in issues/frontend-unit-test.md

**Files committed:**
- frontend/package.json
- frontend/vitest.config.ts
- frontend/tsconfig.app.json
- frontend/src/test-setup.ts
- frontend/src/test-utils.tsx
- frontend/src/**/*.test.ts (14 test files)
- .github/workflows/frontend-unit-tests.yml
- issues/frontend-unit-test.md
- Notes.md
- Review.md

**Commits:**
- `chore: add vitest, testing-library, and jsdom to frontend`
- `chore: add test, test:watch, test:coverage scripts and coverage threshold`
- `test: add unit tests for session/auth logic`
- `test: add unit tests for shared design-system components`
- `test: add portal-gating tests for User, Officer, and Administrator roles`
- `test: add core-flow component tests for report-item, claim verify, category management`
- `ci: add frontend-unit-tests workflow for type-check, lint, and tests`
- `docs: log frontend unit test retrofit in issues/frontend-unit-test.md`

---

## [Retrofit] Fix Alembic multiple-heads migration error

**Closed:** 2026-09-05
**Branch:** fix/alembic-multiple-heads
**Definition of done met:** alembic heads shows a single head (3226c58aebdc) against a fresh db container, make demo brings the full stack up healthy from a clean checkout with migrations applying automatically, all 11 tables / 17 FKs and the 4-category + 4-user / 2-match seed verified in Postgres after the fresh run

**Files committed:**
- backend/alembic/versions/13049a14c583_merge_heads.py (merge revision over the two divergent heads)
- backend/alembic/versions/3226c58aebdc_reconcile_divergent_uuid_schema_drop_.py (conflict-resolution migration dropping the stale singular-UUID schema)
- Makefile (added `check-migrations` target)
- backend/docker-entrypoint.sh (added pre-flight alembic heads check)
- Notes.md (added §6.1 safe migration workflow docs)
- Review.md (added Alembic multiple-heads retrofit section)
- issues/completed.md (this entry)

**Commits:**
- `fix: merge diverging alembic migration heads`
- `chore: add alembic heads check to prevent future branch divergence`
- `docs: document safe migration workflow in Notes.md`
