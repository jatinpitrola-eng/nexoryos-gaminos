import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, badRequest, serverError } from "@/lib/guards";
import { STATION_TYPES, RULE_KINDS } from "@/lib/types";

export const runtime = "nodejs";

function validate(body: Record<string, unknown>, partial = false): string | null {
  const stationType = body?.stationType ? String(body.stationType) : undefined;
  const kind = body?.kind ? String(body.kind) : undefined;
  const name = body?.name !== undefined ? String(body.name).trim() : undefined;
  const ratePerHour = body?.ratePerHour !== undefined ? Number(body.ratePerHour) : undefined;
  const daysMask = body?.daysMask !== undefined ? Number(body.daysMask) : undefined;
  const startHour = body?.startHour !== undefined ? Number(body.startHour) : undefined;
  const endHour = body?.endHour !== undefined ? Number(body.endHour) : undefined;

  if (!partial) {
    if (!name) return "Rule name is required";
    if (!stationType || !STATION_TYPES.includes(stationType as never)) return "Invalid station type";
    if (!kind || !RULE_KINDS.includes(kind as never)) return "Invalid rule kind";
    if (ratePerHour === undefined || !(ratePerHour > 0)) return "Rate per hour must be greater than 0";
  } else {
    if (name !== undefined && !name) return "Rule name cannot be empty";
    if (stationType !== undefined && !STATION_TYPES.includes(stationType as never)) return "Invalid station type";
    if (kind !== undefined && !RULE_KINDS.includes(kind as never)) return "Invalid rule kind";
    if (ratePerHour !== undefined && !(ratePerHour > 0)) return "Rate per hour must be greater than 0";
  }
  if (daysMask !== undefined && !(Number.isInteger(daysMask) && daysMask >= 1 && daysMask <= 127))
    return "Days mask must be between 1 and 127";
  if (startHour !== undefined && !(Number.isInteger(startHour) && startHour >= 0 && startHour <= 23))
    return "Start hour must be 0-23";
  if (endHour !== undefined && !(Number.isInteger(endHour) && endHour >= 1 && endHour <= 24))
    return "End hour must be 1-24";
  if (startHour !== undefined && endHour !== undefined && endHour <= startHour)
    return "End hour must be after start hour";
  if (startHour !== undefined && endHour === undefined && !partial) return "End hour is required";
  return null;
}

export async function GET() {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const rules = await db.pricingRule.findMany({
      orderBy: [{ stationType: "asc" }, { startHour: "asc" }],
    });
    return NextResponse.json({ rules });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const g = await requireSession(["OWNER"]);
    if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({}));
    const err = validate(body);
    if (err) return badRequest(err);

    const rule = await db.pricingRule.create({
      data: {
        stationType: String(body.stationType),
        name: String(body.name).trim(),
        kind: String(body.kind),
        ratePerHour: Number(body.ratePerHour),
        daysMask: Number(body.daysMask ?? 127),
        startHour: Number(body.startHour),
        endHour: Number(body.endHour),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
