# NexoryOS GameZone OS

**Complete Gaming Zone Management & PC Control Platform — every session billed, every hour filled.**

GameZone OS is a production-ready operations system for gaming cafés, PS5 lounges, esports centers, VR arenas and snooker+console zones. It replaces paper registers, phone-call bookings and untracked snack counters with one dark-neon dashboard: live floor view, per-minute billing, a **public advance-booking link with WhatsApp notify**, wallets & memberships, F&B POS, tournaments & leaderboards, shift cash control, expenses & profit/loss, printable invoices and an installable **PWA** for phone + tablet + PC.

---

## Features

| Module | Route | What it does |
| --- | --- | --- |
| Landing | `/` | Hero, feature strip, pricing (Starter ₹500/mo · Pro ₹900/mo · **Lifetime ₹40,000**), comparison table, roadmap |
| **Public Booking Link** | `/book` | No login needed — customers see live per-hour availability per station type, book a slot, get a `GM-XXXXX` code, tick **"notify me on WhatsApp"**. Owner shares the link/QR from the Bookings page |
| Live Dashboard | `/dashboard` | Today's revenue, active sessions, occupancy %, wallet held, upcoming bookings · live floor grid with per-second timers · 7-day revenue bars · **empty-hours hint strip** |
| Stations | `/stations` | Walk-in start (existing or quick-add customer), live timer + live cost, **pause/resume sessions (Pro)**, end-session billing modal (station fee + merged F&B + discount → UPI/CASH/CARD split + wallet debit), maintenance toggle |
| Bookings | `/bookings` | Day calendar per station, create with deposit + booking code, **share card with QR + copy link**, **ONLINE / NOTIFY badges**, **Confirm on WhatsApp** button, check-in → converts to session, no-show, cancel, reminder copy |
| Pricing | `/pricing` *(owner)* | CRUD pricing rules per station type (STUDENT > HAPPYHOUR > OFFPEAK > PEAK > base), 7-day masks, hour windows + live rate preview calculator |
| Members & Wallet | `/members` | Search, wallet recharge with bonus minutes, **Silver/Gold/Platinum membership tiers**, loyalty (₹100 spent = 1 point), full history drawer |
| F&B POS | `/pos` | Touch item grid, quantity steppers, stock control, low-stock alerts, attach order to a running (or paused) session or standalone sale |
| **Tournaments** | `/tournaments` | Create esports events (game, entry fee, prize pool, max players), register players (or pick existing customers), fee-paid toggle, set results → **leaderboard with winner crown**, status flow UPCOMING → ONGOING → COMPLETED |
| Shifts | `/shifts` | Open/close shifts, system totals vs counted cash, difference in red, history |
| Billing | `/billing` *(owner)* | Session list, printable branded invoice |
| **Expenses** | `/expenses` *(owner)* | Category expenses (Rent/Salary/Electricity/Internet/Other), month navigator, category bars |
| Reports | `/reports` *(owner)* | Day/week/month revenue, per-station revenue + utilization, 7×12 peak-hour heatmap, revenue split, **expenses + net profit (P&L)**, CSV export |
| Settings | `/settings` *(owner)* | Zone name & open/close hours, add staff, about |

**Roles:** `OWNER` sees everything · `STAFF` cannot open pricing/reports/settings/expenses (nav hidden + middleware redirect + API 403s).

**PWA:** manifest + service worker + icons — install to home screen on Android/iOS/desktop; works phone + tablet + PC.

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** + lucide-react
- **Prisma ORM** + **SQLite** (`db/custom.db`)
- **NextAuth v4** (credentials, JWT sessions, OWNER/STAFF roles)
- Dark-neon theme: Orbitron headings, Inter body, glassmorphism, glowing status dots

## Setup (local)

```bash
bun install          # or: npm install
bun run db:push      # create schema + push to SQLite
bun run db:seed      # seed demo data (idempotent — safe to re-run)
bun run dev          # http://localhost:3000
```

