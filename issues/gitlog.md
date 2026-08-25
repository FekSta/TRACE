# TRACE — Git Workflow Walkthrough: Milestone 0 & 1

> Step-by-step record of every git command executed to commit Milestone 0
> and Milestone 1 work. Each section corresponds to one issue, one branch,
> and one or more commits.

---

## Step 0: Starting State

```
Branch:  chore/docker-postgres-service  (checked out)
Staged:  docker-compose.yml, .env.example
Unstaged: .gitignore (modified)
Untracked: backend/, Issues/, submission/docs/
```

The `develop` branch is at `72965b6` (same as `main`).
The `docs/architecture-review` branch already has one commit (`e27a7d1`)
with `Notes.md` and `Review.md`.

---

## Step 1: Update .gitignore to track issues/completed.md

The `issues/` directory was in `.gitignore` as a "local draft" rule. Since
`issues/completed.md` is a deliverable that must be committed, the ignore
rule was narrowed to only ignore the original draft file.

**File changed:** `.gitignore`

**Command:**
```bash
# Edited .gitignore:
#   - Removed:  issues/
#   - Added:    issues/Trace_isses.md   (original draft, still ignored)
```

---

## Step 2: Write issues/gitlog.md

Created the walkthrough file documenting this entire git process.

**File created:** `issues/gitlog.md`

---

## Step 3: Commit on `chore/docker-postgres-service` (Issue #11)

This branch was already checked out with `docker-compose.yml` and
`.env.example` staged. Committed them with the GitHub issue number.

**Branch:** `chore/docker-postgres-service` (from `develop`)
**GitHub Issue:** #11

**Commands:**
```bash
git add .gitignore issues/gitlog.md issues/completed.md
git commit -m "chore(#11): add db service to docker-compose.yml with named volume and healthcheck

- Add Postgres 16 Alpine service with healthcheck
- Add named volume postgres_data for data persistence
- Update .env.example with Postgres credentials
- Add issues/completed.md and issues/gitlog.md

Closes #11"
```

**Files committed:**
- docker-compose.yml
- .env.example
- .gitignore
- issues/completed.md
- issues/gitlog.md

---

## Step 4: Create `feature/sqlalchemy-models` branch and commit (Issue #14)

Created a new branch from `develop` for the SQLAlchemy models work.
Added all backend package structure and 11 entity models.

**Branch:** `feature/sqlalchemy-models` (from `develop`)
**GitHub Issue:** #14

**Commands:**
```bash
# Switch to develop first
git checkout develop

# Create and switch to the new branch
git checkout -b feature/sqlalchemy-models

# Stage all backend model files
git add backend/__init__.py
git add backend/app/__init__.py
git add backend/app/models/__init__.py
git add backend/app/models/base.py
git add backend/app/models/user.py
git add backend/app/models/category.py
git add backend/app/models/lost_item.py
git add backend/app/models/found_item.py
git add backend/app/models/claim.py
git add backend/app/models/match.py
git add backend/app/models/notification.py
git add backend/app/models/verification_record.py
git add backend/app/models/collection_record.py
git add backend/app/models/attachment.py
git add backend/app/models/audit_log.py
git add backend/app/database.py
git add backend/app/main.py
git add backend/requirements.txt

git commit -m "feat(#14): add SQLAlchemy models for all 11 entities

Core Business Layer: User, LostItem, FoundItem, Claim, Category
Supporting Layer: Match, Notification, VerificationRecord,
                  CollectionRecord, Attachment, AuditLog

- UUID primary keys with server-side gen_random_uuid()
- Native Postgres ENUMs for Role, Status, and all enum fields
- All 17 FK relationships from Entities.md declared
- SQLAlchemy 2.0 Mapped[type] annotation style
- database.py with sync engine for Alembic
- Minimal FastAPI entry point

Closes #14"
```

**Files committed:**
- backend/__init__.py
- backend/app/__init__.py
- backend/app/models/__init__.py
- backend/app/models/base.py
- backend/app/models/user.py
- backend/app/models/category.py
- backend/app/models/lost_item.py
- backend/app/models/found_item.py
- backend/app/models/claim.py
- backend/app/models/match.py
- backend/app/models/notification.py
- backend/app/models/verification_record.py
- backend/app/models/collection_record.py
- backend/app/models/attachment.py
- backend/app/models/audit_log.py
- backend/app/database.py
- backend/app/main.py
- backend/requirements.txt

---

## Step 5: Create `feature/alembic-migration-seed` branch and commit

