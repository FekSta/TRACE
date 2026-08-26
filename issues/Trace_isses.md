# TRACE — Issue Bodies by Milestone
 
Each block below is one GitHub issue: title, milestone, labels, description,
a task checklist, and a definition of done pulled from that module's gate.
Paste each block directly into a new issue.
 
---
 
## Milestone: Module 0 — Orientation
 
### Issue: Team sketch + architecture review session
 
**Labels:** `type:docs` `module:0-orientation`
 
**Description**
Before any code exists, the whole team needs the same mental model of what
TRACE is and where the Phase 1 → Phase 2 seams are.
 
**Tasks**
- [ ] Each member independently sketches the system twice: once as it runs in Phase 1 (React dev server → FastAPI on localhost → Postgres in Docker → local disk + Mailpit), once as it runs in Phase 2 (`ABOUT.md`'s diagram)
- [ ] Circle the three boxes that differ between the two sketches
- [ ] Compare sketches as a group against `ABOUT.md` and `Entities.md`
- [ ] For each of the 11 entities, agree as a group who creates it and who reads it
- [ ] Note which requirements-brief items are graded (CRUD, sorting, reports, backups/security)
**Definition of done**
Every team member can name the three things that change between Phase 1 and
Phase 2 (database connection, file storage, email) and explain why the six
backend modules and the React app don't need to change at all — without
looking it up.
 
---
 
## Milestone: Module 1 — Local Postgres & schema
 
### Issue: Add `db` (Postgres) service to docker-compose.yml
 
**Labels:** `type:setup` `phase:1-local` `module:1-schema`
 
**Description**
Set up the local Postgres instance that every backend module will read and
write to for the rest of Phase 1. No cloud account involved yet.
 
**Tasks**
- [ ] Add a `db` service to `docker-compose.yml` using the official `postgres` image
- [ ] Add a named volume so data survives container restarts
- [ ] Set local-only credentials via `.env` (not committed)
- [ ] Confirm `docker compose up db` starts cleanly
- [ ] Connect with `psql` or a GUI (pgAdmin/TablePlus) to confirm it's reachable on `localhost:5432`
**Definition of done**
`docker compose up db` brings up a fresh, empty Postgres from a clean
checkout with no manual steps beyond that one command.
 
---
 
### Issue: SQLAlchemy models for all 11 entities
 
**Labels:** `type:feature` `phase:1-local` `module:1-schema`
 
**Description**
Translate every entity in `Entities.md` into a SQLAlchemy model in a single
shared `backend/app/models/` package — not one package per module.
 
**Tasks**
- [ ] Model User, LostItem, FoundItem, Claim, Category (Core Business Layer)
- [ ] Model Match, Notification, VerificationRecord, CollectionRecord, Attachment, AuditLog (Supporting Layer)
- [ ] Declare every foreign key relationship listed in `Entities.md` (e.g. `Claim.OfficerID → User`, `Match.LostItemID → LostItem`)
- [ ] Match every attribute's type and Enum values exactly to the entity tables in `Entities.md`
- [ ] Confirm all models import cleanly with no circular-import errors
**Definition of done**
All 11 models exist, import without errors, and every FK relationship
documented in `Entities.md` is declared in code.
 
---
 
### Issue: Alembic migration + seed Category table
 
**Labels:** `type:feature` `phase:1-local` `module:1-schema`
 
**Description**
Generate the first schema migration from the models above and seed the
starter categories so Item Management (Module 3) has something to reference.
 
**Tasks**
- [ ] Run `alembic init alembic` and point `env.py` at the models package
- [ ] Generate the initial migration (`alembic revision --autogenerate`)
- [ ] Run `alembic upgrade head` against the local `db` service
- [ ] Write a seed script inserting Electronics, Bags, Clothes, Documents & Cards into `Category`
- [ ] Confirm every table and FK is visible in a Postgres GUI
**Definition of done**
`alembic upgrade head` against a fresh `db` container creates all 11 tables
with correct foreign keys, and the seed script populates the 4 starter
categories, from a clean checkout.
 
---
 
## Milestone: Module 2 — Authentication
 
### Issue: Auth module — register/login/JWT
 
**Labels:** `type:feature` `phase:1-local` `module:2-auth`
 
**Description**
Build the Authentication module as its own package inside the single
FastAPI app (`backend/app/modules/auth/`) — not a separate service.
 
**Tasks**
- [ ] Define the `User` Pydantic schemas (register/login/response), matching `Entities.md`'s `Role` enum (User, Officer, Administrator)
- [ ] Implement `POST /auth/register` with password hashing via passlib/bcrypt
- [ ] Implement `POST /auth/login` issuing a signed JWT (python-jose or pyjwt)
- [ ] Read the JWT signing key from a local `.env` value (`JWT_SECRET`)
- [ ] Test both endpoints with curl
- [ ] Decode a returned token at jwt.io and confirm it contains `UserID` and `Role` claims
**Definition of done**
A curl login returns an access token whose decoded payload contains
`UserID` and `Role`, entirely from a locally running backend.
 
---
 
### Issue: Reusable `require_role` dependency
 
**Labels:** `type:feature` `phase:1-local` `module:2-auth`
 
**Description**
Build the shared FastAPI dependency other modules will import for
role-based access control, instead of each module reimplementing it.
 
**Tasks**
- [ ] Implement `get_current_user` dependency that decodes and validates the JWT
- [ ] Implement `require_role(*roles)` built on top of `get_current_user`
- [ ] Add a throwaway protected test route to confirm 401/403 behavior for missing/wrong-role tokens
- [ ] Document the dependency's usage pattern in the module's notes so other modules can copy it
- [ ] Import and use it from at least one route in the Items module (Module 3) to prove it's reusable
**Definition of done**
At least one protected route outside the Auth module successfully uses
`require_role(...)`, and unauthorized/wrong-role requests correctly get
401/403.
 
---
 
## Milestone: Module 3 — Item Management
 
### Issue: Category + LostItem/FoundItem CRUD
 
**Labels:** `type:feature` `phase:1-local` `module:3-items`
 
**Description**
Implement full CRUD for the three core item entities, respecting the
role-based scoping rules from the Data Flow doc.
 
**Tasks**
- [ ] Implement Category CRUD (view/add/update/delete)
- [ ] Implement LostItem CRUD, scoped to `WHERE UserID=?` for role `User`
- [ ] Implement FoundItem CRUD, scoped the same way
- [ ] Allow Officers/Administrators to view and verify all items, unscoped
- [ ] Test every endpoint with curl for both a `User` token and an `Officer` token
- [ ] Confirm status transitions match `Entities.md` (`Reported`/`Matched`/`Claimed`/`Closed` for LostItem; `Available`/`Claimed`/`Returned` for FoundItem)
**Definition of done**
curl can create, list, update, and delete Category, LostItem, and
FoundItem, and the User/Officer scoping rules are enforced correctly on
every endpoint.
 
---
 
### Issue: `StorageBackend` interface + `LocalDiskStorage` implementation
 
**Labels:** `type:feature` `phase:1-local` `module:3-items`
 
**Description**
Build the storage abstraction that lets Phase 2 swap in Supabase Storage
later without touching the Items module's business logic.
 
**Tasks**
- [ ] Define a `StorageBackend` interface (e.g. via `abc.ABC`) with `save`, `get_url`, `delete`
- [ ] Implement `LocalDiskStorage`, writing into a Docker-mounted `uploads/` volume
- [ ] Add a `/media/{filename}` static route to serve saved files back
- [ ] Wire Attachment upload through the interface only — no direct filesystem calls elsewhere in the module
- [ ] Store only the returned URL in the `Attachment` table, never file bytes
- [ ] Add the `uploads` volume to `docker-compose.yml`
**Definition of done**
Uploading a file through the API results in an `Attachment` row with a
working URL, and every file-save call in the Items module goes through
`storage.save(...)` — none call the filesystem directly.
 
---
 
## Milestone: Module 4 — Matching Engine
 
### Issue: `similarity.py` scoring function + shell tests
 
**Labels:** `type:feature` `phase:1-local` `module:4-matching`
 
**Description**
Build the core matching logic in isolation before wiring it into any
request/response cycle, per `ABOUT.md`'s single matching engine constraint
(category + location + date + description similarity).
 
**Tasks**
- [ ] Write `utils/similarity.py` with a function scoring a LostItem/FoundItem pair
- [ ] Weight category, location, date proximity, and description similarity per the V1 constraint in `ABOUT.md`
- [ ] Write a few hand-crafted sample LostItem/FoundItem dicts (obvious match, obvious non-match, partial match)
- [ ] Run the function against those samples in a Python shell inside the backend container
- [ ] Confirm it returns both a numeric `MatchScore` and a human-readable `MatchReason`
**Definition of done**
You can demonstrate, in a Python shell, a `MatchScore` and `MatchReason`
produced from two hand-written sample dicts — before any API wiring exists.
 
---
 
### Issue: Wire matching into item creation via BackgroundTask
 
**Labels:** `type:feature` `phase:1-local` `module:4-matching`
 
**Description**
Connect the scoring function to the item-creation flow as an in-process
call — no message queue, per `ABOUT.md`'s "internal service boundaries"
design.
 
**Tasks**
- [ ] On LostItem/FoundItem creation, trigger scoring against all opposite-type items via a `FastAPI BackgroundTask`
- [ ] Create `Match` rows with `Status='Suggested'` for scores above a defined threshold
- [ ] Implement `GET /matches` (optionally filtered by item/user)
- [ ] Implement accept/reject endpoints updating `Match.Status`
- [ ] Confirm item-creation responses return immediately and don't block on scoring
**Definition of done**
Creating a new item that matches an existing one produces a queryable
`Match` row without the creation request waiting on the scoring pass.
 
---
 
## Milestone: Module 5 — Claims & Verification
 
### Issue: Claim creation from accepted Match
 
**Labels:** `type:feature` `phase:1-local` `module:5-claims`
 
**Description**
Implement the handoff from an accepted Match to a new Claim, as a direct
in-process function call between modules.
 
**Tasks**
- [ ] Implement `claims_service.create_from_match(...)` in the Claims module
- [ ] Call it from the Matching module's accept-match endpoint
- [ ] Populate the Claim with `LostItemID`, `FoundItemID`, `UserID`, `ClaimDate`, `VerificationStatus='Pending'`
- [ ] Test end to end: create items → get a suggested Match → accept it → confirm a Claim exists
**Definition of done**
Accepting a Match produces a new `Claim` row correctly linked to the
originating `LostItem`, `FoundItem`, and `User` — via a direct function
call, not an HTTP request between modules.
 
---
 
### Issue: Verify/approve/reject + VerificationRecord/CollectionRecord
 
**Labels:** `type:feature` `phase:1-local` `module:5-claims`
 
**Description**
Implement the Officer-facing verification and collection workflow,
including the multi-table status cascade.
 
**Tasks**
- [ ] Implement Officer-only `POST /claims/{id}/verify` (approve/reject), writing a `VerificationRecord`
- [ ] On approval, update `Claim.VerificationStatus`, `LostItem.Status`, and `FoundItem.Status` inside a single DB transaction
- [ ] On rejection, update statuses appropriately and record `VerificationNotes`
- [ ] Implement `POST /claims/{id}/collect`, writing a `CollectionRecord` and completing the Claim
- [ ] Write an `AuditLog` row on every mutating step above
- [ ] Test all three outcomes (approve, complete, reject) manually with curl
**Definition of done**
You can explain, without looking at the code, exactly what happens to
`LostItem.Status`, `FoundItem.Status`, and `Claim.Status` for each of the
three outcomes, and each is backed by a passing manual test.
 
---
 
## Milestone: Module 6 — Notifications
 
### Issue: Add `mailpit` service to docker-compose.yml
 
**Labels:** `type:setup` `phase:1-local` `module:6-notifications`
 
**Description**
Add a local SMTP catcher so Notifications can be built and demoed without
an internet connection or a Resend account.
 
**Tasks**
- [ ] Add a `mailpit` service to `docker-compose.yml`
- [ ] Expose its SMTP port to the backend service and its web UI port (`8025`) to the host
- [ ] Confirm `docker compose up mailpit` starts cleanly
- [ ] Send a manual test email via `swaks` or a quick Python script and confirm it appears in the Mailpit UI
**Definition of done**
`localhost:8025` shows Mailpit's inbox UI, and a manually sent test email
appears in it.
 
---
 
### Issue: `EmailBackend` interface + `SmtpEmailBackend` implementation
 
**Labels:** `type:feature` `phase:1-local` `module:6-notifications`
 
**Description**
Build the email abstraction that lets Phase 2 swap in Resend later
without touching the Notifications module's trigger logic.
 
**Tasks**
- [ ] Define an `EmailBackend` interface with a `send(to, subject, body)` method
- [ ] Implement `SmtpEmailBackend` pointed at Mailpit's local SMTP port
- [ ] Trigger it as a `BackgroundTask` on: new match suggested, claim submitted, claim approved/rejected, item ready for collection
- [ ] Write a `Notification` row to Postgres on every trigger, independent of email delivery success
- [ ] Test each trigger and confirm the email appears in Mailpit
**Definition of done**
Triggering a claim approval produces both a `Notification` row in
Postgres and a visible email in Mailpit's inbox — with zero external
network calls.
 
---
 
## Milestone: Module 7 — Frontend & Dashboard
 
### Issue: React 19 + Vite + Tailwind scaffold, JWT decode
 
**Labels:** `type:setup` `phase:1-local` `module:7-frontend`
 
**Description**
Stand up the frontend project and the client-side auth plumbing every
portal view will depend on.
 
**Tasks**
- [ ] Scaffold with `npm create vite@latest` (React or React-TS template, per team decision)
- [ ] Install and wire `@tailwindcss/vite`, confirm Tailwind classes render
- [ ] Set `VITE_API_URL=http://localhost:8000` in `.env`
- [ ] Implement a JWT storage helper (e.g. localStorage or memory + refresh) and a decode utility for reading the `Role` claim
- [ ] Build a minimal login form calling `POST /auth/login` and storing the returned token
**Definition of done**
`npm run dev` serves a Tailwind-styled app, and after logging in, the
decoded `Role` claim is readable from the stored token in the browser.
 
---
 
### Issue: User / Officer / Admin portals
 
**Labels:** `type:feature` `phase:1-local` `module:7-frontend`
 
**Description**
Build the three role-gated views and wire them to the backend endpoints
built in Modules 2–6.
 
**Tasks**
- [ ] Build routing/layout that renders one of three portals based on the decoded JWT role
- [ ] User portal: report lost/found item (with photo upload), view matches, submit claim, track claim status, view notifications
- [ ] Officer portal: verify lost/found reports, review and approve/reject claims
- [ ] Admin portal: dashboard summary, reports, category management, AuditLog viewer
- [ ] Implement backend `GET /dashboard/summary` and `GET /dashboard/reports` (Dashboard module) to back the Admin view
- [ ] Confirm no view is reachable by a role that shouldn't have it (test by manually editing/removing the token)
**Definition of done**
Reading the code confirms portal selection is driven entirely by the
decoded JWT role, not a hardcoded flag, and each portal's core flows work
against the local backend.
 
---
 
## Milestone: Module 8 — Local demo kit
 
### Issue: Complete root docker-compose.yml (all 4 services)
 
**Labels:** `type:setup` `phase:1-local` `module:8-demo-kit`
 
**Description**
Assemble the full local stack into one file so the entire system comes up
with a single command.
 
**Tasks**
- [ ] Define `db`, `backend`, `frontend`, and `mailpit` services in one root `docker-compose.yml`
- [ ] Add healthchecks to `db` and `depends_on: condition: service_healthy` on `backend`
- [ ] Confirm `backend` runs its Alembic migrations automatically on startup
- [ ] Decide and implement how `frontend` is served (Vite dev server container vs. built static bundle) — built bundle means `docker compose up` is the only prerequisite, no local `node_modules` needed
- [ ] Test `docker compose up --build` from a clean checkout with no manual steps
**Definition of done**
`docker compose up --build` from a clean checkout brings up all four
services successfully with zero manual intervention.
 
---
 
### Issue: Seed script + `make demo` target
 
**Labels:** `type:feature` `phase:1-local` `module:8-demo-kit`
 
**Description**
Automate demo-data setup so the system is presentation-ready immediately
after startup, not empty.
 
**Tasks**
- [ ] Write a seed script creating one User per role (User/Officer/Administrator)
- [ ] Seed the 4 categories (if not already done in Module 1)
- [ ] Seed a handful of LostItems/FoundItems, including at least two deliberately-matching pairs
- [ ] Run the seed script automatically on first startup (or via an explicit `make seed` target)
- [ ] Write a `Makefile` with a `make demo` target wrapping build + migrate + seed + up
**Definition of done**
Running `make demo` alone, from a clean checkout, produces a fully
populated, ready-to-present system.
 
---
 
### Issue: Offline smoke test + Tutorial.md
 
**Labels:** `type:testing` `phase:1-local` `module:8-demo-kit`
 
**Description**
Prove the demo kit has zero hidden external dependencies, and document it
so anyone on the team (or a judge) can run it.
 
**Tasks**
- [ ] Disconnect the machine from the internet
- [ ] Run `make demo` (or `docker compose up --build`) from a clean checkout
- [ ] Walk the full Report → Match → Claim → Verify → Collect path end to end
- [ ] Confirm the resulting notification email appears in Mailpit
- [ ] Write `Tutorial.md` documenting the exact command and each service's local URL (frontend, backend `/docs`, Mailpit)
- [ ] Have a teammate who hasn't touched this part of the project follow `Tutorial.md` from scratch and confirm it works for them too
**Definition of done**
With wifi disabled, one command brings up the system from a clean
checkout, and the full happy path completes without a single failure or
external call.
 
---
 
## Milestone: Module 9 — Cloud migration & deployment (optional)
 
### Issue: Create Supabase project, migrate DATABASE_URL
 
**Labels:** `type:deploy` `phase:2-cloud` `module:9-deployment`
 
**Description**
Move the schema from local Postgres to Supabase without editing any
migration files.
 
**Tasks**
- [ ] Create a Supabase project, note `DATABASE_URL`
- [ ] Point the backend's `.env`/deployment config at the new `DATABASE_URL`
- [ ] Run existing Alembic migrations against it unchanged
- [ ] Re-run the Module 1 seed script (or a production-safe variant) against Supabase
- [ ] Confirm the schema in Supabase Studio matches the local one exactly
**Definition of done**
The same Alembic migrations from Module 1 run against Supabase with no
edits, producing an identical schema.
 
---
 
### Issue: `SupabaseStorage` adapter behind existing interface
 
**Labels:** `type:deploy` `phase:2-cloud` `module:9-deployment`
 
**Description**
Add the cloud storage implementation without touching the Items module's
calling code.
 
**Tasks**
- [ ] Implement `SupabaseStorage` satisfying Module 3's `StorageBackend` interface
- [ ] Add `SUPABASE_URL`/`SUPABASE_KEY`/`SUPABASE_STORAGE_BUCKET` to backend env
- [ ] Switch the active implementation via one env var (e.g. `STORAGE_BACKEND=supabase`)
- [ ] Test file upload/retrieval end to end against Supabase Storage
- [ ] Confirm zero changes were needed in `backend/app/modules/items/`
**Definition of done**
File upload/retrieval works identically to `LocalDiskStorage`, with the
Items module's code completely untouched — only a new implementation
file and an env var changed.
 
---
 
### Issue: `ResendEmailBackend` adapter behind existing interface
 
**Labels:** `type:deploy` `phase:2-cloud` `module:9-deployment`
 
**Description**
Add the cloud email implementation without touching the Notifications
module's trigger logic.
 
**Tasks**
- [ ] Implement `ResendEmailBackend` satisfying Module 6's `EmailBackend` interface
- [ ] Add `RESEND_API_KEY` to backend env
- [ ] Switch the active implementation via env var (e.g. `EMAIL_BACKEND=resend`)
- [ ] Test a real email delivery for at least one trigger (e.g. claim approval)
- [ ] Confirm zero changes were needed in `backend/app/modules/notifications/`
**Definition of done**
A claim approval sends a real email via Resend, with the Notifications
module's code completely untouched.
 
---
 
### Issue: Deploy backend (Render) + frontend (Vercel)
 
**Labels:** `type:deploy` `phase:2-cloud` `module:9-deployment`
 
**Description**
Get both halves of the app live, pointed at the same Supabase project.
 
**Tasks**
- [ ] Create a Render service for the backend, connected to the GitHub repo
- [ ] Set all required backend env vars on Render (`DATABASE_URL`, `SUPABASE_*`, `JWT_SECRET`, `RESEND_API_KEY`)
- [ ] Create a Vercel project for the frontend, connected to the GitHub repo
- [ ] Set `VITE_API_URL` on Vercel to the live Render backend URL
- [ ] Confirm both auto-deploy on push to `main`
- [ ] Walk the full happy path against the live frontend URL
**Definition of done**
The live frontend URL can complete a full Report → Match → Claim →
Verify → Collect flow against the live backend.
 
---
 
### Issue: Cloudflare DNS/HTTPS/WAF
 
**Labels:** `type:deploy` `phase:2-cloud` `module:9-deployment`
 
**Description**
Put Cloudflare in front of the deployed app for DNS, HTTPS, and basic
protection — no nginx config required.
 
**Tasks**
- [ ] Add the domain to Cloudflare and update nameservers
- [ ] Point DNS records at the Vercel frontend and Render backend
- [ ] Enable "Full (strict)" HTTPS mode
- [ ] Enable the WAF and basic rate limiting
- [ ] Confirm the live domain enforces HTTPS and resolves correctly
**Definition of done**
The live domain serves over HTTPS through Cloudflare, with WAF active.
 
---
 
### Issue: Backup verification
 
**Labels:** `type:security` `phase:2-cloud` `module:9-deployment`
 
**Description**
Confirm the "at least two backup copies" course requirement is actually
satisfied, not assumed.
 
**Tasks**
- [ ] Confirm Supabase's automatic backups are enabled on the project
- [ ] Set up a second, independent backup (e.g. a periodic `pg_dump` exported somewhere outside Supabase)
- [ ] Document both backup locations and restore steps in the repo
- [ ] Do a test restore of the second copy to confirm it's actually usable, not just present
**Definition of done**
Two independent backup copies exist, both documented with restore steps,
and the second copy has been test-restored at least once.
