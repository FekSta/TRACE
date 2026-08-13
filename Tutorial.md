# TRACE — Demo Tutorial

> **T**racking, **R**ecovery, **A**nd **C**laim **E**ngine
> *Every lost item leaves a trace.* 🧭

This guide brings up the **entire TRACE system on your own machine** — database,
API, web app, and email — with **one command**, and walks you through a demo
from start to finish. You do not need to know anything about the codebase, and
you do not need any cloud accounts. Everything runs locally in Docker.

---

## 1. What you need

- **Docker** with Docker Compose (v2+). Check with:
  ```bash
  docker --version && docker compose version
  ```
- **`make`** (comes with Linux/macOS dev tools; if you don't have it, use the
  plain `docker compose up --build` command instead — see §2).
- A free TCP port on `5432`, `8000`, `5173`, `8025`, and `1025`.
- Internet the **first** time you run this (Docker downloads the base images
  and packages once). After that, everything runs locally.

## 2. Start the system (one command)

From the repository root:

```bash
make demo
```

(If you don't have `make`, the exact same thing is: `docker compose up --build`.)

**What happens:** Docker builds four small images (the first build takes a few
minutes), starts the database first, then the backend — which **automatically
runs its database migrations and seeds demo data** — then the frontend and the
email catcher. `make demo` waits until the API is answering and prints the
URLs and logins.

You're done when you see **`TRACE is up 🧭`**.

### What you get

| Service | URL | What it is |
|---|---|---|
| 🖥 **Frontend** | <http://localhost:5173> | the TRACE web app (three role portals) |
| ⚙️ **Backend API** | <http://localhost:8000> | FastAPI; interactive docs at <http://localhost:8000/docs> |
| 📧 **Mailpit** | <http://localhost:8025> | the email inbox — every TRACE email lands here |
| 🗄 **Database** | `localhost:5432` | Postgres (user `trace`, password `trace_local_password`) |

## 3. Log in (seeded accounts)

The demo data includes one account per role. Use these exact credentials:

| Role | Email | Password |
|---|---|---|
| **User** (lost items) | `ada@example.com` | `SuperSecret1!` |
| **User** (found items) | `bob@example.com` | `SuperSecret1!` |
| **Lost & Found Officer** | `officer@example.com` | `TestPass123!` |
| **Administrator** | `admin@example.com` | `TestPass123!` |

Each login takes you to the portal for that role automatically.

## 4. What's already in the system (seeded data)

On a fresh start the database contains:

- **4 categories** — Electronics, Bags, Clothes, Documents & Cards.
- **3 lost items** (reported by Ada): *Black Nike backpack*, *Blue Sony
  headphones*, *Silver laptop*.
- **3 found items** (registered by Bob): *Black Nike backpack*, *Blue Sony
  headphones*, *Red Nike jacket*.
- **2 suggested matches, both scored 100%** — the deliberately-matching pairs:
  - *Black Nike backpack* ↔ *Black Nike backpack*
  - *Blue Sony headphones* ↔ *Blue Sony headphones*
- **4 emails in Mailpit** — one "a potential match was found" email to each
  party of each match.

> **Verify the matches via the API** (optional, but it's the quickest proof the
> matching engine is working):
>
> ```bash
> TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
>   -d '{"email":"officer@example.com","password":"TestPass123!"}' \
>   | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
> curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/matches
> ```
>
> You'll see two matches, each with `"match_score": "100.00"` and
> `"status": "Suggested"`.

## 5. Demo walkthrough — "what to click first"

### Step 1 — See the suggested matches (as the User)

1. Open <http://localhost:5173> and log in as **`ada@example.com` /
   `SuperSecret1!`**.
2. Open **My Matches** (left sidebar). You'll see your two suggested matches,
   each scored **100%** — one for the *Black Nike backpack*, one for the
   *Blue Sony headphones*. (Both reports belong to seeded users; if a card
   shows an item number on the found side, that's the other user's report —
   the score is what matters.)
3. Click **Accept** on the *Black Nike backpack* match. TRACE creates an
   ownership claim for you automatically.

### Step 2 — Approve and hand over the item (as the Officer)

1. Log out, then log in as **`officer@example.com` / `TestPass123!`**.
2. Open **Review Claims** — Ada's backpack claim is listed as *Pending*.
3. Click **Approve** (add a note like "ID verified against student card").
   The claim moves to Approved, and the items are reserved.
4. Open **Collections**, find the approved claim, and click **Collect** to
   record the handover. The claim becomes *Completed*.

### Step 3 — Check the emails (Mailpit)

Open <http://localhost:8025>. You'll see the full email trail: match alerts to
Ada and Bob, "your claim was submitted", "your claim was approved", and "your
item is ready for collection". This is the notification pipeline — all local,
no internet.

### Step 4 — The Administrator view

Log in as **`admin@example.com` / `TestPass123!`**. The Admin portal shows the
system summary (item/claim/match counts), the **Manage Categories** screen with
the four seeded categories, and the reports/audit screens.

### Step 5 — Report a new item (live matching)

Still as Ada (log back in as the User), open **Report Lost Item** and report a
lost *Blue Sony headphones* in the **Library** (Electronics category), with a
similar description (e.g. *"Blue Sony wireless headphones with black carrying
case"*). Within a moment, **My Matches** shows a brand-new suggested match
against the found headphones — the matching engine runs live on every report.

> Why the headphones and not the backpack: step 2 collected the backpack, so
> that found item is no longer available to match against — the headphones
> pair is the untouched one. The live-matching trick works with any new report
> that resembles an *available* found item.

## 6. Resetting the demo

The walkthrough above *consumes* the seeded backpack match (its claim becomes
Completed and the items are Closed/Returned) — that's the system working. To
get back to the pristine, fully-seeded state:

```bash
make clean      # stops everything and wipes the data
make demo       # fresh, fully-populated demo again
```

Re-running `make demo` alone (without `make clean`) is always safe — the seed
is idempotent and will never duplicate data, but it also won't resurrect
matches you've already accepted, which is why the reset above exists.

## 7. Everyday commands

| Command | What it does |
|---|---|
| `make demo` | Start the full system (build + migrate + seed + wait) |
| `make seed` | Re-run the idempotent demo seed (safe any time) |
| `make up` / `make down` | Start / stop the stack (data kept) |
| `make clean` | Stop and wipe **all** data (fresh-demo reset) |
| `make logs` | Follow all service logs |
| `make ps` | Show service status |
| `docker compose exec db psql -U trace -d trace` | Open the database |

## 8. Troubleshooting

**"address already in use" on startup.** Something else is already using a
port — usually a leftover dev server. Stop it, then retry:
```bash
# stop a leftover Vite dev server / host backend (adjust paths if yours differ):
pkill -f "frontend/node_modules/.bin/vite" ; pkill -f "uvicorn app.main"
docker compose up --build
```

**The frontend opens but looks unstyled / slow.** Let the first build finish
(see `docker compose logs frontend`). Google Fonts load from the internet — if
you're offline the app falls back to system fonts (cosmetic only).

**The backend never becomes ready.** Look at its logs — the entrypoint prints
exactly where it is:
```bash
docker compose logs backend
```
The most common cause is the database not being reachable; the backend retries
automatically for ~30s before giving up.

**Anything else.** Run `docker compose ps` for service health, and
`docker compose logs <service>` for details. `make clean && make demo` fixes
most odd states.

---

*Phase 1 is 100% local: Docker Postgres → FastAPI on localhost → React bundle
in nginx → local disk uploads → Mailpit for email. No cloud accounts, no
external API keys.*
