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

## How the app is organised (kept deliberately simple)
Five tabs at the bottom: **Home · Add · Confirm · Orders · More**. *Home* shows the whole job as three numbered steps (1 Add orders → 2 Confirm with customers → 3 Ship) with live counts and one big button each. Everything occasional (dashboard, delivery companies, team, settings, subscription, history import, my data) lives under **More**, grouped with one-line descriptions. The orders list has two primary buttons; import/export/etc. are in a collapsed *More actions* menu.
- **Import past orders** (More → Order history): upload a carrier export (xlsx/csv); columns and statuses are suggested and shown in a preview; orders are stored as **history** (never in the confirmation queue, not counted in the monthly quota, re-importing adds nothing), so the *refused before* warning and the return stats work from day one.
- Order search accepts phones however they are typed (`0655…`, `+212 655…`, `655 44 33`).

## Easy flows (what sellers/agents use daily)
- **Smart add** (`/orders/quick`): paste an order as received (WhatsApp/Instagram, Arabic/French/one-line or labelled, several at once) → name, phone, city (AMEEX spelling), address, product, price are detected; review and save.
- **Confirmation mode** (`/confirm`): one order at a time. *To send* lane: big WhatsApp button, then the order moves on. *Awaiting reply* lane: ✅ Confirmed / ❌ Cancelled / 📵 No answer / ⏰ in 2h / tomorrow. Orders with earlier refusals show a warning.

## Shipping, follow-up and data sources
- **Send all confirmed** (orders list, one button per API-connected company): sends every confirmed order not yet sent (max 50): orders without an address or with a city unknown to that company are skipped and listed with the reason.
- **Tracking** (for companies whose connector supports it): shipped orders are checked every 3 h (and on demand); "delivered"/"returned" are applied automatically and the raw AMEEX status is shown. AMEEX's public docs do not list status names or the response body, so the mapping is keyword-based and conservative (unknown → no change). **Verify with a real parcel** and adjust `mapAmeexStatus` / `extractStatusText` in `src/lib/ameexFlow.ts`.
- **Confirmation mode has 3 lanes:** *To send* (new) · *Awaiting reply* (message sent) · *To call today* (no answer + callbacks that are due, with a big Call button). Cancelling asks for a reason (wrong number / changed mind / too expensive / fake / other) which feeds the dashboard.
- **Dashboard:** delivered / returned / return rate and cancellation reasons.
- **Google Sheets (no OAuth):** share the sheet ("anyone with the link can view"), paste the link in Settings; new rows are imported every 10 min or on demand. Only `docs.google.com` links are accepted; re-sorting the sheet does not create duplicates (identical rows are told apart by occurrence).
- Background jobs (backup, tracking, Sheets) start with the server; set `AKKED_NO_JOBS=1` to disable them.

## Subscription, backups and legal
- **Billing** (`/billing`, owner): current plan/days left/usage, plan cards, the admin's payment instructions (bank / CashPlus / Wafacash), and an "I paid" form (reference + optional proof image/PDF ≤ 2 MB, verified by file signature). Banner: 3 days before the end and when expired.
- **Admin** (`/admin`): pending payments with proof → **Activate** (adds 30 days from today, or from the current end if still active) or **Reject**; platform settings (payment instructions, support WhatsApp, operator name/contact/jurisdiction used by the legal pages); nav badge shows pending count.
- **Backups:** a consistent SQLite snapshot at startup (if older than 20 h) and every 6 h in `data/backups` (last 14; override with `AKKED_BACKUP_DIR`). Admin can download a fresh snapshot (`/admin/backup`) — **keep a copy off the server**. Restore = stop the app, replace `data/akked.db` with a snapshot, start.
- **Legal & data rights:** public `/terms` and `/privacy` (Arabic/French; fill the operator details in `/admin`; **have them reviewed by a lawyer**), consent checkbox at signup, **My data** (settings): export everything as JSON, erase a customer's data on request, delete the account. Security headers set in `next.config.js`.

## Teams, accounts and safety
- **Edit order** (`/orders/:id/edit`): name, phone, city (AMEEX list with suggestions), address, product, price… All edits are logged in the order history.
- **Message variables:** `{name} {product} {price} {city} {address} {order_number} {size} {qty} {shop}`; a "send your address" line is added automatically when the address is missing.
- **Roles:** agents can add/confirm/edit orders but cannot export the customer list, nor open dashboard, team, settings or billing (enforced on the server, not only hidden).
- **No double work:** the order shown in confirmation mode is claimed for that agent for 10 minutes.
- **Forgot password (no email needed):** a one-time **recovery code** is shown at signup (stored hashed, replaced after each use); owners can reset an agent's password (temporary password shown once); the platform admin can reset an owner's. Login/reset attempts are rate-limited (8 / 15 min).
- **First run:** a 3-step checklist and a "5 demo orders" button.

## WhatsApp without any registration (default)
The seller uses their own WhatsApp (phone or WhatsApp Web) — nothing to connect. On desktop **every send reuses one WhatsApp Web window** (put it side by side with Akked: `Win+←` / `Win+→`), on phones it uses wa.me. In the *awaiting reply* lane the agent can paste the customer's reply and get a one-tap confirm/cancel suggestion, or use keyboard shortcuts (C / X / N). No Meta account, company, or token needed.

