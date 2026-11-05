// Server-side zone settings with defaults. Use inside API routes / server components.

import { db } from "@/lib/db";

export interface ZoneSettings {
  zoneName: string;
  openHour: number; // 10
  closeHour: number; // 22
}

const DEFAULTS: ZoneSettings = { zoneName: "Nexoryos Gaming Zone", openHour: 10, closeHour: 22 };

export async function getZoneSettings(): Promise<ZoneSettings> {
  const rows = await db.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    zoneName: map.get("zoneName") ?? DEFAULTS.zoneName,
    openHour: clampHour(Number(map.get("openHour") ?? DEFAULTS.openHour), DEFAULTS.openHour),
    closeHour: clampHour(Number(map.get("closeHour") ?? DEFAULTS.closeHour), DEFAULTS.closeHour),
  };
}

function clampHour(v: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(23, Math.max(0, Math.round(v)));
}

export async function saveZoneSettings(input: Partial<ZoneSettings>): Promise<void> {
  const pairs: [string, string][] = [];
  if (input.zoneName !== undefined) pairs.push(["zoneName", input.zoneName]);
  if (input.openHour !== undefined) pairs.push(["openHour", String(clampHour(input.openHour, DEFAULTS.openHour))]);
  if (input.closeHour !== undefined) pairs.push(["closeHour", String(clampHour(input.closeHour, DEFAULTS.closeHour))]);
  for (const [key, value] of pairs) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
