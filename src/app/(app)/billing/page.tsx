"use client";

import * as React from "react";
import { Printer, ReceiptText } from "lucide-react";
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
import { TYPE_STYLES } from "@/lib/ui-meta";
import { fmtDateTime, fmtDate } from "@/lib/hours";
import { formatINR, formatINR2 } from "@/lib/money";

interface BillRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  stationName: string;
  stationType: string;
  customerName: string;
  customerPhone: string;
  rateSnapshot: number;
  stationFee: number;
  fnbTotal: number;
  discount: number;
  total: number;
  payments: { amount: number; method: string }[];
}

interface Invoice {
  session: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    rateSnapshot: number;
    stationFee: number;
    fnbTotal: number;
    discount: number;
    total: number;
  };
  station: { name: string; type: string };
  customer: { name: string; phone: string } | null;
  orders: { id: string; items: { name: string; price: number; qty: number }[]; total: number; status: string }[];
  payments: { amount: number; method: string; createdAt: string }[];
}

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "border-emerald-500/40 text-emerald-300",
  ACTIVE: "border-amber-500/40 text-amber-300",
  CANCELLED: "border-white/20 text-muted-foreground",
};

export default function BillingPage() {
  const [from, setFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = React.useState("COMPLETED");
  const [rows, setRows] = React.useState<BillRow[] | null>(null);
  const [invoiceId, setInvoiceId] = React.useState<string | null>(null);
  const [invoice, setInvoice] = React.useState<Invoice | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/billing?from=${from}&to=${to}&status=${status}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRows(json.sessions);
    } catch {
      toast.error("Could not load billing data");
    }
  }, [from, to, status]);

  React.useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  React.useEffect(() => {
    if (!invoiceId) return;
    setInvoice(null);
    fetch(`/api/billing/${invoiceId}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setInvoice)
      .catch(() => toast.error("Could not load invoice"));
  }, [invoiceId]);

  function minutes(r: BillRow): number {
    if (!r.endedAt) return 0;
    const ms = new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime();
    return Math.max(1, Math.ceil(ms / 60000));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="font-display text-xl font-bold sm:text-2xl">Billing & Invoices</h1>
        <p className="text-sm text-muted-foreground">Every session, every rupee — printable invoices.</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bl-from">From</Label>
          <Input id="bl-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40 border-violet-500/25 bg-white/5" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bl-to">To</Label>
          <Input id="bl-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40 border-violet-500/25 bg-white/5" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 border-violet-500/25 bg-white/5"><SelectValue /></SelectTrigger>
            <SelectContent className="border-violet-500/25 bg-[#0f1526]">
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="border-violet-500/40 text-violet-300">{rows?.length ?? 0} sessions</Badge>
      </div>

      {!rows ? (
        <Skeleton className="h-96 rounded-2xl bg-white/5" />
      ) : rows.length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">No sessions in this range.</GlassCard>
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-2xl border border-violet-500/15 scroll-neon">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 bg-[#0c1122] text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Station</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Minutes</th>
                <th className="px-4 py-3 text-right">Station</th>
                <th className="px-4 py-3 text-right">F&B</th>
                <th className="px-4 py-3 text-right">Disc.</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Payments</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]" onClick={() => setInvoiceId(r.id)}>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDateTime(r.startedAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold " + (TYPE_STYLES[r.stationType as keyof typeof TYPE_STYLES]?.badge ?? "")}>
                      {r.stationName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{r.customerName}</td>
                  <td className="px-4 py-2.5 text-right tabular">{r.endedAt ? minutes(r) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular">{formatINR(r.stationFee)}</td>
                  <td className="px-4 py-2.5 text-right tabular">{r.fnbTotal > 0 ? formatINR(r.fnbTotal) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular text-emerald-400">{r.discount > 0 ? "−" + formatINR(r.discount) : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-display font-bold tabular">{formatINR(r.total)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.payments.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-[9px]">{p.method} {formatINR(p.amount)}</Badge>
                      ))}
                      {r.payments.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={"text-[9px] " + (STATUS_BADGE[r.status] ?? "")}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!invoiceId} onOpenChange={(v) => !v && setInvoiceId(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-violet-500/25 bg-[#0f1526] scroll-neon sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Invoice</DialogTitle>
            <DialogDescription>Click a row anytime to re-open. Print for a paper copy.</DialogDescription>
          </DialogHeader>
          {!invoice ? (
            <Skeleton className="h-72 bg-white/5" />
          ) : (
            <>
              <div id="invoice-print" className="rounded-xl bg-white p-5 text-black">
                <div className="flex items-start justify-between border-b border-black/10 pb-3">
                  <div>
                    <p className="font-display text-lg font-extrabold tracking-widest">GAMINOS</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-black/60">by Nexoryos · Gaming Zone OS</p>
                  </div>
                  <div className="text-right text-[11px] leading-relaxed">
                    <p className="font-mono">INV-{invoice.session.id.slice(0, 8).toUpperCase()}</p>
                    <p>{fmtDate(invoice.session.startedAt)}</p>
                  </div>
                </div>

                <div className="mt-3 text-[12px]">
                  <p><span className="text-black/60">Customer:</span> {invoice.customer?.name ?? "Walk-in guest"}{invoice.customer?.phone ? ` · ${invoice.customer.phone}` : ""}</p>
                  <p><span className="text-black/60">Session:</span> {fmtDateTime(invoice.session.startedAt)} → {invoice.session.endedAt ? fmtDateTime(invoice.session.endedAt) : "running"}</p>
                </div>

                <table className="mt-3 w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-[10px] uppercase tracking-wider text-black/60">
                      <th className="py-1.5">Item</th>
                      <th className="py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const mins = invoice.session.endedAt
                        ? Math.max(1, Math.ceil((new Date(invoice.session.endedAt).getTime() - new Date(invoice.session.startedAt).getTime()) / 60000))
                        : null;
                      return (
                        <tr className="border-b border-black/5">
                          <td className="py-1.5">
                            {invoice.station.name} ({invoice.station.type}){mins ? ` · ${mins} min × ${formatINR(invoice.session.rateSnapshot)}/hr` : ""}
                          </td>
                          <td className="py-1.5 text-right tabular">{formatINR2(invoice.session.stationFee)}</td>
                        </tr>
                      );
                    })()}
                    {invoice.orders.flatMap((o) =>
                      o.items.map((it, i) => (
                        <tr key={o.id + i} className="border-b border-black/5">
                          <td className="py-1.5">{it.name} × {it.qty} @ {formatINR(it.price)}</td>
                          <td className="py-1.5 text-right tabular">{formatINR2(it.price * it.qty)}</td>
                        </tr>
                      ))
                    )}
                    {invoice.session.discount > 0 ? (
                      <tr className="border-b border-black/5">
                        <td className="py-1.5 text-green-700">Discount</td>
                        <td className="py-1.5 text-right tabular text-green-700">−{formatINR2(invoice.session.discount)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>

                <div className="mt-2 flex items-baseline justify-between border-t-2 border-black pt-2">
                  <span className="font-display text-sm font-bold">TOTAL</span>
                  <span className="font-display text-xl font-extrabold tabular">{formatINR2(invoice.session.total)}</span>
                </div>

                {invoice.payments.length > 0 ? (
                  <p className="mt-2 text-[11px] text-black/70">
                    Paid via {invoice.payments.map((p) => `${p.method} ${formatINR(p.amount)}`).join(" · ")}
                  </p>
                ) : null}

                <p className="mt-3 border-t border-black/10 pt-2 text-center text-[10px] text-black/60">
                  Thank you for playing! · A Nexoryos Product
                </p>
              </div>
              <Button onClick={() => window.print()} className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white hover:opacity-90">
                <Printer className="mr-2 h-4 w-4" /> Print Invoice
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      ` }} />
    </div>
  );
}
