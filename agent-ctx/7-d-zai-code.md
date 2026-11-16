# Task 7-d — Rebrand to NexoryOS GameZone OS + Pricing + PWA

## Status: COMPLETE

## Work Summary
Rebranded GAMINOS to **NexoryOS GameZone OS** on public-facing surfaces, replaced pricing, and made the app an installable PWA (phone / tablet / PC).

## Files Edited
- `src/app/page.tsx` — full landing rebrand: hero chip "NexoryOS presents", H1 "GameZone OS" (neon-text), subline per spec, CTA "Book a PC Now" → `/book` (emerald glow) + "Try Free Demo" → `#demo`; 6 feature cards; NEW pricing (Starter ₹500/mo or ₹5,000/yr, Pro ₹900/mo or ₹9,000/yr with violet glow "MOST POPULAR", Lifetime ₹40,000 one-time amber glow "BEST VALUE"); annual note "Yearly plans = 2 months free. Prices exclude GST."; 8-row comparison table (Starter/Pro/Lifetime, Multi-Branch marked Future in all); roadmap strip with "COMING SOON" chips (Windows PC Agent, Customer Mobile App, AI Business Assistant, Multi-Branch Cloud) + honest release note; footer "Developed & Powered by NEXORYOS" + kept "A Nexoryos Product" badge; demo form + login/signup links intact; no blue/indigo.
- `src/app/layout.tsx` — metadata (title/description/manifest/icons/appleWebApp per spec), `viewport` with `viewportFit: "cover"`, renders `<PwaRegister />` next to Toaster. Title template now "%s · NexoryOS GameZone OS".
- `src/components/brand.tsx` — wordmark GAMINOS → NEXORYOS, byline "by Nexoryos" → "GameZone OS" (same classes, withByline kept).
- `src/components/app-shell.tsx` — footer line "© {year} NexoryOS GameZone OS — every session billed, every hour filled." + both aria-labels "GAMINOS dashboard" → "NexoryOS dashboard". NAV untouched.
- `src/app/login/page.tsx` — toast "Welcome back to NEXORYOS GameZone OS!" (logic identical; demo credentials untouched).
- `src/app/signup/page.tsx` — toast "Welcome to NEXORYOS GameZone OS, owner!".

## Files Created
- `src/components/pwa-register.tsx` — client SW registration (skips localhost/127.0.0.1, load-time register of `/sw.js`, returns null).
- `public/manifest.webmanifest` — name "NexoryOS GameZone OS", short_name "NexoryOS", start_url /dashboard, standalone, #0a0e1a theme, 192/512 any + maskable-512 icons.
- `public/sw.js` — nexoryos-v1 cache; skipWaiting/claim; GET-only caching; /api/ and /_next/webpack network-only; documents network-first with cache fallback; static (/_next/static, /icons/, images/css/js) cache-first; only 200 basic responses cached; defensive try/catch.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — generated from `public/nexoryos.png` via sharp (contain on #0a0e1a; maskable logo at 70% center). One-off script ran at /home/z/gen-icons.mjs and was deleted after verification (`sharp` already present in node_modules).

## Verification
- `bunx tsc --noEmit` → exit 0, ZERO errors.
- `bun run lint` → exit 0, clean.
- `ls -la public/icons/` → all 3 PNGs present (33KB / 217KB / 120KB).
- `curl localhost:3000/` → 200; landing HTML contains GameZone OS, NEXORYOS, Book a PC Now, ₹500, ₹40,000, MOST POPULAR, BEST VALUE, manifest link, icon-192 links; no GAMINOS text remains on landing/login.
- `/sw.js`, `/manifest.webmanifest`, `/icons/icon-192.png` → all HTTP 200.
- dev.log → clean 200s, no compile errors.

## Notes for next agents
- `/book` public booking page is linked from landing nav CTA, hero CTA and footer ("Book a PC") but the route did not exist at time of this task — whoever owns it must create `src/app/book/page.tsx`.
- Login demo credentials (`owner@gaminos.test` / `staff@gaminos.test`) intentionally unchanged — they are seeded in DB; seed untouched per hard rules.
- Dashboard sidebar still has a static "by Nexoryos" span in `app-shell.tsx` (out of task scope: only footer + aria-labels were allowed).
