"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Send, User, Store } from "lucide-react";

/** Landing demo-request form — client-side only (no backend promise in v1). */
export function DemoForm() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [zone, setZone] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Please enter your name and a valid 10-digit phone number.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setName("");
      setPhone("");
      setZone("");
      toast.success("Demo booked! Our team will call you within 24 hours.", {
        description: `${name} · ${zone || "Gaming zone"} · ${phone}`,
      });
    }, 600);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3" aria-label="Book a free demo">
      <div className="space-y-1.5">
        <Label htmlFor="demo-name" className="text-xs text-muted-foreground">Your name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Patel"
            className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400" autoComplete="name" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="demo-phone" className="text-xs text-muted-foreground">Phone (WhatsApp)</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="demo-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel"
            className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400" autoComplete="tel" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="demo-zone" className="text-xs text-muted-foreground">Zone name</Label>
        <div className="relative">
          <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="demo-zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Rajkot Gaming Arena"
            className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400" />
        </div>
      </div>
      <Button
        type="submit"
        disabled={busy}
        className="sm:col-span-3 h-11 bg-gradient-to-r from-violet-600 to-cyan-500 font-display font-semibold tracking-wide text-white shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:opacity-90"
      >
        <Send className="mr-2 h-4 w-4" /> {busy ? "Booking…" : "Book a free demo"}
      </Button>
    </form>
  );
}
