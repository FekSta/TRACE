# TRACE — Technical Notes

> Living document: grows as each milestone adds real functionality.
> Current scope: Milestone 0 (Architecture Review) + Milestone 1 (DB & Schema).

---

## 1. System Overview

TRACE (Tracking, Recovery, And Claim Engine) is a centralized lost & found
platform built as a **FastAPI modular monolith** with a single PostgreSQL
database. It automatically matches lost/found reports, runs an ownership
verification and claim workflow, and provides admin reporting/dashboards.

The six backend modules — Auth, Items, Matching, Claims, Notifications,
Dashboard — communicate via direct in-process function calls, never HTTP
or message queues. See `ABOUT.md` for full architecture.

---

## 2. Phase 1 vs Phase 2 Seam Summary

Three things change between Phase 1 (local dev) and Phase 2 (cloud deploy):

| Component | Phase 1 (Local) | Phase 2 (Cloud) | What changes |
|-----------|-----------------|-----------------|--------------|
| **Database** | Docker Postgres (`localhost:5432`) | Supabase Postgres | Only `DATABASE_URL` env var |
| **File Storage** | Local disk (`uploads/` volume) | Supabase Storage | Only the `StorageBackend` implementation |
| **Email** | Mailpit (local SMTP) | Resend API | Only the `EmailBackend` implementation |

**What does NOT change:**
- The six backend modules (Auth, Items, Matching, Claims, Notifications, Dashboard)
- The React frontend
- SQLAlchemy models and Alembic migrations
- Business logic, matching algorithm, claim workflow

The architecture is intentionally designed so that swapping Phase 1 → Phase 2
requires changing only environment variables and adapter implementations,
never business logic. See `Trace_Architecture_Summary_Monolith.md` § "What
changed vs. microservices".

---

## 3. Entity Reference

All 11 persistent entities, organized by layer. Every attribute, type, and
enum value matches `assets/diagrams/data-model.md` exactly.

### Core Business Layer (5 entities)

#### 3.1 User
- **Table:** `user`
- **Model:** `backend/app/models/user.py` → `User`
- **PK:** `user_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PK, gen_random_uuid() | Unique identifier |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| student_number | VARCHAR(50) | NULLABLE | Student/employee number |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Login email |
| phone_number | VARCHAR(20) | NULLABLE | Contact number |
| password_hash | VARCHAR(255) | NOT NULL | Encrypted password |
| role | ENUM | NOT NULL, default='User' | **Values:** `User`, `Officer`, `Administrator` |
| status | ENUM | NOT NULL, default='Active' | **Values:** `Active`, `Suspended`, `Inactive` |
| created_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Account creation timestamp |

#### 3.2 LostItem
- **Table:** `lost_item`
- **Model:** `backend/app/models/lost_item.py` → `LostItem`
- **PK:** `lost_item_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| lost_item_id | UUID | PK, gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → user.user_id, CASCADE, NOT NULL, INDEX | Reporter |
| category_id | UUID | FK → category.category_id, RESTRICT, NOT NULL, INDEX | Classification |
| title | VARCHAR(200) | NOT NULL | Short title |
| description | TEXT | NOT NULL | Detailed description |
| brand | VARCHAR(100) | NULLABLE | Manufacturer/brand |
| colour | VARCHAR(50) | NULLABLE | Item colour |
| date_lost | TIMESTAMPTZ | NOT NULL | Date lost |
| location_lost | VARCHAR(255) | NOT NULL | Last known location |
| status | ENUM | NOT NULL, default='Reported' | **Values:** `Reported`, `Matched`, `Claimed`, `Closed` |
| created_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Last update timestamp |

#### 3.3 FoundItem
- **Table:** `found_item`
- **Model:** `backend/app/models/found_item.py` → `FoundItem`
- **PK:** `found_item_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| found_item_id | UUID | PK, gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → user.user_id, CASCADE, NOT NULL, INDEX | Finder |
| category_id | UUID | FK → category.category_id, RESTRICT, NOT NULL, INDEX | Classification |
| title | VARCHAR(200) | NOT NULL | Short title |
| description | TEXT | NOT NULL | Detailed description |
| brand | VARCHAR(100) | NULLABLE | Manufacturer/brand |
| colour | VARCHAR(50) | NULLABLE | Item colour |
| date_found | TIMESTAMPTZ | NOT NULL | Date found |
| storage_location | VARCHAR(255) | NOT NULL | Where item is stored |
| status | ENUM | NOT NULL, default='Available' | **Values:** `Available`, `Claimed`, `Returned` |
| created_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Last update timestamp |

#### 3.4 Claim
- **Table:** `claim`
- **Model:** `backend/app/models/claim.py` → `Claim`
- **PK:** `claim_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| claim_id | UUID | PK, gen_random_uuid() | Unique identifier |
| lost_item_id | UUID | FK → lost_item.lost_item_id, SET NULL, NULLABLE, INDEX | Related lost item |
| found_item_id | UUID | FK → found_item.found_item_id, SET NULL, NULLABLE, INDEX | Related found item |
| user_id | UUID | FK → user.user_id, CASCADE, NOT NULL, INDEX | Claim submitter |
| claim_date | TIMESTAMPTZ | NOT NULL, server_default=now() | Submission date |
| verification_status | ENUM | NOT NULL, default='Pending' | **Values:** `Pending`, `Approved`, `Rejected` |
| officer_id | UUID | FK → user.user_id, SET NULL, NULLABLE | Reviewing officer |
| verification_notes | TEXT | NULLABLE | Officer remarks |
| collection_date | TIMESTAMPTZ | NULLABLE | Collection date |
| status | ENUM | NOT NULL, default='Active' | **Values:** `Active`, `Completed`, `Cancelled` |

