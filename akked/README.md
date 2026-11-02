# Akked (أكّد) — test version

Order confirmation for Moroccan COD sellers. This is the **test version**: Next.js 15 + SQLite (single-file DB, zero setup).
The data layer (`src/lib/db.ts`, `src/lib/orders.ts`) is isolated so it can be swapped for Supabase/Postgres later.

## Run locally
```bash
cd akked
npm install
ADMIN_EMAIL=you@example.com npm run dev      # http://localhost:3000
```
Sign up with `ADMIN_EMAIL` to get the super-admin panel (`/admin`: activate/suspend plans, set period, see usage).
Data lives in `data/akked.db` (override with `AKKED_DB`). Tests: `npm test`.

## Included (Phase 1, test level)
Signup/login + 14-day trial · agents (owner creates them, plan seat limit) · manual orders · CSV/TSV paste or upload import with
Moroccan phone normalization · filters/search · wa.me WhatsApp with editable Darija/Arabic/French templates · 9 statuses (+callback date)
· customer history + "refused before" badge (per seller only) · CSV export (AMEEX placeholder + generic, pluggable in `src/lib/exporters.ts`)
· dashboard · monthly order limit + expiry enforcement · Arabic RTL default / French · PWA manifest.

## Known gaps before going public
- AMEEX export now uses the real `AMEEX_MODELE.xlsx` (kept in `templates/`). Phone is written as national format (06...) as text; confirm AMEEX accepts this, and whether PRIX is the COD amount.
- No native `.xlsx` import (paste cells or save as CSV). No password reset, email invites, or callback reminders yet.
- Tenant isolation is enforced in application queries (every query filters by `workspace_id`), not by DB-level RLS. Moving to Postgres/Supabase should add RLS.
- No login rate limiting; add before production. Use HTTPS (cookie is `secure` in production).
- Darija texts need native review. CNDP / law 09-08: add privacy page, data export/deletion tools, and file your declaration.

## Deploy (test)
SQLite needs a persistent disk: use a VPS / Railway / Fly.io volume (`npm run build && npm start`, set `AKKED_DB=/data/akked.db`).
Vercel is not suitable for SQLite; migrate to Supabase first if you want Vercel.
