"use client";

import * as React from "react";
import { Loader2, Minus, Plus, ShoppingCart, Trash2, TriangleAlert, Zap } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtTime } from "@/lib/hours";
import { formatINR } from "@/lib/money";
import { FN_B_CATEGORIES } from "@/lib/types";
import type { FnBCategory } from "@/lib/types";

interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
}

interface CartLine {
  item: Item;
  qty: number;
}

interface ActiveSession {
  id: string;
  stationName: string;
  customerName: string | null;
  startedAt: string;
}

export default function PosPage() {
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [category, setCategory] = React.useState<string>("ALL");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [sessions, setSessions] = React.useState<ActiveSession[]>([]);
  const [attachId, setAttachId] = React.useState<string>("standalone");
  const [busy, setBusy] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [itemsRes, sessionsRes] = await Promise.all([
        fetch("/api/pos/items", { cache: "no-store" }),
        fetch("/api/sessions?status=ACTIVE", { cache: "no-store" }),
      ]);
      if (itemsRes.ok) setItems((await itemsRes.json()).items);
      if (sessionsRes.ok) setSessions((await sessionsRes.json()).sessions);
    } catch {
      toast.error("Could not load POS data");
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  function addToCart(item: Item) {
    if (item.stock <= 0) return;
    setCart((c) => {
      const found = c.find((l) => l.item.id === item.id);
      if (found) {
        if (found.qty >= item.stock) return c;
        return c.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...c, { item, qty: 1 }];
    });
  }

  function changeQty(itemId: string, delta: number) {
    setCart((c) =>
      c
        .map((l) => {
          if (l.item.id !== itemId) return l;
          const q = l.qty + delta;
          if (q > l.item.stock) return l;
          return { ...l, qty: q };
        })
        .filter((l) => l.qty > 0)
    );
  }

  async function adjustStock(item: Item, delta: number) {
    const next = item.stock + delta;
    if (next < 0) return;
    try {
      const res = await fetch(`/api/pos/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: next }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, stock: next } : i)) ?? prev);
      setCart((c) => c.map((l) => (l.item.id === item.id ? { ...l, item: { ...l.item, stock: next } } : l)));
    } catch {
      toast.error("Stock update failed");
    }
  }

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const lowStock = (items ?? []).filter((i) => i.isActive && i.stock <= i.lowStockAlert);

  async function checkout() {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: attachId !== "standalone" ? attachId : undefined,
          items: cart.map((l) => ({ itemId: l.item.id, qty: l.qty })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      toast.success(
        `Order ${formatINR(json.order?.total ?? subtotal)} recorded`,
        { description: attachId !== "standalone" ? "Added to the session bill" : "Standalone cash sale" }
      );
      setCart([]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  const filtered = (items ?? []).filter((i) => i.isActive && (category === "ALL" || i.category === category));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">F&B Counter POS</h1>
          <p className="text-sm text-muted-foreground">Tap to build the sale — attach to a session or sell standalone.</p>
        </div>
        <Button variant="outline" className="border-violet-500/40" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Item
        </Button>
      </header>

      {lowStock.length > 0 ? (
        <GlassCard variant="cyan" className="flex items-start gap-3 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <p className="text-sm text-amber-200">
            <span className="font-semibold">Reorder soon:</span>{" "}
            {lowStock.map((i) => `${i.name} (${i.stock} left)`).join(" · ")}
          </p>
        </GlassCard>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <section className="space-y-4">
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="flex h-auto flex-wrap gap-1 bg-white/5 p-1">
              <TabsTrigger value="ALL" className="data-[state=active]:bg-violet-500/30">All</TabsTrigger>
              {FN_B_CATEGORIES.map((c: FnBCategory) => (
                <TabsTrigger key={c} value={c} className="data-[state=active]:bg-violet-500/30">
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {!items ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => {
                const out = item.stock <= 0;
                const low = !out && item.stock <= item.lowStockAlert;
                const inCart = cart.find((l) => l.item.id === item.id)?.qty ?? 0;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={out ? -1 : 0}
                    onClick={() => addToCart(item)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && addToCart(item)}
                    className={
                      "group relative min-h-[124px] cursor-pointer rounded-xl border p-3 text-left transition-all active:scale-[0.98] " +
                      (out
                        ? "border-red-500/20 bg-red-500/5 opacity-50"
                        : low
                          ? "border-amber-500/35 bg-amber-500/5 hover:border-amber-500/60"
                          : "border-white/10 bg-white/[0.04] hover:border-violet-500/40")
                    }
                    aria-label={`Add ${item.name}, ${formatINR(item.price)}, ${item.stock} in stock`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{item.name}</p>
                      {inCart > 0 ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">{inCart}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-display text-base font-bold text-cyan-300">{formatINR(item.price)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      {out ? (
                        <Badge variant="outline" className="border-red-500/50 text-[10px] text-red-300">Out of stock</Badge>
                      ) : low ? (
                        <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-300 dot-pulse">Low: {item.stock}</Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{item.stock} in stock</span>
                      )}
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => adjustStock(item, -1)} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-300" aria-label={`Reduce stock of ${item.name}`}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => adjustStock(item, +1)} className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-xs text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-300" aria-label={`Add stock of ${item.name}`}>
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Cart */}
        <section aria-label="Current sale">
          <GlassCard className="sticky top-20 p-5">
            <h2 className="font-display text-base font-semibold tracking-wide">CURRENT SALE</h2>
            <div className="mt-3 space-y-1.5">
              <Label>Attach to</Label>
              <Select value={attachId} onValueChange={setAttachId}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                  <SelectItem value="standalone">🧾 Standalone sale (counter)</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-400" /> {s.stationName} — {s.customerName ?? "guest"} ({fmtTime(s.startedAt)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {attachId === "standalone"
                  ? "Standalone orders are recorded as paid cash sales at the counter."
                  : "Attached orders ride on the session bill at checkout."}
              </p>
            </div>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto scroll-neon pr-1">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Cart is empty — tap items to add.</p>
              ) : (
                cart.map((l) => (
                  <div key={l.item.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatINR(l.item.price)} × {l.qty}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-7 w-7 border-white/15" onClick={() => changeQty(l.item.id, -1)} aria-label={`Reduce ${l.item.name}`}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold tabular">{l.qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 border-white/15" onClick={() => changeQty(l.item.id, +1)} aria-label={`Add ${l.item.name}`}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-300" onClick={() => changeQty(l.item.id, -l.qty)} aria-label={`Remove ${l.item.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-3">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-display text-2xl font-extrabold neon-text">{formatINR(subtotal)}</span>
            </div>
            <Button
              onClick={checkout}
              disabled={busy || cart.length === 0}
              className="mt-3 h-12 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-display text-sm font-bold tracking-wide text-white hover:opacity-90"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {busy ? "Recording…" : `Record Sale ${formatINR(subtotal)}`}
            </Button>
          </GlassCard>
        </section>
      </div>

      <NewItemDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={load} />
    </div>
  );
}

function NewItemDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>("SNACKS");
  const [price, setPrice] = React.useState("");
  const [stock, setStock] = React.useState("");
  const [lowAlert, setLowAlert] = React.useState("5");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setCategory("SNACKS");
      setPrice("");
      setStock("");
      setLowAlert("5");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/pos/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, price: Number(price), stock: Number(stock) || 0, lowStockAlert: Number(lowAlert) || 0 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add item");
      toast.success(`${name} added to menu`);
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-violet-500/25 bg-[#0f1526] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">New F&B Item</DialogTitle>
          <DialogDescription>Add something new to the counter menu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ni-name">Name</Label>
            <Input id="ni-name" value={name} onChange={(e) => setName(e.target.value)} className="border-violet-500/25 bg-white/5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent className="border-violet-500/25 bg-[#0f1526]">
                  {FN_B_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ni-price">Price (₹)</Label>
              <Input id="ni-price" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="border-violet-500/25 bg-white/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ni-stock">Opening stock</Label>
              <Input id="ni-stock" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="border-violet-500/25 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ni-low">Low stock alert at</Label>
              <Input id="ni-low" value={lowAlert} onChange={(e) => setLowAlert(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="border-violet-500/25 bg-white/5" />
            </div>
          </div>
          <Button type="submit" disabled={busy || !name.trim() || !(Number(price) > 0)} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add Item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
