"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Rocket, ShieldAlert, User, UserPlus } from "lucide-react";
import { Brand, NexoryosBadge } from "@/components/brand";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        setBusy(false);
        return;
      }
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        toast.success("Account created! Please log in.");
        router.push("/login");
        return;
      }
      toast.success("Welcome to NEXORYOS GameZone OS, owner!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-md p-7 sm:p-9">
        <div className="mb-7 text-center">
          <Link href="/" className="inline-block" aria-label="Back to home">
            <Brand size="md" />
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">Create your zone owner account</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh Patel" className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400" autoComplete="name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourzone.in" className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400" autoComplete="email" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters" className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400" autoComplete="new-password" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password" className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400" autoComplete="new-password" />
              </div>
            </div>
          </div>

          {error ? (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <ShieldAlert className="h-4 w-4 shrink-0" /> {error}
            </p>
          ) : null}

          <Button
            type="submit" disabled={busy}
            className="h-11 w-full bg-gradient-to-r from-violet-600 to-cyan-500 font-display font-semibold tracking-wide text-white shadow-[0_0_22px_rgba(139,92,246,0.4)] hover:opacity-90"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {busy ? "Creating…" : "Create owner account"}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <Rocket className="mr-1.5 inline h-3.5 w-3.5 text-violet-300" />
          Your account starts with demo data — 15 stations, pricing rules, members and F&B items pre-loaded so you can explore instantly.
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-violet-300 hover:text-violet-200">
            Log in
          </Link>
        </p>
        <div className="mt-5 flex justify-center">
          <NexoryosBadge />
        </div>
      </GlassCard>
    </div>
  );
}