Created a new branch from `develop` for the Alembic configuration,
initial migration, and category seed script.

**Branch:** `feature/alembic-migration-seed` (from `develop`)

**Commands:**
```bash
# Switch to develop first
git checkout develop

# Create and switch to the new branch
git checkout -b feature/alembic-migration-seed

# Stage Alembic configuration and migration files
git add backend/alembic.ini
git add backend/alembic/env.py
git add backend/alembic/script.py.mako
git add backend/alembic/versions/ff0a486902ce_initial_schema_all_11_entities.py
git add backend/seed.py

git commit -m "feat: add Alembic migration + seed script for Category table

- Add Alembic configuration (alembic.ini, env.py, script.py.mako)
- Generate initial migration detecting all 11 entity tables
- Add seed.py inserting 4 starter categories:
  Electronics, Bags, Clothes, Documents & Cards
- Verified: alembic upgrade head creates all 11 tables with 17 FKs"
```

**Files committed:**
- backend/alembic.ini
- backend/alembic/env.py
- backend/alembic/script.py.mako
- backend/alembic/versions/ff0a486902ce_initial_schema_all_11_entities.py
- backend/seed.py

---

## Step 6: Commit on `docs/architecture-review` for Module 0

The `docs/architecture-review` branch already had `Notes.md` and
`Review.md` committed from a previous session. Updated the branch to
also include `submission/docs/database.md`.

**Branch:** `docs/architecture-review` (from `develop`)

**Commands:**
```bash
git checkout docs/architecture-review

# Stage the MySQL Workbench walkthrough
git add submission/docs/database.md

git commit -m "docs: add MySQL Workbench walkthrough for submission

Step-by-step guide for recreating the TRACE schema in MySQL Workbench
for course submission artifacts. Covers all 11 tables, CRUD operations,
EER diagram export, and SQL script generation."
```

**Files committed:**
- submission/docs/database.md

---

## Step 7: Merge all branches back to `develop`

After all branches are committed, merge them back into `develop` in
dependency order.

**Commands:**
```bash
git checkout develop

# Merge docker-postgres-service (Issue #11)
git merge chore/docker-postgres-service --no-ff -m "Merge branch 'chore/docker-postgres-service' into develop

Closes #11"

# Merge sqlalchemy-models (Issue #14)
git merge feature/sqlalchemy-models --no-ff -m "Merge branch 'feature/sqlalchemy-models' into develop

Closes #14"

# Merge alembic-migration-seed
git merge feature/alembic-migration-seed --no-ff -m "Merge branch 'feature/alembic-migration-seed' into develop

Milestone 1 complete: all 11 tables, migration, and seed data"

# Merge docs/architecture-review
git merge docs/architecture-review --no-ff -m "Merge branch 'docs/architecture-review' into develop

Milestone 0 complete: architecture review, Notes.md, Review.md"
```

---

## Final State

```
develop  ← all branches merged
  ├── chore/docker-postgres-service    (Issue #11)
  ├── feature/sqlalchemy-models        (Issue #14)
  ├── feature/alembic-migration-seed
  └── docs/architecture-review
```

### Files on `develop` after merges:

| File | Branch | Issue |
|------|--------|-------|
| docker-compose.yml | chore/docker-postgres-service | #11 |
| .env.example | chore/docker-postgres-service | #11 |
| .gitignore | chore/docker-postgres-service | #11 |
| issues/completed.md | chore/docker-postgres-service | #11 |
| issues/gitlog.md | chore/docker-postgres-service | #11 |
| backend/__init__.py | feature/sqlalchemy-models | #14 |
| backend/app/__init__.py | feature/sqlalchemy-models | #14 |
| backend/app/models/* (13 files) | feature/sqlalchemy-models | #14 |
| backend/app/database.py | feature/sqlalchemy-models | #14 |
| backend/app/main.py | feature/sqlalchemy-models | #14 |
| backend/requirements.txt | feature/sqlalchemy-models | #14 |
| backend/alembic.ini | feature/alembic-migration-seed | — |
| backend/alembic/env.py | feature/alembic-migration-seed | — |
| backend/alembic/script.py.mako | feature/alembic-migration-seed | — |
| backend/alembic/versions/*.py | feature/alembic-migration-seed | — |
| backend/seed.py | feature/alembic-migration-seed | — |
| Notes.md | docs/architecture-review | M0 |
| Review.md | docs/architecture-review | M0 |
| submission/docs/database.md | docs/architecture-review | — |
