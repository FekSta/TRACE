<div align="center">
    <img src="/assets/logos/trace-logo.png" alt="TRACE logo" width="400" height="250">
</div>

> Every lost item leaves a trace. 🧭

---

## ❔ What TRACE is?

- a centralized platform for lost and found management
- across campuses, businesses, and public organizations
- through **intelligent matching** of lost and found reports
- with **automated claim verification** and **ownership workflows**
- exposed via **role-based portals** for users, officers, and administrators

> [!IMPORTANT]
> This is **infrastructure**, not a bulletin board. 🎯

## ⛔ What TRACE is not!

- ❌ Not a classifieds platform.
- ❌ Not a social network.
- ❌ Not a database wrapper.
- ❌ Not a manual ticketing system.

> TRACE **stops at recovery + trust.** | **Lost & Found is infrastructure.**

## V1 Pilot Constraint (Non-negotiable)

> [!WARNING]
> These constraints are **non-negotiable** for the V1 pilot. Scope creep disqualifies the MVP.

- **One deployment context** — University campus (students, staff, visitors)
- **One claim workflow** — Report → Match → Claim → Verify → Collect
- **One matching engine** — Category + Location + Date + Description similarity scoring
- **One notification channel** — Email alerts for matches, claims, and updates

> Judges reward focus.

## System Architecture (Competition + Interview Grade)

This describes the initial V1 MVP architecture.

> [!TIP]
> TRACE follows a **modular monolith** architecture for V1. Each business capability is isolated into its own module while sharing a single backend and database. This keeps the application simple to develop, test, and deploy, while allowing individual modules to be extracted into independent services as the system grows.

### High Level Architecture

```text
                React Web Portal
                        │
                        ▼
                Cloudflare / Vercel
                        │
                        ▼
                  FastAPI Backend
        ┌────────────┬────────────┬────────────┐
        │            │            │            │
     Auth        Item Mgmt    Matching     Dashboard
     Module       Module       Module       Module
        │            │            │            │
        └────────────┴────────────┴────────────┘
                        │
                        ▼
               PostgreSQL (Supabase)
                        │
        ┌───────────────┴────────────────┐
        │                                │
   Supabase Storage                 Email Service
      (Images)                 (Match & Claim Alerts)
```

---

### Client Layer

<div align="center">
    React Web Portal (online-first, responsive)
</div>

<div align="center">
    <img src="/assets/browser-logos/chrome.png" alt="Chrome logo" width="70" height="70">
    <img src="/assets/browser-logos/firefox.png" alt="Firefox logo" width="70" height="70">
    <img src="/assets/browser-logos/edge.png" alt="Edge logo" width="70" height="70">
</div>

The frontend is a React 19 single-page application responsible for:

- Reporting lost items
- Reporting found items
- Uploading item photos
- Viewing potential matches
- Submitting ownership claims
- Tracking claim status
- Receiving notifications
- Administrator dashboards

> [!NOTE]
> Users submit reports. TRACE performs the matching. Officers verify ownership and complete the recovery workflow.

---

### Backend Layer (FastAPI)

The backend is organized into independent modules, each responsible for a single business capability.

| Module | Responsibility |
|---------|----------------|
| **Authentication** | User registration, login, JWT authentication, roles and permissions |
| **Item Management** | Lost items, found items, categories, images, status tracking |
| **Matching Engine** | Automatic matching, confidence scoring, duplicate detection |
| **Claims** | Ownership verification, claim workflow, collection approval |
| **Dashboard** | Reports, analytics, administration, system configuration |
| **Notifications** | Email notifications for matches, claims, and workflow updates |

> [!TIP]
> Modules communicate through internal service boundaries rather than network calls. This reduces complexity while maintaining clear separation of responsibilities.

---

### Database Layer

TRACE uses a single PostgreSQL database to maintain transactional consistency across all modules.

Core entities include:

- Users
- Roles
- Categories
- Lost Items
- Found Items
- Item Images
- Matches
- Claims
- Notifications
- Audit Logs

Images are stored separately in object storage, with only their URLs persisted in the database.

---

### API Responsibilities

The API is stateless and can be horizontally scaled by running multiple FastAPI instances behind a load balancer if required.

Primary responsibilities include:

- JWT authentication
- Role-based authorization
- Lost and found item management
- Image upload handling
- Automatic matching
- Ownership claim processing
- Officer verification
- Administrative reporting
- Notification delivery

Example endpoints:

```bash
POST   /auth/login
POST   /auth/register

GET    /items/lost
POST   /items/lost

GET    /items/found
POST   /items/found

GET    /matches
POST   /claims
POST   /claims/{id}/verify

GET    /dashboard/summary
GET    /dashboard/reports
```

---

### Why a Modular Monolith?

For the V1 pilot, a modular monolith provides the best balance between maintainability and delivery speed.

Benefits include:

- Simpler deployment
- Easier local development
- Shared authentication
- Single database transaction boundary
- Reduced infrastructure overhead
- Clear separation of business domains
- Straightforward evolution into microservices if future growth requires it

> [!IMPORTANT]
> The architecture is intentionally designed so that modules such as **Authentication**, **Matching**, **Claims**, or **Dashboard** can later be extracted into standalone microservices without significant changes to the business logic.
