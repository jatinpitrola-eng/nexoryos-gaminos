"use client";

import * as React from "react";
import { Loader2, Plus, ShieldCheck, Store, Users } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { NexoryosBadge } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hourLabel, fmtDate } from "@/lib/hours";

interface ZoneSettings {
  zoneName: string;
  openHour: number;
  closeHour: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = React.useState<ZoneSettings | null>(null);
  const [users, setUsers] = React.useState<UserRow[] | null>(null);
  const [zoneName, setZoneName] = React.useState("");
  const [openHour, setOpenHour] = React.useState("10");
  const [closeHour, setCloseHour] = React.useState("22");
  const [saveBusy, setSaveBusy] = React.useState(false);
  const [staffOpen, setStaffOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSettings(json.settings);
      setUsers(json.users);
      setZoneName(json.settings.zoneName);
      setOpenHour(String(json.settings.openHour));
      setCloseHour(String(json.settings.closeHour));
    } catch {
      toast.error("Could not load settings");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaveBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneName, openHour: Number(openHour), closeHour: Number(closeHour) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success("Zone settings saved");
      setSettings(json.settings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="font-display text-xl font-bold sm:text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Zone profile, open hours & team.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Zone profile */}
        <GlassCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5">
              <Store className="h-5 w-5 text-violet-300" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold">Zone Profile</h2>
              <p className="text-xs text-muted-foreground">Name & operating hours (drive calendars & empty-hour hints).</p>
            </div>
          </div>
          {!settings ? (
            <Skeleton className="mt-4 h-40 bg-white/5" />
          ) : (
            <form onSubmit={save} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="st-zone">Zone name</Label>
                <Input id="st-zone" value={zoneName} onChange={(e) => setZoneName(e.target.value)} className="border-violet-500/25 bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Opens at</Label>
                  <Select value={openHour} onValueChange={setOpenHour}>
                    <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-56 border-violet-500/25 bg-[#0f1526]">
                      {[6, 7, 8, 9, 10, 11, 12].map((h) => <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Closes at</Label>
                  <Select value={closeHour} onValueChange={setCloseHour}>
                    <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-56 border-violet-500/25 bg-[#0f1526]">
                      {[20, 21, 22, 23, 24].map((h) => (
                        <SelectItem key={h} value={String(h)}>{h === 24 ? "12:00 AM (midnight)" : hourLabel(h)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={saveBusy} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
                {saveBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Settings
              </Button>
            </form>
          )}
        </GlassCard>

        {/* Team */}
        <GlassCard className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5">
                <Users className="h-5 w-5 text-cyan-300" aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold">Team</h2>
                <p className="text-xs text-muted-foreground">Owners see everything; staff run the counter.</p>
              </div>
            </div>
            <Button variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10" onClick={() => setStaffOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Staff
            </Button>
          </div>
          <div className="mt-5 space-y-2">
            {(users ?? []).map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email} · joined {fmtDate(u.createdAt)}</p>
                </div>
                <Badge variant="outline" className={u.role === "OWNER" ? "border-violet-500/40 text-violet-300" : "border-cyan-500/40 text-cyan-300"}>
                  {u.role === "OWNER" ? <ShieldCheck className="mr-1 h-3 w-3" /> : null}
                  {u.role}
                </Badge>
              </div>
            ))}
            {!users ? <Skeleton className="h-24 bg-white/5" /> : null}
          </div>
        </GlassCard>
      </div>

      {/* About */}
      <GlassCard className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="font-display text-base font-bold">GAMINOS v1.0</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The complete OS for gaming zones, VR arenas & esports cafés. Demo logins: owner@gaminos.test / gaminos123 · staff@gaminos.test / staff123
          </p>
        </div>
        <NexoryosBadge />
      </GlassCard>

      <AddStaffDialog open={staffOpen} onClose={() => setStaffOpen(false)} onCreated={load} />
    </div>
  );
}

function AddStaffDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/settings/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add staff");
      toast.success(`${json.user?.name} can now sign in (STAFF)`);
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add staff");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Add Staff Account</DialogTitle>
          <DialogDescription>Staff can run stations, POS, bookings & shifts — no reports or pricing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sf-name">Name</Label>
            <Input id="sf-name" value={name} onChange={(e) => setName(e.target.value)} className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sf-email">Email</Label>
            <Input id="sf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sf-pw">Password (min 6)</Label>
            <Input id="sf-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-violet-500/25 bg-white/5" />
          </div>
          <Button type="submit" disabled={busy || !name.trim() || !email.trim() || password.length < 6} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Create Account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
