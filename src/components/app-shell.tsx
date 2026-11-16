"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  CalendarDays,
  Gamepad2,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Timer,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Brand, NexoryosBadge } from "@/components/brand";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stations", label: "Stations", icon: Gamepad2 },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/pos", label: "F&B POS", icon: ShoppingCart },
  { href: "/members", label: "Members", icon: Users },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/shifts", label: "Shifts", icon: Timer },
  { href: "/billing", label: "Billing", icon: ReceiptText },
  { href: "/expenses", label: "Expenses", icon: IndianRupee, ownerOnly: true },
  { href: "/pricing", label: "Pricing", icon: SlidersHorizontal, ownerOnly: true },
  { href: "/reports", label: "Reports", icon: BarChart3, ownerOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.ownerOnly || role === "OWNER");
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "border border-violet-500/40 bg-violet-500/15 text-white shadow-[0_0_14px_rgba(139,92,246,0.25)]"
                : "border border-transparent text-muted-foreground hover:border-violet-500/20 hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-violet-300" : "text-muted-foreground group-hover:text-cyan-300")} />
            {label}
            {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 dot-glow" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("w-full justify-start border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200", className)}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="mr-2 h-4 w-4" /> Sign out
    </Button>
  );
}

export function AppShell({
  role,
  name,
  children,
}: {
  role: Role;
  name: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-violet-500/15 bg-[#0c1122]/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-white/5 px-5">
          <Link href="/dashboard" aria-label="NexoryOS dashboard">
            <Brand size="sm" withByline={false} />
          </Link>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">by Nexoryos</span>
        </div>
        <div className="flex-1 overflow-y-auto scroll-neon p-3">
          <NavLinks role={role} />
        </div>
        <div className="border-t border-white/5 p-3">
          <div className="mb-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="truncate text-sm font-semibold">{name || "User"}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full dot-glow",
                  role === "OWNER" ? "bg-emerald-400 text-emerald-400" : "bg-cyan-400 text-cyan-400"
                )}
              />
              {role === "OWNER" ? "Owner" : "Staff"}
            </p>
          </div>
          <SignOutButton />
          <div className="mt-3 flex justify-center">
            <NexoryosBadge />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-violet-500/15 bg-[#0a0e1a]/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" aria-label="NexoryOS dashboard">
          <Brand size="sm" withByline={false} />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open menu" className="border-violet-500/30">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 border-violet-500/20 bg-[#0c1122]/95 p-4 backdrop-blur-xl">
            <SheetTitle className="mb-4">
              <Brand size="sm" />
            </SheetTitle>
            <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="truncate text-sm font-semibold">{name || "User"}</p>
              <p className="text-xs text-muted-foreground">{role === "OWNER" ? "Owner" : "Staff"}</p>
            </div>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
            <div className="mt-4 space-y-3">
              <SignOutButton />
              <div className="flex justify-center">
                <NexoryosBadge />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-60">
        <main className="flex-1 p-4 pb-8 sm:p-6 lg:p-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
          {children}
        </main>
        <footer className="mt-auto border-t border-violet-500/15 bg-[#0c1122]/60 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} NexoryOS GameZone OS — every session billed, every hour filled.
            </p>
            <NexoryosBadge />
          </div>
        </footer>
      </div>
    </div>
  );
}

export const NAV_ITEMS = NAV;
export const NAV_ICONS = { IndianRupee };
