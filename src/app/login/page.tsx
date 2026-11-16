"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail, ShieldAlert } from "lucide-react";
import { Brand, NexoryosBadge } from "@/components/brand";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }
    toast.success("Welcome back to NEXORYOS GameZone OS!");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <GlassCard className="w-full max-w-md p-7 sm:p-9">
      <div className="mb-7 text-center">
        <Link href="/" className="inline-block" aria-label="Back to home">
          <Brand size="md" />
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">Sign in to run your zone</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="owner@gaminos.test"
              className="border-violet-500/25 bg-white/5 pl-9 focus-visible:ring-violet-400"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="password" type={showPw ? "text" : "password"} required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="border-violet-500/25 bg-white/5 pl-9 pr-10 focus-visible:ring-violet-400"
            />
            <button
              type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
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
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Demo logins</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button" variant="outline" size="sm"
            className="border-violet-500/30 text-xs"
            onClick={() => { setEmail("owner@gaminos.test"); setPassword("gaminos123"); }}
          >
            Fill Owner
          </Button>
          <Button
            type="button" variant="outline" size="sm"
            className="border-cyan-500/30 text-xs"
            onClick={() => { setEmail("staff@gaminos.test"); setPassword("staff123"); }}
          >
            Fill Staff
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          owner@gaminos.test / gaminos123 · staff@gaminos.test / staff123
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New zone?{" "}
        <Link href="/signup" className="font-semibold text-violet-300 hover:text-violet-200">
          Create an owner account
        </Link>
      </p>
      <div className="mt-5 flex justify-center">
        <NexoryosBadge />
      </div>
    </GlassCard>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <React.Suspense fallback={null}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
