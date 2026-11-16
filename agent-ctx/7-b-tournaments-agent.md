# Task 7-b — Tournaments & Esports module (work record)

Agent: 7-b (Tournaments module)
Date: 2026-02-14 (session)

## Files created (exactly 5, nothing else touched)

1. `src/app/(app)/tournaments/page.tsx` — client page (dark neon, mobile-first)
2. `src/app/api/tournaments/route.ts` — GET list + POST create
3. `src/app/api/tournaments/[id]/route.ts` — PATCH edit/status + DELETE (OWNER only)
4. `src/app/api/tournaments/[id]/entries/route.ts` — POST add + PATCH feePaid toggle + DELETE remove
5. `src/app/api/tournaments/[id]/results/route.ts` — POST set positions (1..3), marks COMPLETED

## API contracts implemented (verified end-to-end with curl)

- `GET /api/tournaments` → `{ tournaments: [{ id, name, game, stationType, startsAt, entryFee, prizePool, maxPlayers, status, notes, entryCount, paidCount, winners: [{position, name}], entries: [...] }] }`
  - Order: UPCOMING/ONGOING first (startsAt asc), then COMPLETED/CANCELLED (startsAt desc).
  - `entries` is an EXTRA field beyond the contract — needed by UI for feePaid toggle / remove / results picks (entry ids are not otherwise exposed).
- `POST /api/tournaments` — validates name 2..80, game 2..40, stationType in STATION_TYPES, startsAt parseable, fees >= 0, maxPlayers 2..256 → 201 `{ tournament }`.
- `PATCH /api/tournaments/[id]` — partial edit (status/name/game/stationType/startsAt/entryFee/prizePool/maxPlayers/notes), status validated against TOURNAMENT_STATUSES → 200 `{ tournament }`.
- `DELETE /api/tournaments/[id]` — STAFF → 400 `Owner access required`; OWNER → deletes tournament (entries cascade) → `{ ok: true }`.
- `POST /api/tournaments/[id]/entries` — name 2..60; phone optional normalized 10-13 digits; full check → `Tournament is full`; dup by same phone OR same name (case-insensitive) → `Player already registered`; → 201 `{ entry }`.
- `PATCH /api/tournaments/[id]/entries` — `{ entryId, feePaid }` toggle (added to same file per instructions) → 200 `{ entry }`.
- `DELETE /api/tournaments/[id]/entries?entryId=` → 200 `{ ok: true }` (404 if entry not in this tournament).
- `POST /api/tournaments/[id]/results` — `{ results: [{ entryId, position }] }`, positions unique ints 1..3, entries must belong to tournament, sets status COMPLETED → 200 `{ ok: true, tournament }`.

## Page features

- Header (font-display + neon-text), StatCards: Upcoming count / Total prize pool (formatINR) / Registered players.
- GlassCard grid (sm:2 / xl:3 cols), variant cyan for UPCOMING else purple; status badges cyan/amber(+dot-pulse)/emerald/red; game + stationType badges (TYPE_STYLES).
- Meta rows: startsAt (fmtDateTime), entry fee (IndianRupee), prize pool amber-gold, n/max players + violet progress bar, notes line.
- Register dialog: name, optional phone, "pick existing customer" from `GET /api/members?q=` (fills name+phone), feePaid switch.
- Per-entry: feePaid toggle button (emerald/amber) → PATCH entries; remove X (44px) → DELETE entries; players list max-h-96 scroll-neon.
- Set Results dialog: 3 selects (1st/2nd/3rd) with auto-clear on duplicate pick; POST results.
- Inline status Select → PATCH; Delete (Trash, OWNER only via useSession role, confirm()).
- Leaderboard block when winners exist: 1st Crown gold + glow, 2nd Medal slate, 3rd Medal amber.
- Empty state + Create dialog (name, game with quick picks Valorant/BGMI/FC 25/Call of Duty, stationType select, datetime-local, entryFee, prizePool, maxPlayers, notes textarea).
- Loading skeletons, toast on all errors (server message), all buttons >= 44px, aria-labels, SessionProvider wrapped in-page so `useSession()` works without touching shared files.

## Validation results

- `bunx tsc --noEmit`: ZERO errors in my 5 files. Only pre-existing error: `src/app/book/page.tsx(255,18) TS18047 'avail' is possibly 'null'` (another agent's file, not mine).
- `bun run lint`: exit 0, clean.
- E2E curl tests (owner + staff sessions): create/register/dup/full/phone/feePaid/results/delete all return contract responses; seeded tournament "Valorant City Clash — Rajkot" untouched (final count 1); `GET /tournaments` renders 200.
- dev.log: all tournament routes 200/201/400 as expected; no runtime errors from my code.

## Notes for other agents

- Nav link `/tournaments` already existed in app-shell (no shell change needed).
- GET /api/tournaments response includes `entries[]` — if you need entry ids elsewhere, reuse it instead of adding a new endpoint.
- Used guards pattern: `requireSession()` for both roles; `g.role !== "OWNER" → badRequest("Owner access required")` on DELETE (returns 400 per contract, not 403).
