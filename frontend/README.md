# TRACE — Frontend (Module 7)

React 19 + Vite + TypeScript + Tailwind CSS v4 SPA consuming the TRACE FastAPI
backend. Three role-gated portals (User / Officer / Administrator) share one
design system: **TRACE Design System v1.0** (`design/DESIGN.md` +
`design/TRACE-Design-System.png`), implemented as Tailwind `@theme` tokens in
`src/index.css`.

## Local dev

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Requires the backend on `http://localhost:8000` (see the repo root README;
backend CORS allows `http://localhost:5173`). API base is `VITE_API_URL`
in `.env` (copy `.env.example`).

## Design system reference

`http://localhost:5173/design` (dev only) renders every section of the design
system sheet — colours, type scale, spacing, radii, shadows, icons, button
states, inputs, badges, indicators, cards, the auth layout pattern, navigation
and principles. It requires no login, is linked from no portal, and is **not
part of a production build** (registered behind `import.meta.env.DEV`).

Token conformance is enforced by `src/design-system/designTokens.test.ts`,
which parses `src/index.css` and asserts every value in `design/DESIGN.md`.

## Test accounts

| Role          | Email                  | Password       |
|---------------|------------------------|----------------|
| User          | ada@example.com        | SuperSecret1!  |
| User          | bob@example.com        | SuperSecret1!  |
| Officer       | officer@example.com    | TestPass123!   |
| Administrator | admin@example.com      | TestPass123!   |

## Structure

- `src/routes/auth/` — login / register / success screens (design system §12 split layout)
- `src/routes/user/` — User portal (report items + photos, matches, claims, notifications)
- `src/routes/officer/` — Officer portal (verify reports, review claims, collections, status)
- `src/routes/admin/` — Admin portal (summary, categories, users, reports, audit log)
- `src/routes/design/` — dev-only design system reference (not shipped)
- `src/components/layout/` — shared AppShell (sidebar + topbar)
- `src/components/ui/` — shared design-system primitives (buttons, cards, badges, indicators…)
- `src/lib/` — API client, JWT storage/decode, types, auth context
- `src/hooks/` — authed fetch hooks

Full reference: `Notes.md` §13 (Frontend, including §13.2 design system) and
`Review.md` (Module 7 + the design system retrofit section).
