/**
 * GAMINOS seed core — idempotent (safe to re-run, uses upserts/guards).
 * Imported by prisma/seed.ts (CLI) and src/lib/bootstrap.ts (first signup).
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { computeStationFee, loyaltyPointsFor } from "../src/lib/money";
import { resolveRateFromRules } from "../src/lib/pricing";
import { startOfDay, addDays } from "../src/lib/hours";

const db = new PrismaClient();

function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export async function runSeed(): Promise<{ stations: number; customers: number }> {
  // ---------- Users ----------
  await db.user.upsert({
    where: { email: "owner@gaminos.test" },
    update: { role: "OWNER" },
    create: { email: "owner@gaminos.test", name: "Zone Owner", passwordHash: hashPassword("gaminos123"), role: "OWNER" },
  });
  await db.user.upsert({
    where: { email: "staff@gaminos.test" },
    update: { role: "STAFF" },
    create: { email: "staff@gaminos.test", name: "Counter Staff", passwordHash: hashPassword("staff123"), role: "STAFF" },
  });

  // ---------- Settings ----------
  const settingPairs: [string, string][] = [
    ["zoneName", "Nexoryos Gaming Zone"],
    ["openHour", "10"],
    ["closeHour", "22"],
  ];
  for (const [key, value] of settingPairs) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // ---------- Stations ----------
  const stationDefs: { name: string; type: string; rate: number }[] = [
    ...Array.from({ length: 4 }, (_, i) => ({ name: `PS5-${String(i + 1).padStart(2, "0")}`, type: "PS5", rate: 120 })),
    ...Array.from({ length: 6 }, (_, i) => ({ name: `PC-${String(i + 1).padStart(2, "0")}`, type: "PC", rate: 80 })),
    ...Array.from({ length: 2 }, (_, i) => ({ name: `VR-${String(i + 1).padStart(2, "0")}`, type: "VR", rate: 250 })),
    ...Array.from({ length: 2 }, (_, i) => ({ name: `Snooker-${String(i + 1).padStart(2, "0")}`, type: "SNOOKER", rate: 150 })),
    { name: "Racing-01", type: "RACING", rate: 200 },
  ];
  const stations: Record<string, { id: string; hourlyRate: number; type: string }> = {};
  for (const s of stationDefs) {
    const st = await db.station.upsert({
      where: { name: s.name },
      update: { type: s.type, hourlyRate: s.rate, isActive: true },
      create: { name: s.name, type: s.type, hourlyRate: s.rate, status: "FREE" },
    });
    stations[s.name] = { id: st.id, hourlyRate: st.hourlyRate, type: st.type };
  }

  // ---------- Pricing rules ----------
  const WEEKDAYS = 2 + 4 + 8 + 16 + 32; // Mon..Fri
  const ALL_DAYS = 127;
  const ruleDefs: { name: string; stationType: string; kind: string; ratePerHour: number; daysMask: number; startHour: number; endHour: number }[] = [
    { name: "Weekday Off-Peak (PC)", stationType: "PC", kind: "OFFPEAK", ratePerHour: 60, daysMask: WEEKDAYS, startHour: 10, endHour: 16 },
    { name: "PS5 Happy Hour", stationType: "PS5", kind: "HAPPYHOUR", ratePerHour: 90, daysMask: ALL_DAYS, startHour: 14, endHour: 17 },
    { name: "Student Special (PC)", stationType: "PC", kind: "STUDENT", ratePerHour: 50, daysMask: ALL_DAYS, startHour: 11, endHour: 16 },
    { name: "Peak Hours (PS5)", stationType: "PS5", kind: "PEAK", ratePerHour: 180, daysMask: ALL_DAYS, startHour: 18, endHour: 22 },
    { name: "Peak Hours (PC)", stationType: "PC", kind: "PEAK", ratePerHour: 120, daysMask: ALL_DAYS, startHour: 18, endHour: 22 },
    { name: "Peak Hours (VR)", stationType: "VR", kind: "PEAK", ratePerHour: 375, daysMask: ALL_DAYS, startHour: 18, endHour: 22 },
    { name: "Peak Hours (Snooker)", stationType: "SNOOKER", kind: "PEAK", ratePerHour: 225, daysMask: ALL_DAYS, startHour: 18, endHour: 22 },
    { name: "Peak Hours (Racing)", stationType: "RACING", kind: "PEAK", ratePerHour: 300, daysMask: ALL_DAYS, startHour: 18, endHour: 22 },
  ];
  for (const r of ruleDefs) {
    const existing = await db.pricingRule.findFirst({ where: { name: r.name, stationType: r.stationType } });
    if (existing) {
      await db.pricingRule.update({ where: { id: existing.id }, data: r });
    } else {
      await db.pricingRule.create({ data: r });
    }
  }

  // ---------- Customers ----------
  const customerDefs = [
    { name: "Aarav Shah", phone: "9876500001", email: "aarav@example.in", walletBalance: 1500, loyaltyPoints: 12 },
    { name: "Vivaan Patel", phone: "9876500002", email: "vivaan@example.in", walletBalance: 800, loyaltyPoints: 5 },
    { name: "Ishaan Mehta", phone: "9876500003", email: "ishaan@example.in", walletBalance: 500, loyaltyPoints: 3 },
    { name: "Priya Desai", phone: "9876500004", email: "priya@example.in", walletBalance: 1000, loyaltyPoints: 8 },
    { name: "Diya Joshi", phone: "9876500005", email: "diya@example.in", walletBalance: 300, loyaltyPoints: 2 },
    { name: "Kabir Trivedi", phone: "9876500006", email: "kabir@example.in", walletBalance: 200, loyaltyPoints: 1 },
    { name: "Ananya Rao", phone: "9876500007", email: "ananya@example.in", walletBalance: 750, loyaltyPoints: 6 },
    { name: "Rehan Shaikh", phone: "9876500008", email: "rehan@example.in", walletBalance: 450, loyaltyPoints: 1 },
  ];
  const customers: Record<string, { id: string }> = {};
  for (const c of customerDefs) {
    const cu = await db.customer.upsert({
      where: { phone: c.phone },
      update: { name: c.name },
      create: c,
    });
    customers[c.name] = { id: cu.id };
  }

  // Wallet txns only for customers that have none (keeps re-runs clean)
  const txnSeeds: { customer: string; amount: number; type: string; note: string }[] = [
    { customer: "Aarav Shah", amount: 1500, type: "RECHARGE", note: "First recharge — Gamer Pro welcome" },
    { customer: "Aarav Shah", amount: 120, type: "BONUS", note: "Gamer Pro bonus minutes credit" },
    { customer: "Vivaan Patel", amount: 1000, type: "RECHARGE", note: "Recharge at counter (UPI)" },
    { customer: "Vivaan Patel", amount: -200, type: "SPEND", note: "PC-01 session" },
    { customer: "Priya Desai", amount: 1000, type: "RECHARGE", note: "Recharge + membership bundle" },
    { customer: "Priya Desai", amount: 60, type: "BONUS", note: "Casual Gamer bonus minutes credit" },
    { customer: "Diya Joshi", amount: 300, type: "RECHARGE", note: "Recharge at counter (Cash)" },
    { customer: "Kabir Trivedi", amount: 200, type: "RECHARGE", note: "Recharge at counter (UPI)" },
  ];
  for (const t of txnSeeds) {
    const count = await db.walletTxn.count({ where: { customerId: customers[t.customer].id } });
    if (count === 0) {
      await db.walletTxn.create({
        data: { customerId: customers[t.customer].id, amount: t.amount, type: t.type, note: t.note },
      });
    }
  }

  // ---------- Memberships ----------
  const membershipSeeds = [
    { customer: "Aarav Shah", planName: "Gamer Pro — 90 Days", price: 999, bonusMinutes: 120, days: 90, startedDaysAgo: 30 },
    { customer: "Priya Desai", planName: "Casual Gamer — 30 Days", price: 499, bonusMinutes: 60, days: 30, startedDaysAgo: 10 },
  ];
  for (const m of membershipSeeds) {
    const existing = await db.membership.findFirst({
      where: { customerId: customers[m.customer].id, planName: m.planName },
    });
    const startsAt = at(-m.startedDaysAgo, 10);
    const expiresAt = addDays(startsAt, m.days);
    if (existing) {
      await db.membership.update({ where: { id: existing.id }, data: { price: m.price, bonusMinutes: m.bonusMinutes, isActive: true } });
    } else {
      await db.membership.create({
        data: {
          customerId: customers[m.customer].id, planName: m.planName, price: m.price,
          bonusMinutes: m.bonusMinutes, startsAt, expiresAt, isActive: true,
        },
      });
    }
  }

  // ---------- F&B items ----------
  const fnbDefs = [
    { name: "Cold Coffee", category: "BEVERAGES", price: 60, stock: 24, lowStockAlert: 5 },
    { name: "Masala Maggi", category: "SNACKS", price: 40, stock: 30, lowStockAlert: 6 },
    { name: "Cheese Nachos", category: "SNACKS", price: 90, stock: 12, lowStockAlert: 4 },
    { name: "Energy Drink", category: "ENERGY", price: 120, stock: 3, lowStockAlert: 5 },
    { name: "French Fries", category: "SNACKS", price: 70, stock: 18, lowStockAlert: 5 },
    { name: "Blue Lagoon Mocktail", category: "BEVERAGES", price: 80, stock: 8, lowStockAlert: 4 },
  ];
  for (const f of fnbDefs) {
    await db.fnBItem.upsert({
      where: { name: f.name },
      update: { price: f.price, category: f.category },
      create: f,
    });
  }

  // ---------- Open shift ----------
  const openShift = await db.shift.findFirst({ where: { closedAt: null } });
  if (!openShift) {
    const now = new Date();
    const openedAt = now.getHours() >= 10 ? at(0, 10) : now;
    await db.shift.create({
      data: { staffName: "Ravi (Counter Staff)", openedAt, openingCash: 2000, note: "Morning shift — counter float ₹2,000" },
    });
  }

  // ---------- Demo sessions ----------
  const rules = await db.pricingRule.findMany({ where: { isActive: true } });

  async function seedSession(opts: {
    station: string; customer: string; start: Date; end: Date;
    payMethod: string; fnb?: { name: string; price: number; qty: number }[];
  }) {
    const st = stations[opts.station];
    const resolved = resolveRateFromRules(rules, st.type, st.hourlyRate, opts.start);
    const { minutes, fee } = computeStationFee(resolved.rate, opts.start, opts.end);
    const fnbTotal = (opts.fnb ?? []).reduce((s, i) => s + i.price * i.qty, 0);
    const total = fee + fnbTotal;
    const session = await db.session.create({
      data: {
        stationId: st.id,
        customerId: customers[opts.customer].id,
        startedAt: opts.start,
        endedAt: opts.end,
        rateSnapshot: resolved.rate,
        stationFee: fee,
        fnbTotal,
        discount: 0,
        total,
        status: "COMPLETED",
      },
    });
    if (opts.fnb && opts.fnb.length > 0) {
      await db.fnBOrder.create({
        data: {
          sessionId: session.id,
          items: JSON.stringify(opts.fnb.map((i) => ({ name: i.name, price: i.price, qty: i.qty }))),
          total: fnbTotal,
          status: "PAID",
        },
      });
    }
    await db.payment.create({
      data: { sessionId: session.id, amount: total, method: opts.payMethod },
    });
    await db.customer.update({
      where: { id: customers[opts.customer].id },
      data: { loyaltyPoints: { increment: loyaltyPointsFor(total) } },
    });
  }

  // Today: 3 completed sessions; past 6 days: 2–3/day so charts & reports have history
  // Tuple: [dayOffset, station, customer, startH, startM, endH, endM, payMethod, fnb?]
  const sessionDefs: [number, string, string, number, number, number, number, string, { name: string; price: number; qty: number }[] | undefined][] = [
    [0, "PS5-01", "Aarav Shah", 11, 0, 12, 10, "UPI", [{ name: "Cold Coffee", price: 60, qty: 2 }, { name: "Cheese Nachos", price: 90, qty: 1 }]],
    [0, "PC-02", "Vivaan Patel", 12, 0, 13, 30, "CASH", undefined],
    [0, "Snooker-01", "Kabir Trivedi", 13, 0, 14, 0, "UPI", undefined],
    [-1, "PC-03", "Ishaan Mehta", 11, 0, 12, 30, "UPI", undefined],
    [-1, "PS5-02", "Diya Joshi", 16, 0, 17, 15, "CASH", undefined],
    [-1, "VR-01", "Ananya Rao", 19, 0, 20, 0, "CARD", undefined],
    [-2, "PS5-04", "Rehan Shaikh", 12, 0, 13, 20, "UPI", undefined],
    [-2, "PC-05", "Aarav Shah", 15, 0, 16, 45, "CASH", undefined],
    [-2, "Snooker-02", "Vivaan Patel", 20, 0, 21, 0, "UPI", undefined],
    [-3, "PC-01", "Priya Desai", 10, 30, 11, 30, "UPI", undefined],
    [-3, "PS5-03", "Ishaan Mehta", 18, 0, 19, 30, "CASH", undefined],
    [-4, "PC-04", "Kabir Trivedi", 14, 0, 15, 0, "CASH", undefined],
    [-4, "Racing-01", "Ananya Rao", 17, 0, 18, 20, "CARD", undefined],
    [-4, "PS5-01", "Aarav Shah", 20, 0, 21, 15, "UPI", undefined],
    [-5, "PC-06", "Diya Joshi", 11, 0, 12, 0, "UPI", undefined],
    [-5, "VR-02", "Rehan Shaikh", 16, 0, 17, 0, "CARD", undefined],
    [-5, "Snooker-01", "Vivaan Patel", 19, 0, 20, 30, "CASH", undefined],
    [-6, "PS5-02", "Ananya Rao", 12, 0, 13, 10, "UPI", undefined],
    [-6, "PC-02", "Ishaan Mehta", 15, 0, 16, 30, "UPI", undefined],
    [-6, "Racing-01", "Kabir Trivedi", 21, 0, 21, 45, "CASH", undefined],
  ];
  for (const [day, station, customer, sh, sm, eh, em, method, fnb] of sessionDefs) {
    const start = at(day, sh, sm);
    const exists = await db.session.findFirst({
      where: { stationId: stations[station].id, startedAt: start, status: "COMPLETED" },
    });
    if (!exists) {
      await seedSession({ station, customer, start, end: at(day, eh, em), payMethod: method, fnb });
    }
  }

  // ---------- Upcoming bookings (deposits paid) ----------
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 2);
  const lateDay = nextHour.getHours() + 2 > 21; // would spill past close
  const b1Start = lateDay ? at(1, 11) : nextHour;
  const b1End = lateDay ? at(1, 13) : new Date(nextHour.getTime() + 3600_000);
  const b2Start = lateDay ? at(1, 15) : new Date(nextHour.getTime() + 2 * 3600_000);
  const b2End = lateDay ? at(1, 17) : new Date(nextHour.getTime() + 3 * 3600_000);

  await db.booking.upsert({
    where: { code: "GM-DEMO1" },
    update: { slotStart: b1Start, slotEnd: b1End, depositPaid: true, status: "BOOKED" },
    create: {
      code: "GM-DEMO1", stationId: stations["VR-01"].id, customerId: customers["Priya Desai"].id,
      slotStart: b1Start, slotEnd: b1End, depositAmount: 250, depositPaid: true,
      status: "BOOKED", source: "PHONE",
    },
  });
  await db.booking.upsert({
    where: { code: "GM-DEMO2" },
    update: { slotStart: b2Start, slotEnd: b2End, depositPaid: true, status: "BOOKED" },
    create: {
      code: "GM-DEMO2", stationId: stations["PS5-03"].id, customerId: customers["Ishaan Mehta"].id,
      slotStart: b2Start, slotEnd: b2End, depositAmount: 150, depositPaid: true,
      status: "BOOKED", source: "WALKIN",
    },
  });

  // ---------- Expenses & maintenance ----------
  const monthStart = at(0, 0);
  monthStart.setDate(1);
  const rent = await db.expense.findFirst({ where: { title: "Zone Rent — current month" } });
  if (!rent) {
    await db.expense.create({ data: { title: "Zone Rent — current month", category: "RENT", amount: 45000, date: monthStart } });
  }
  const elec = await db.expense.findFirst({ where: { title: "Electricity bill (previous cycle)" } });
  if (!elec) {
    await db.expense.create({ data: { title: "Electricity bill (previous cycle)", category: "ELECTRICITY", amount: 8400, date: at(-5, 10) } });
  }
  const maint = await db.maintenanceLog.findFirst({ where: { issue: "GPU fan noise — cleaned & tested" } });
  if (!maint) {
    await db.maintenanceLog.create({
      data: { stationId: stations["PC-06"].id, issue: "GPU fan noise — cleaned & tested", cost: 350, resolvedAt: at(-2, 20) },
    });
  }

  // ---------- Tournament (esports) ----------
  const tourn = await db.tournament.upsert({
    where: { id: "seed-tournament-1" },
    update: { startsAt: at(3, 18) },
    create: {
      id: "seed-tournament-1",
      name: "Valorant City Clash — Rajkot",
      game: "Valorant",
      stationType: "PC",
      startsAt: at(3, 18),
      entryFee: 100,
      prizePool: 3000,
      maxPlayers: 16,
      status: "UPCOMING",
      notes: "5v5 double elim. Winner takes ₹2,000 + 20 free hours.",
    },
  });
  const existingEntries = await db.tournamentEntry.count({ where: { tournamentId: tourn.id } });
  if (existingEntries === 0) {
    await db.tournamentEntry.createMany({
      data: [
        { tournamentId: tourn.id, name: "Rahul Bhai", phone: "9876543210", feePaid: true },
        { tournamentId: tourn.id, name: "Jay Vanani", phone: "9812345670", feePaid: true },
        { tournamentId: tourn.id, name: "Dev Bhatia", phone: "9900112233", feePaid: false },
        { tournamentId: tourn.id, name: "Karan Lakhani", phone: "9765432109", feePaid: true },
      ],
    });
  }

  const [stationCount, customerCount] = await Promise.all([db.station.count(), db.customer.count()]);
  return { stations: stationCount, customers: customerCount };
}
