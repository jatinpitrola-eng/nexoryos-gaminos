// Pure money + billing math. Safe for client and server.

/** Format rupees: ₹1,234 (rounded, Indian grouping) */
export function formatINR(n: number | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  return "₹" + v.toLocaleString("en-IN");
}

/** Format with decimals for invoices: ₹1,234.50 */
export function formatINR2(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface FeeBreakdown {
  minutes: number;
  fee: number;
}

/**
 * Station fee: rate/60 × minutes, rounded to the nearest rupee.
 * 37 min × ₹120/hr = ₹74. Minimum billable = 1 minute.
 */
export function computeStationFee(ratePerHour: number, startedAt: Date, endedAt: Date): FeeBreakdown {
  const ms = Math.max(0, endedAt.getTime() - startedAt.getTime());
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  const fee = Math.round((ratePerHour * minutes) / 60);
  return { minutes, fee };
}

/**
 * Pause-aware fee: total elapsed minutes minus accumulated paused minutes
 * and any committed bonus (free-play) minutes.
 * Used for sessions with Pause/Resume and bonus-minute sessions.
 */
export function computeStationFeeWithPause(
  ratePerHour: number,
  startedAt: Date,
  endedAt: Date,
  pausedMinutes: number = 0,
  bonusMinutesUsed: number = 0
): FeeBreakdown & { bonusUsed: number } {
  const base = computeStationFee(ratePerHour, startedAt, endedAt);
  const billable = Math.max(1, base.minutes - Math.max(0, Math.floor(pausedMinutes)));
  const bonusUsed = Math.min(Math.max(0, Math.floor(bonusMinutesUsed)), billable);
  const fee = Math.round((ratePerHour * (billable - bonusUsed)) / 60);
  return { minutes: billable, fee, bonusUsed };
}

/** Loyalty: every ₹100 spent = 1 point */
export function loyaltyPointsFor(amount: number): number {
  return Math.floor(Math.max(0, amount) / 100);
}

/** Booking code: GM-XXXXX */
export function makeBookingCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `GM-${out}`;
}