## WhatsApp inbox (official Cloud API, optional / advanced)
Sellers connect their own number (Settings → WhatsApp: **Phone number ID**, **Access token**, approved **template name/language**; token stored encrypted).
- **Send official** in confirmation mode sends the approved template (`{{1}}` name, `{{2}}` product, `{{3}}` price, `{{4}}` city) and moves the order on.
- **Inbox** (`/inbox`): every customer reply appears live; reply in free text within 24 h of their last message (WhatsApp rule), otherwise send the template.
- **Auto-confirm:** short replies (نعم / oui / ok / 1 → confirmed; لا / non / annuler / 2 → cancelled), including taps on template quick-reply buttons, update the customer's open order. Longer messages stay for a human.
- Webhook: `POST/GET /api/whatsapp/webhook` (HMAC `X-Hub-Signature-256` verified; duplicates ignored). Env: `WA_APP_SECRET` (Meta app secret), `WA_VERIFY_TOKEN` (any string you also type in Meta's webhook settings), optional `WA_GRAPH_VERSION` (default `v25.0`).
- Needs a **public HTTPS URL** for Meta to reach the webhook (deploy, or a tunnel such as cloudflared/ngrok for local tests).

Meta setup (platform owner, once): create a Meta app + WhatsApp product, verify the business, create a **utility template** (body with `{{1}}..{{4}}` plus quick-reply buttons "نعم، أؤكد" / "لا، ألغِ"), subscribe the webhook to the `messages` field. Per seller: either their own app token for the test, or Embedded Signup (incl. *Coexistence*, which keeps the number on the WhatsApp Business app and links it by QR) once you are an approved Tech Provider — not built yet. Meta bills API messages (templates; service messages beyond the free monthly allowance).

## Android app (APK)
`android/` builds a ~37 KB signed APK (WebView shell: server-address screen, file picker, downloads, WhatsApp/phone hand-off). Needs your Akked server (LAN address for tests, `https://` later). See `android/README.md` — includes rebuild steps, limits, and the Play Store note.

## Delivery companies (any carrier)
AMEEX is just the first built-in example. **Settings → Delivery companies** (`/carriers`) lets a seller add as many companies as they use:
- **Any company, no code:** upload its Excel/CSV template (or paste its column names). Akked finds the header row (even under a title row), **suggests what each column means** (name, phone 06…, city, address, COD price, product…), and the seller confirms. Exports fill the company's *own* template (styling kept) or generate a CSV. A *sample file* button lets them check before the first real export.
- **Upload your company's model:** a prominent *Upload your carrier's model* button (orders list, and a call-to-action card until one is added). `.xlsx`, `.csv` (`,` `;` or tab) and pasted column names are supported; old binary `.xls` is refused with a clear message (re-save as `.xlsx`). When a company sends a **new version of its file**, *Replace model* on its page re-reads it and **keeps the seller's column choices** for headers that still exist (accents/case ignored) and flags the new ones.
- **Company city lists:** paste its cities (`id,name` or just names); they are matched to customers' spellings automatically and the export writes the company's own spelling/id. Orders whose city isn't in the list are flagged.
- **API connectors (optional):** `src/lib/connectors/`. A connector declares credential fields, `send`, optional `track`, `mapStatus`, an optional built-in city list and an optional export preset. Registered ones appear under *Add a company → built-in*, give a **Send to {company}** button (single + "send all confirmed") and automatic status tracking. **Adding a company = one new file + one line in `connectors/index.ts`** once you have its API docs. Today: AMEEX.
- Credentials are stored AES-256-GCM encrypted per seller and company (set `AKKED_SECRET`). Existing single-AMEEX accounts are migrated into a carrier profile automatically.
- AMEEX specifics: the official city list (604 ids) is built in; the public docs show no response bodies or status names, so parcel-code parsing and the status keyword mapping (`connectors/ameex.ts`) are best-effort — **verify with one real parcel**. `AMEEX_BASE_URL` overrides the host for tests only.

## Known gaps before going public
- Exports write phones as text in national format (06…) and PRIX as the order total; confirm each company accepts this, and whether its COD field should include delivery fees.
- No native `.xlsx` import (paste cells or save as CSV). No email invites or callback reminders yet.
- WhatsApp inbox is tested against a mock of Meta's API only; verify with a real test number before selling. Embedded Signup (one-click connect) is not built; sellers paste the token for now. Polling (6 s) instead of push for the inbox.
- Tenant isolation is enforced in application queries (every query filters by `workspace_id`), not by DB-level RLS. Moving to Postgres/Supabase should add RLS.
- Login/reset are rate-limited; still use HTTPS in production (cookie is `secure` there) and put the app behind a reverse proxy/CDN for network-level limits.
- Darija texts need native review. Legal texts are templates: get them reviewed; CNDP declaration/authorisation (law 09-08) is yours to file.

## Deploy (test)
SQLite needs a persistent disk: use a VPS / Railway / Fly.io volume (`npm run build && npm start`, set `AKKED_DB=/data/akked.db`).
Vercel is not suitable for SQLite; migrate to Supabase first if you want Vercel.
