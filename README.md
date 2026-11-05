# GAMINOS by Nexoryos

**The complete OS for gaming zones, VR arenas & esports cafés — every session billed, every hour filled.**

GAMINOS is a production-ready operations system for PS5 lounges, gaming PC cafés, VR arenas and snooker+console cafés. It replaces paper registers, phone-call bookings and untracked snack counters with one dark-neon dashboard: live floor view, per-minute billing, deposits & check-ins, wallets & memberships, F&B POS, shift cash control, printable invoices and an empty-hours heatmap that shows exactly where money leaks.

---

## ✨ Features (v1)

| Module | Route | What it does |
| --- | --- | --- |
| Landing | `/` | Hero, 6 features, pricing (Starter ₹999 / Growth ₹1,999 / Franchise ₹4,999), roadmap, free-demo CTA |
| Live Dashboard | `/dashboard` | Today's revenue, active sessions, occupancy %, wallet held, upcoming bookings · live floor grid with per-second timers · 7-day revenue bars · **empty-hours hint strip** |
| Stations | `/stations` | Walk-in start (existing or quick-add customer), live timer + live cost, end-session billing modal (station fee + merged F&B + discount → UPI/CASH/CARD split + wallet debit with balance guard), maintenance toggle |
| Bookings | `/bookings` | Hourly day calendar per station (deposit-paid / booked / free / checked-in), create with deposit + booking code, check-in → converts to session, no-show, cancel, WhatsApp-style reminder copy |
| Pricing | `/pricing` *(owner)* | CRUD pricing rules per station type (STUDENT > HAPPYHOUR > OFFPEAK > PEAK > base), 7-day masks, hour windows + **live rate preview calculator** |
| Members & Wallet | `/members` | Customer search by phone/name, wallet recharge with bonus minutes, memberships, loyalty (₹100 spent = 1 point), full wallet + session history drawer |
| F&B POS | `/pos` | Touch item grid by category, quantity steppers, stock +/- adjust, low-stock alerts, attach order to an active session or standalone counter sale |
| Shifts | `/shifts` | Open/close shifts, system totals (cash payments + wallet recharges + counter F&B) vs counted cash, difference in red, history |
| Billing | `/billing` *(owner)* | Session list with date/status filters, printable branded invoice (print CSS included) |
| Reports | `/reports` *(owner)* | Day/week/month revenue chart, per-station revenue + utilization with best/worst highlight, 7×12 peak-hour heatmap (red = empty hour), revenue split, CSV export |
| Settings | `/settings` *(owner)* | Zone name & open/close hours, team management (add staff), about |

**Roles:** `OWNER` sees everything · `STAFF` gets stations/POS/bookings/members/shifts only (nav hidden + middleware redirect + API 403s).

## 🧰 Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (New York) + lucide-react
- **Prisma ORM** + **SQLite** (file: `db/custom.db`)
- **NextAuth v4** (credentials, JWT sessions, OWNER/STAFF roles)
- Dark-neon theme: Orbitron headings, Inter body, glassmorphism, glowing status dots

## 🚀 Setup (local)

```bash
# 1. install deps
bun install        # or: npm install

# 2. environment (.env is pre-created)
#    DATABASE_URL=file:/absolute/path/to/db/custom.db
#    NEXTAUTH_SECRET=<any-long-random-string>
#    NEXTAUTH_URL=http://localhost:3000

# 3. create schema + push to SQLite
bun run db:push    # or: npm run db:push

# 4. seed demo data (idempotent — safe to re-run)
bun prisma/seed.ts          # or: bunx tsx prisma/seed.ts / npm run db:seed

# 5. run
bun run dev        # or: npm run dev → http://localhost:3000
```

### Default logins

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@gaminos.test` | `gaminos123` |
| Staff | `staff@gaminos.test` | `staff123` |

The signup page (`/signup`) also creates new **owner** accounts (first signup auto-seeds the zone).

### Seeded demo data

15 stations (PS5×4 ₹120/hr · Gaming PC×6 ₹80/hr · VR×2 ₹250/hr · Snooker×2 ₹150/hr · Racing×1 ₹200/hr) · 8 pricing rules (weekday off-peak PC ₹60, PS5 happy hour ₹90, student PC ₹50, per-type peak rates) · 8 members with wallets ₹200–1500 · 2 memberships · 6 F&B items (one low-stock) · 1 open shift · 20 completed sessions across the last 7 days · 2 upcoming bookings with deposits paid.

## ✅ QA acceptance (all verified)

- `curl /` `/login` `/signup` → 200; after login every app route → 200; `/api/health` → `{"ok": true}`
- Session flow: walk-in → live timer → F&B attach → end → **minute math `rate × minutes / 60` rounded to rupee (37 min × ₹120/hr = ₹74)** → split payments + wallet guard → station FREE
- Wallet debit deducts + logs `WalletTxn`; loyalty = `floor(total / 100)` per payment
- Pricing calculator: weekday 15:00 PC → **STUDENT ₹50 wins over OFFPEAK ₹60**
- Mobile 375px: dashboard stacks, POS 2-column grid
- Seed re-runs without duplicates (upserts + per-session guards)

## ☁️ Deploy to Vercel

SQLite runs from a local file, so for a **persistent production deployment** swap the datasource to a hosted DB (Turso/libSQL, PlanetScale, Postgres) — the schema is portable. For a quick demo deploy:

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Environment variables:
   - `DATABASE_URL` — absolute path is not possible on Vercel; use `file:/tmp/gaminos.db` for an ephemeral demo, or point Prisma at Turso (recommended: `@prisma/adapter-libsql`).
   - `NEXTAUTH_SECRET` — long random string.
   - `NEXTAUTH_URL` — your `https://<app>.vercel.app` URL.
4. Build command `npm run build`; add a postbuild/deploy step that runs `prisma db push` + `tsx prisma/seed.ts` against your hosted DB.
5. Open the deployed URL → log in with the seeded owner account.

> Note (honest limitation): serverless file storage is ephemeral — demo deploys lose data on cold starts. For real zones, run the app on a small always-on VPS (Railway/Render/Fly.io) with the SQLite volume attached, or migrate to Turso.

## 🔌 API surface

`GET /api/health` · `POST /api/auth/signup` · `/api/auth/*` (NextAuth) · `GET /api/dashboard` · `GET|PATCH /api/stations` · `GET|POST /api/sessions` · `GET /api/sessions/[id]` · `POST /api/sessions/end` · `GET|POST /api/bookings` · `GET|PATCH /api/bookings/[id]` · `GET|POST /api/pricing/rules` · `PATCH|DELETE /api/pricing/rules/[id]` · `GET /api/pricing/preview` · `GET|POST /api/members` · `GET|PATCH /api/members/[id]` · `POST /api/members/recharge` · `POST /api/membership` · `GET|POST /api/pos/items` · `PATCH|DELETE /api/pos/items/[id]` · `POST /api/pos/orders` · `GET|POST /api/shifts` · `POST /api/shifts/close` · `GET /api/billing` · `GET /api/billing/[id]` · `GET /api/reports` · `GET|PUT /api/settings` · `POST /api/settings/staff`

## 🗺️ Roadmap (v2 — text only)

Online customer booking portal · WhatsApp auto-reminders · tournament brackets · Instagram share cards · multi-branch console · AI footfall prediction · customer mobile app.

---

© GAMINOS · **A Nexoryos Product** · built for gaming entrepreneurs in Rajkot → Ahmedabad → Surat → India
