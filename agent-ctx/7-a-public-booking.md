# Task 7-a — Public Advance Booking Link

Agent: 7-a (public booking feature)
Status: DONE — tsc 0 errors, eslint clean, dev server smoke-tested.

## Files created
- `src/app/book/page.tsx` — public (no-login) booking page: header w/ /nexoryos.png + NEXORYOS neon wordmark + zone name, 6 date chips (Today/Tomorrow/+4), live availability grid per station type with scrollable hour chips (green "5/6" / red line-through "FULL"), station status strip w/ StatusDot (FREE green / BUSY amber "till H:MM" / BOOKED cyan / MAINTENANCE red), booking form (name, phone, type, start hour limited to available hours, duration 1-6 filtered by closeHour, WhatsApp-notify checkbox with Gujarati sub-label), success card with big GM-XXXXX code + "Show this code at the counter" + notify line + reset, footer "A Nexoryos Product". Fetches `/api/public/availability` on mount, date change, type change, and after a successful booking. Mobile-first, 44px touch targets, aria-labels.
- `src/app/api/public/availability/route.ts` — public GET (no requireSession). Returns `{ zoneName, openHour, closeHour, date, now, types[{type,total,hours[{hour,available}]}], stations[{id,name,type,status FREE|BUSY|MAINTENANCE|BOOKED,busyUntil,nextFreeHour}] }`. Rules: only isActive stations; blocked by MAINTENANCE, BOOKED/CHECKEDIN overlap on [h,h+1), and (today && h===currentHour && ACTIVE session); past hours today = 0; date clamped today..+6 else badRequest.
- `src/app/api/public/bookings/route.ts` — public POST (no requireSession). Validates name 2-60, phone normalized to 10-digit Indian (accepts +91/91/0 prefix, spaces/dashes stripped, must start 6-9), stationType in the 6 types, date today..+6, startHour in [openHour, closeHour-1], hours 1-6 with startHour+hours<=closeHour, today startHour>=currentHour. Picks first free active station of the type (skips MAINTENANCE, BOOKED/CHECKEDIN overlaps, today current-hour when ACTIVE session). Upserts Customer by phone (updates name if changed), creates Booking {status BOOKED, source ONLINE, deposit 0/false, notify}. 201 `{ ok, booking { code, stationName, stationType, slotStart, slotEnd, notify } }`; specific badRequest messages otherwise.

## Files edited
- `src/app/(app)/bookings/page.tsx` — added `BookingLinkCard` at top (URL `${origin}/book`, Copy w/ toast, Open in new tab, client-side QR via `QRCode.toDataURL` rendered in white rounded box, QR collapsible on mobile); ONLINE cyan badge when `source==="ONLINE"` (replaces plain source badge for online rows), amber NOTIFY badge when `notify===true`; emerald "Confirm on WhatsApp" `<a href=https://wa.me/91{phone}?text=...>` on rows with notify+phone, prefilled confirmation incl. code/station/date/time, zoneName fetched from /api/settings w/ fallback. All existing features untouched (check-in, no-show, cancel, reminder copy, day calendar, create dialog).
- `src/app/api/bookings/route.ts` — ONE additive line in GET mapping: `notify: b.notify`. Required because the page's Booking type needs `notify` for the NOTIFY badge + WhatsApp button; purely additive to the response shape, no other behavior changed (deviation from "don't touch other API routes" — flagged as necessary for the feature to function).
- `package.json` — only added `qrcode` + dev dep `@types/qrcode` via bun.

## Not touched
middleware, prisma schema/seed, all other API routes/pages, dev server.

## Verification
- `bunx tsc --noEmit` exit 0 (zero errors project-wide).
- `bun run lint` exit 0 (zero warnings).
- Live smoke tests: GET availability 200 (hour counts correct, past hours 0, PS5 16:00 showed 3/4 with an existing booking); bad date 400; POST valid booking 201 (code GM-XXXXX returned); overlap picks next free station; bad phone/short name/past hour/closeHour overflow → 400 with specific messages; /book renders 200. Test bookings/customers were deleted afterwards (DB left clean).
- Phone regex note: task spec regex `/^\+?91?0?\d{10}$/` rejects bare 10-digit numbers (requires leading 9); implemented `/^\+?(91)?0?\d{10}$/` which matches the stated intent (accept +91/91/0 prefix, normalize to 10 digits starting 6-9).
