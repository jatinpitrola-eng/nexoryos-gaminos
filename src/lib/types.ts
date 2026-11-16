// GAMINOS shared domain types (SQLite-safe: enums stored as strings)

export type Role = "OWNER" | "STAFF";

export type StationType = "PS5" | "XBOX" | "PC" | "VR" | "SNOOKER" | "RACING";
export type StationStatus = "FREE" | "BUSY" | "MAINTENANCE";

export type RuleKind = "STUDENT" | "HAPPYHOUR" | "OFFPEAK" | "PEAK";

export type WalletTxnType = "RECHARGE" | "SPEND" | "BONUS" | "REFUND";
export type SessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type BookingStatus = "BOOKED" | "CHECKEDIN" | "NOSHOW" | "CANCELLED" | "COMPLETED";
export type BookingSource = "WALKIN" | "PHONE" | "ONLINE";
export type PaymentMethod = "UPI" | "CASH" | "CARD";
export type FnBCategory = "BEVERAGES" | "SNACKS" | "MEALS" | "ENERGY" | "OTHER";
export type FnBOrderStatus = "OPEN" | "PAID";
export type ExpenseCategory = "RENT" | "SALARY" | "ELECTRICITY" | "INTERNET" | "OTHER";
export type TournamentStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type MembershipTier = "SILVER" | "GOLD" | "PLATINUM";

export const STATION_TYPES: StationType[] = ["PS5", "XBOX", "PC", "VR", "SNOOKER", "RACING"];
export const RULE_KINDS: RuleKind[] = ["STUDENT", "HAPPYHOUR", "OFFPEAK", "PEAK"];
export const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "CASH", "CARD"];
export const FN_B_CATEGORIES: FnBCategory[] = ["BEVERAGES", "SNACKS", "MEALS", "ENERGY", "OTHER"];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["RENT", "SALARY", "ELECTRICITY", "INTERNET", "OTHER"];
export const BOOKING_SOURCES: BookingSource[] = ["WALKIN", "PHONE", "ONLINE"];
export const TOURNAMENT_STATUSES: TournamentStatus[] = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"];
export const MEMBERSHIP_TIERS: MembershipTier[] = ["SILVER", "GOLD", "PLATINUM"];

// ---------- Shared API payloads ----------

export interface FloorStation {
  id: string;
  name: string;
  type: StationType;
  status: StationStatus;
  hourlyRate: number;
  /** Currently applicable rate after pricing rules (equals hourlyRate when no rule matches). */
  effectiveRate?: number;
  /** Name of the winning pricing rule, e.g. "Student Special (PC)" — null when base rate applies. */
  effectiveRuleName?: string | null;
  effectiveKind?: string | null;
  activeSession: {
    id: string;
    startedAt: string; // ISO
    rateSnapshot: number;
    customerName: string | null;
    customerPhone: string | null;
    sessionStatus?: "ACTIVE" | "PAUSED";
    pausedMinutes?: number;
    pausedAt?: string | null; // ISO, set while PAUSED
  } | null;
}

export interface DashboardStats {
  todayRevenue: number;
  activeSessions: number;
  occupancyPct: number;
  walletBalanceHeld: number;
  upcomingBookingsToday: number;
}

export interface DashboardPayload {
  stats: DashboardStats;
  floor: FloorStation[];
  last7Days: { date: string; label: string; revenue: number }[];
  emptyHours: number[]; // hours (10-21) with 0 occupancy today
  now: string; // server ISO time
}
