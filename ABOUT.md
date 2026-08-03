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

### High Level Architecture

#### Client Layer

<div align="center">
    React Web Portal (online-first, responsive)
</div>
<div align="center">
    <img src="/assets/browser-logos/chrome.png" alt="Chrome logo" width="70" height="70">
    <img src="/assets/browser-logos/firefox.png" alt="Firefox logo" width="70" height="70">
    <img src="/assets/browser-logos/edge.png" alt="Edge logo" width="70" height="70">
</div>

- React 19 single-page application
- Handles:
    - lost/found item reporting
    - image uploads
    - claim submission & tracking
    - notification inbox

> [!NOTE]
> **Clients submit reports.** The system does the matching. Officers close the loop.

<div align="center">
    Admin dashboard (for reports, analytics, and user management)
</div>

#### API Layer (Nginx → FastAPI)

> [!TIP]
> The API layer is stateless and horizontally scalable. Add more FastAPI instances behind Nginx to handle traffic spikes.

Responsibilities:

- authentication & role management (JWT)
- lost item lifecycle management
- found item lifecycle management
- matching orchestration
- claim verification workflow

**Key endpoints:**

```bash
    POST   /auth/login
    POST   /auth/register
    GET    /items/lost
    GET    /items/found
    POST   /items/lost
    POST   /items/found
    POST   /claims
    POST   /claims/{id}/verify
    GET    /reports/summary