#### 3.5 Category
- **Table:** `category`
- **Model:** `backend/app/models/category.py` → `Category`
- **PK:** `category_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| category_id | UUID | PK, gen_random_uuid() | Unique identifier |
| category_name | VARCHAR(100) | UNIQUE, NOT NULL | Category name |
| description | VARCHAR(255) | NULLABLE | Category description |
| icon | VARCHAR(50) | NULLABLE | UI icon reference |
| display_order | INTEGER | NOT NULL, default=0 | Sort order |
| status | ENUM | NOT NULL, default='Active' | **Values:** `Active`, `Archived` |
| created_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Creation timestamp |

### Supporting Layer (6 entities)

#### 3.6 Match
- **Table:** `match`
- **Model:** `backend/app/models/match.py` → `Match`
- **PK:** `match_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| match_id | UUID | PK, gen_random_uuid() | Match identifier |
| lost_item_id | UUID | FK → lost_item.lost_item_id, CASCADE, NOT NULL, INDEX | Lost item |
| found_item_id | UUID | FK → found_item.found_item_id, CASCADE, NOT NULL, INDEX | Found item |
| match_score | NUMERIC(3,2) | NOT NULL | Confidence score (0.00–1.00) |
| match_reason | TEXT | NULLABLE | Human-readable reason |
| status | ENUM | NOT NULL, default='Suggested' | **Values:** `Suggested`, `Accepted`, `Rejected` |
| generated_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Generation timestamp |

#### 3.7 Notification
- **Table:** `notification`
- **Model:** `backend/app/models/notification.py` → `Notification`
- **PK:** `notification_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| notification_id | UUID | PK, gen_random_uuid() | Notification identifier |
| user_id | UUID | FK → user.user_id, CASCADE, NOT NULL, INDEX | Recipient |
| title | VARCHAR(200) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification content |
| notification_type | ENUM | NOT NULL, default='System' | **Values:** `Match`, `Claim`, `Reminder`, `System` |
| is_read | BOOLEAN | NOT NULL, default=False | Read status |
| created_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Creation timestamp |

#### 3.8 VerificationRecord
- **Table:** `verification_record`
- **Model:** `backend/app/models/verification_record.py` → `VerificationRecord`
- **PK:** `verification_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| verification_id | UUID | PK, gen_random_uuid() | Verification identifier |
| claim_id | UUID | FK → claim.claim_id, CASCADE, NOT NULL, INDEX | Related claim |
| officer_id | UUID | FK → user.user_id, SET NULL, NULLABLE | Verifying officer |
| verification_method | VARCHAR(100) | NOT NULL | Method used |
| result | ENUM | NOT NULL | **Values:** `Passed`, `Failed` |
| notes | TEXT | NULLABLE | Verification notes |
| verified_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Verification timestamp |

#### 3.9 CollectionRecord
- **Table:** `collection_record`
- **Model:** `backend/app/models/collection_record.py` → `CollectionRecord`
- **PK:** `collection_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| collection_id | UUID | PK, gen_random_uuid() | Collection identifier |
| claim_id | UUID | FK → claim.claim_id, CASCADE, NOT NULL, INDEX | Related claim |
| collected_by | VARCHAR(200) | NOT NULL | Person collecting |
| officer_id | UUID | FK → user.user_id, SET NULL, NULLABLE | Releasing officer |
| collection_date | TIMESTAMPTZ | NOT NULL, server_default=now() | Collection date |
| recipient_signature | VARCHAR(255) | NULLABLE | Signature reference |
| remarks | TEXT | NULLABLE | Additional notes |

#### 3.10 Attachment
- **Table:** `attachment`
- **Model:** `backend/app/models/attachment.py` → `Attachment`
- **PK:** `attachment_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| attachment_id | UUID | PK, gen_random_uuid() | Attachment identifier |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_path | VARCHAR(500) | NOT NULL | Storage path |
| file_type | VARCHAR(50) | NOT NULL | MIME type / extension |
| uploaded_by | UUID | FK → user.user_id, SET NULL, NULLABLE | Uploader |
| uploaded_at | TIMESTAMPTZ | NOT NULL, server_default=now() | Upload timestamp |
| related_entity | ENUM | NOT NULL | **Values:** `LostItem`, `FoundItem`, `Claim` |