### Default logins

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@gaminos.test` | `gaminos123` |
| Staff | `staff@gaminos.test` | `staff123` |

`/signup` creates new **owner** accounts (first signup auto-seeds the zone).

### Seeded demo data

15 stations (PS5×4 ₹120/hr · Gaming PC×6 ₹80/hr · VR×2 ₹250/hr · Snooker×2 ₹150/hr · Racing×1 ₹200/hr) · 8 pricing rules (student PC ₹50, weekday off-peak ₹60, PS5 happy hour ₹90, per-type peaks) · 9 members with wallets · 2 memberships · 6 F&B items · 1 open shift · 20 sessions across the last 7 days · 2 upcoming bookings with deposits · 1 upcoming tournament with 4 registered players · 2 expenses.

## QA acceptance (all verified)

- All app routes → 200 after login; `/book` public → 200; `/api/health` → `{"ok": true}`
- Public booking: availability grid reflects bookings/active sessions → online booking created with ONLINE + notify flags → WhatsApp confirm button on owner side
- Pause/resume: paused time not billed (`computeStationFeeWithPause`), end-session accepts PAUSED sessions
- Minute math `rate × minutes / 60` rounded to rupee (37 min × ₹120/hr = ₹74)
- Wallet debit + loyalty `floor(total/100)`; pricing calculator weekday 15:00 PC → STUDENT ₹50
- STAFF: `/expenses` redirect + API 403; tournaments accessible
- Mobile 375px verified; footer sticky; `tsc --noEmit` + `eslint` clean

## Deploy

SQLite runs from a local file — for persistent production swap the datasource to Turso/libSQL or run on a small always-on VPS (Railway/Render/Fly.io). Quick demo deploy on Vercel:

1. Push to GitHub → import on Vercel.
2. Env: `DATABASE_URL=file:/tmp/gaminos.db` (ephemeral demo), `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://<app>.vercel.app`.
3. `npm run build`; run `prisma db push` + seed against your hosted DB on first deploy.

> Honest limitation: serverless file storage is ephemeral. For real zones use a VPS with a SQLite volume or Turso.

## API surface

`GET /api/health` · `POST /api/auth/signup` · `/api/auth/*` (NextAuth) · `GET /api/dashboard` · `GET|PATCH /api/stations` · `GET|POST /api/sessions` · `GET /api/sessions/[id]` · `POST /api/sessions/[id]/pause` · `POST /api/sessions/[id]/resume` · `POST /api/sessions/end` · `GET /api/public/availability` · `POST /api/public/bookings` · `GET|POST /api/bookings` · `GET|PATCH /api/bookings/[id]` · `GET|POST /api/pricing/rules` · `PATCH|DELETE /api/pricing/rules/[id]` · `GET /api/pricing/preview` · `GET|POST /api/members` · `GET|PATCH /api/members/[id]` · `POST /api/members/recharge` · `POST /api/membership` · `GET|POST /api/pos/items` · `PATCH|DELETE /api/pos/items/[id]` · `POST /api/pos/orders` · `GET|POST /api/tournaments` · `PATCH|DELETE /api/tournaments/[id]` · `POST|PATCH|DELETE /api/tournaments/[id]/entries` · `POST /api/tournaments/[id]/results` · `GET|POST /api/expenses` · `DELETE /api/expenses/[id]` · `GET|POST /api/shifts` · `POST /api/shifts/close` · `GET /api/billing` · `GET /api/billing/[id]` · `GET /api/reports` · `GET|PUT /api/settings` · `POST /api/settings/staff`

## Roadmap (coming separately)

Windows PC Agent (remote lock/shutdown/monitoring) · Customer mobile app · AI business assistant · Multi-branch cloud console.

---

© **NexoryOS GameZone OS** · **A Nexoryos Product** · built for gaming entrepreneurs in Rajkot → Ahmedabad → Surat → India
