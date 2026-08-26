# TRACE — Frontend (Module 7)

React 19 + Vite + TypeScript + Tailwind CSS v4 SPA consuming the TRACE FastAPI
backend. Three role-gated portals (User / Officer / Administrator) share one
design system extracted from `demo/officer/style.css`.

## Local dev

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Requires the backend on `http://localhost:8000` (see the repo root README;
backend CORS allows `http://localhost:5173`). API base is `VITE_API_URL`
in `.env` (copy `.env.example`).

## Test accounts

| Role          | Email                  | Password       |
|---------------|------------------------|----------------|
| User          | ada@example.com        | SuperSecret1!  |
| User          | bob@example.com        | SuperSecret1!  |
| Officer       | officer@example.com    | TestPass123!   |
| Administrator | admin@example.com      | TestPass123!   |

## Structure

- `src/routes/auth/` — login / register / success screens (demo/auth identity)
- `src/routes/user/` — User portal (report items + photos, matches, claims, notifications)
- `src/routes/officer/` — Officer portal (verify reports, review claims, collections, status)
- `src/routes/admin/` — Admin portal (summary, categories, reports, audit log)
- `src/components/layout/` — shared AppShell (sidebar + topbar)
- `src/components/ui/` — shared design-system primitives (buttons, cards, badges…)
- `src/lib/` — API client, JWT storage/decode, types, auth context
- `src/hooks/` — authed fetch hooks

Full reference: `Notes.md` §13 (Frontend) and `Review.md` §Module 7.
