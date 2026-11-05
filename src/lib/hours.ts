// Pure time helpers for zone hours, session overlap math, formatting.
// Safe for client and server.

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addHours(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 3600_000);
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

/** Minutes of [s,e] overlapping [ws,we] */
export function minutesOverlap(s: Date, e: Date, ws: Date, we: Date): number {
  const start = Math.max(s.getTime(), ws.getTime());
  const end = Math.min(e.getTime(), we.getTime());
  if (end <= start) return 0;
  return Math.max(0, (end - start) / 60000);
}

export function fmtTime(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function fmtDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: Date | string): string {
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "10:00" (hour=10) -> "10:00 AM"; hour=13 -> "1:00 PM" */
export function hourLabel(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${ampm}`;
}
