"use client";

import * as React from "react";
import { Check, IndianRupee, Loader2, Plus, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtDate } from "@/lib/hours";
import { formatINR, formatINR2 } from "@/lib/money";

interface PurchaseRow {
  id: string;
  vendorId: string;
  vendorName: string;
  itemName: string;
  fnbItemId: string | null;
  qty: number;
  unitRate: number;
  total: number;
  method: string;
  note: string | null;
  purchasedAt: string;
}

interface PurchasesPayload {
  purchases: PurchaseRow[];
  purchasesTotal: number;
  count: number;
}

interface VendorOpt {
  id: string;
  name: string;
}

interface ItemOpt {
  id: string;
  name: string;
  stock: number;
}

const METHOD_BADGE: Record<string, string> = {
  CASH: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  UPI: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  CARD: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  CREDIT: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

export default function PurchasesPage() {
  const [data, setData] = React.useState<PurchasesPayload | null>(null);
  const [error, setError] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/purchases", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
      toast.error("Could not load purchases");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const vendorsUsed = data ? new Set(data.purchases.map((p) => p.vendorId)).size : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Purchases</h1>
          <p className="text-sm text-muted-foreground">Stock in from vendors — F&amp;B stock updates automatically</p>
        </div>
        <Button
          className="h-11 bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" /> New Purchase
        </Button>
      </header>

      {!data ? (
        error ? (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            Could not load purchases. <Button variant="link" onClick={load}>Retry</Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />)}
          </div>
        )
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total Purchases" value={formatINR(data.purchasesTotal)} icon={IndianRupee} accent="amber" sub="Money out for stock-in" />
            <StatCard title="Purchase Count" value={data.count} icon={ShoppingBag} accent="purple" sub="Latest 200 records" />
            <StatCard title="Vendors Used" value={vendorsUsed} icon={Truck} accent="cyan" sub="Suppliers in this list" />
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-base font-semibold tracking-wide">PURCHASE HISTORY</h2>
            <div className="max-h-[560px] overflow-auto rounded-2xl border border-violet-500/15 scroll-neon">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 bg-[#0c1122] text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Paid via</th>
                    <th className="px-4 py-3 text-center">Stock Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchases.map((p) => (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]" title={p.note ?? undefined}>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.purchasedAt)}</td>
                      <td className="px-4 py-3 font-medium">{p.vendorName}</td>
                      <td className="px-4 py-3">{p.itemName}</td>
                      <td className="px-4 py-3 text-right tabular">×{p.qty}</td>
                      <td className="px-4 py-3 text-right tabular">{formatINR2(p.unitRate)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular">{formatINR(p.total)}</td>
                      <td className="px-4 py-3">
                        <Badge className={METHOD_BADGE[p.method] ?? "border-white/20 bg-white/5 text-muted-foreground"}>{p.method}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.fnbItemId ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <Check className="h-4 w-4" aria-label="F&B stock updated" />
                            <span className="sr-only">F&amp;B stock updated</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.purchases.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No purchases yet. Record your first vendor stock-in.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <NewPurchaseDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          load();
        }}
      />
    </div>
  );
}

function NewPurchaseDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [vendors, setVendors] = React.useState<VendorOpt[] | null>(null);
  const [items, setItems] = React.useState<ItemOpt[] | null>(null);
  const [vendorId, setVendorId] = React.useState("");
  const [fnbItemId, setFnbItemId] = React.useState("");
  const [itemName, setItemName] = React.useState("");
  const [qty, setQty] = React.useState("1");
  const [unitRate, setUnitRate] = React.useState("");
  const [method, setMethod] = React.useState("CASH");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setVendorId("");
    setFnbItemId("");
    setItemName("");
    setQty("1");
    setUnitRate("");
    setMethod("CASH");
    setNote("");
    setVendors(null);
    setItems(null);

    async function loadOptions() {
      try {
        const res = await fetch("/api/vendors", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Could not load vendors");
        setVendors(json.vendors ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load vendors");
      }
      try {
        const res = await fetch("/api/pos/items", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setItems(json.items ?? []);
      } catch {
        toast.error("Could not load F&B items");
      }
    }
    loadOptions();
  }, [open]);

  const qtyNum = Math.round(Number(qty) || 0);
  const rateNum = Number(unitRate) || 0;
  const canSave = Boolean(vendorId) && Boolean(itemName.trim()) && qtyNum > 0 && rateNum >= 0 && !busy;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          itemName: itemName.trim(),
          qty: qtyNum,
          unitRate: rateNum,
          fnbItemId: fnbItemId || undefined,
          method,
          note: note.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save purchase");
      toast.success(
        fnbItemId
          ? `Purchase saved — ${json.purchase?.itemName} ×${json.purchase?.qty} stock added`
          : `Purchase saved — ${json.purchase?.itemName} ×${json.purchase?.qty}`
      );
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save purchase");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New Purchase</DialogTitle>
          <DialogDescription>Record stock bought from a vendor — linked F&amp;B items gain stock instantly.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="np-vendor">Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId} disabled={busy}>
              <SelectTrigger id="np-vendor" className="h-11 border-violet-500/25 bg-white/5">
                <SelectValue placeholder={vendors === null ? "Loading vendors…" : "Select vendor"} />
              </SelectTrigger>
              <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                {(vendors ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-item">F&amp;B item (optional — raises its stock)</Label>
            <Select
              value={fnbItemId || "none"}
              onValueChange={(v) => {
                const id = v === "none" ? "" : v;
                setFnbItemId(id);
                const it = (items ?? []).find((i) => i.id === id);
                if (it) setItemName(it.name);
              }}
              disabled={busy}
            >
              <SelectTrigger id="np-item" className="h-11 border-violet-500/25 bg-white/5">
                <SelectValue placeholder={items === null ? "Loading items…" : "No F&B link"} />
              </SelectTrigger>
              <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                <SelectItem value="none">No F&amp;B link</SelectItem>
                {(items ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name} · stock {i.stock}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-name">Item name</Label>
            <Input id="np-name" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Energy Drink" className="border-violet-500/25 bg-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="np-qty">Qty</Label>
              <Input id="np-qty" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="2" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-rate">Unit rate (₹)</Label>
              <Input id="np-rate" value={unitRate} onChange={(e) => setUnitRate(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="85" className="border-violet-500/25 bg-white/5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-method">Paid via</Label>
            <Select value={method} onValueChange={setMethod} disabled={busy}>
              <SelectTrigger id="np-method" className="h-11 border-violet-500/25 bg-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                <SelectItem value="CASH">CASH</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">CARD</SelectItem>
                <SelectItem value="CREDIT">CREDIT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-note">Note (optional)</Label>
            <Input id="np-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Invoice #, delivery details…" className="border-violet-500/25 bg-white/5" />
          </div>

          <Button type="submit" disabled={!canSave} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Save Purchase
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
