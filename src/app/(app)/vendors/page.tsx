"use client";

import * as React from "react";
import { Loader2, Package, Phone, Plus, ReceiptText, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/money";

interface VendorRow {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  notes: string | null;
  purchasesCount: number;
  purchasesTotal: number;
}

export default function VendorsPage() {
  const [q, setQ] = React.useState("");
  const [vendors, setVendors] = React.useState<VendorRow[] | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/vendors?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setVendors(json.vendors);
    } catch {
      toast.error("Could not load vendors");
    }
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Vendors</h1>
          <p className="text-sm text-muted-foreground">Suppliers, GSTIN &amp; purchase history</p>
        </div>
        <Button
          className="h-11 bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Vendor
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or phone…"
          className="h-11 border-violet-500/25 bg-white/5 pl-9"
          aria-label="Search vendors"
        />
      </div>

      {!vendors ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />)}
        </div>
      ) : vendors.length === 0 ? (
        <GlassCard variant="plain" className="p-8 text-center text-sm text-muted-foreground">
          No vendors found. Add your first supplier to start tracking purchases.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vendors.map((v) => (
            <GlassCard key={v.id} variant="plain" className="p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/40">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 text-violet-300">
                    <Truck className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold">{v.name}</p>
                    {v.phone ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" aria-hidden /> {v.phone}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">No phone on file</p>
                    )}
                  </div>
                </div>
                {v.gstin ? (
                  <Badge className="shrink-0 border-cyan-500/40 bg-cyan-500/10 font-mono text-[10px] text-cyan-300" title="GSTIN">
                    {v.gstin}
                  </Badge>
                ) : null}
              </div>

              {v.notes ? (
                <p className="mt-3 line-clamp-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-muted-foreground">
                  {v.notes}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300">
                  <Package className="h-3.5 w-3.5" aria-hidden /> {v.purchasesCount} {v.purchasesCount === 1 ? "purchase" : "purchases"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                  <ReceiptText className="h-3.5 w-3.5" aria-hidden /> {formatINR(v.purchasesTotal)} purchased
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <AddVendorDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); load(); }} />
    </div>
  );
}

function AddVendorDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setGstin("");
      setNotes("");
    }
  }, [open]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, gstin, notes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add vendor");
      toast.success(`${json.vendor?.name} added`);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add vendor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Add Vendor</DialogTitle>
          <DialogDescription>Suppliers for F&amp;B stock and gear — GSTIN optional.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="vd-name">Name</Label>
            <Input id="vd-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sharma Distributors" className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vd-phone">Phone (optional)</Label>
            <Input id="vd-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vd-gstin">GSTIN (optional)</Label>
            <Input id="vd-gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="24ABCDE1234F1Z5" className="border-violet-500/25 bg-white/5 font-mono uppercase" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vd-notes">Notes (optional)</Label>
            <Textarea id="vd-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery days, payment terms…" rows={2} className="border-violet-500/25 bg-white/5" />
          </div>
          <Button type="submit" disabled={busy || !name.trim()} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add Vendor
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