#### 3.11 AuditLog
- **Table:** `audit_log`
- **Model:** `backend/app/models/audit_log.py` → `AuditLog`
- **PK:** `audit_id` (UUID, server-generated)
- **Attributes:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| audit_id | UUID | PK, gen_random_uuid() | Audit identifier |
| user_id | UUID | FK → user.user_id, SET NULL, NULLABLE, INDEX | Acting user |
| action | VARCHAR(50) | NOT NULL, INDEX | Action (create, update, delete, login) |
| entity_name | VARCHAR(50) | NOT NULL, INDEX | Entity type affected |
| entity_id | UUID | NULLABLE | Affected record ID |
| timestamp | TIMESTAMPTZ | NOT NULL, server_default=now() | Action timestamp |
| ip_address | VARCHAR(45) | NULLABLE | Originating IP |

---

## 4. Entity Ownership Matrix

| Entity | Created By | Read By |
|--------|-----------|---------|
| **User** | User (self-register), Admin (manual) | User (self), Officer, Admin |
| **LostItem** | User | User (own), Officer, Admin |
| **FoundItem** | User, Officer | User (own), Officer, Admin |
| **Claim** | User (from accepted Match) | User (own), Officer (review), Admin |
| **Category** | Admin | Everyone |
| **Match** | System (Matching Engine) | User (own matches), Officer, Admin |
| **Notification** | System (on event trigger) | User (own) |
| **VerificationRecord** | Officer | Officer (own), Admin |
| **CollectionRecord** | Officer | Officer (own), User (own claim), Admin |
| **Attachment** | User, Officer | User (own), Officer, Admin |
| **AuditLog** | System (every mutation) | Admin |

---

## 5. Docker & Database Connection

### Starting the database

```bash
docker compose up db -d
```

This starts a Postgres 16 Alpine container named `trace-db` on `localhost:5432`.

### Connecting

**psql:**
```bash
psql -h localhost -p 5432 -U trace -d trace
# Password: trace_local_password
```

**GUI (pgAdmin / TablePlus / DBeaver):**
- Host: `localhost`
- Port: `5432`
- Database: `trace`
- User: `trace`
- Password: `trace_local_password`

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `trace` | Database name |
| `POSTGRES_USER` | `trace` | Database user |
| `POSTGRES_PASSWORD` | `trace_local_password` | Database password |
| `DATABASE_URL` | `postgresql+asyncpg://trace:trace_local_password@localhost:5432/trace` | SQLAlchemy URL |

---

## 6. Alembic Usage

### Generate a new migration

```bash
cd backend
alembic revision --autogenerate -m "description of change"
```

### Apply migrations

```bash
cd backend
alembic upgrade head
```

### Rollback one step

```bash
cd backend
alembic downgrade -1
```

### Re-run the seed script

```bash
cd backend
python -m seed
```

---

## 7. Quick Verification Sequence

Run these commands from the project root to confirm everything works:

```bash
# 1. Start Postgres
docker compose up db -d

# 2. Wait for healthcheck
sleep 5

# 3. Apply migrations
cd backend && alembic upgrade head

# 4. Seed categories
python -m seed

# 5. Verify tables exist (11 entity tables + alembic_version)
psql -h localhost -p 5432 -U trace -d trace -c \
  "SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;"

# Expected output:
#   alembic_version, attachment, audit_log, category, claim,
#   collection_record, found_item, lost_item, match,
#   notification, user, verification_record

# 6. Verify seeded categories (4 rows)
psql -h localhost -p 5432 -U trace -d trace -c \
  "SELECT category_name FROM category ORDER BY display_order;"

# Expected output:
#   Electronics, Bags, Clothes, Documents & Cards

# 7. Verify foreign keys (17 constraints)
psql -h localhost -p 5432 -U trace -d trace -c \
  "SELECT count(*) FROM information_schema.table_constraints
   WHERE constraint_type = 'FOREIGN KEY'
   AND table_schema = 'public';"

# Expected output: 17
```

---

## 8. Testing Notes

- **No tests exist yet** — Milestone 1 is schema-only. Tests start in Module 2.
- **Enum values** are native Postgres ENUMs, not VARCHAR. Changing enum values
  in the future requires a migration. This is acceptable for V1.
- **UUID primary keys** are used for all entities. This avoids ID conflicts
  in multi-replica deployments and makes the API safer for external consumers.
- **ondelete behavior** is intentional:
  - `CASCADE` on owned entities (User → LostItem, Claim → VerificationRecord)
  - `RESTRICT` on classification (Category → Items) to prevent orphaning
  - `SET NULL` on references that can outlive the original (Claim → LostItem/FoundItem, OfficerID)
