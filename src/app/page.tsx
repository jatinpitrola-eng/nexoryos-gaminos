import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Check,
  Clock,
  IndianRupee,
  LayoutDashboard,
  Minus,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Brand, NexoryosBadge } from "@/components/brand";
import { GlassCard } from "@/components/glass-card";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { DemoForm } from "@/components/landing-demo-form";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Live Floor Dashboard",
    desc: "Every PC, console & VR station on one screen — live status, running timers and open bills at a glance.",
    accent: "text-violet-300",
  },
  {
    icon: IndianRupee,
    title: "Smart Pricing Engine",
    desc: "Student, Happy Hour, Off-Peak & Peak rates per station type — applied automatically, with a live rate calculator.",
    accent: "text-cyan-300",
  },
  {
    icon: Wallet,
    title: "Members, Wallet & Loyalty",
    desc: "Recharge wallets with bonus minutes, memberships and loyalty points. Lock in repeat visits.",
    accent: "text-emerald-300",
  },
  {
    icon: ShoppingCart,
    title: "F&B POS + Shifts",
    desc: "Touch-friendly snack counter that merges with the session bill. Shifts keep every rupee of cash accountable.",
    accent: "text-amber-300",
  },
  {
    icon: Trophy,
    title: "Tournaments & Reports",
    desc: "Leaderboards, P&L, utilization heatmap and one-tap CSV export — know exactly which hour earns.",
    accent: "text-cyan-300",
  },
  {
    icon: LayoutDashboard,
    title: "Advance Booking Link",
    desc: "A public QR booking page your customers open on their phone — slots fill themselves while you sleep.",
    accent: "text-violet-300",
  },
];

type Badge = { label: string; cls: string } | null;

const PLANS: {
  name: string;
  tagline: string;
  price: string;
  period: string;
  sub: string;
  badge: Badge;
  glow: "none" | "violet" | "amber";
  plus: string | null;
  features: string[];
}[] = [
  {
    name: "Starter",
    tagline: "For small & growing zones",
    price: "₹500",
    period: "/month",
    sub: "or ₹5,000/year — save ₹1,000",
    badge: null,
    glow: "none",
    plus: null,
    features: [
      "PC/station management & live status",
      "Sessions + auto billing",
      "Walk-in & booking management",
      "Customers + wallet",
      "F&B POS",
      "Shifts & daily summary",
      "Booking link + PWA app",
      "Owner dashboard",
    ],
  },
  {
    name: "Pro",
    tagline: "For professional esports & multi-PC centers",
    price: "₹900",
    period: "/month",
    sub: "or ₹9,000/year",
    badge: { label: "MOST POPULAR", cls: "border-violet-400/60 bg-[#0a0e1a] text-violet-300" },
    glow: "violet",
    plus: "Everything in Starter, plus:",
    features: [
      "Tournaments & leaderboards",
      "Pause/resume sessions",
      "Advanced pricing rules",
      "Silver/Gold/Platinum memberships + loyalty",
      "Expenses & profit/loss",
      "Utilization heatmap + peak-hour analytics",
      "CSV export",
      "Staff roles & permissions",
      "Online bookings with WhatsApp notify",
    ],
  },
  {
    name: "Lifetime",
    tagline: "One-time purchase, zero renewals",
    price: "₹40,000",
    period: " one-time",
    sub: "Pay once. Own it forever.",
    badge: { label: "BEST VALUE", cls: "border-amber-400/60 bg-[#0a0e1a] text-amber-300" },
    glow: "amber",
    plus: "Everything in Pro, forever:",
    features: ["Lifetime updates included", "Priority support", "No monthly bills — ever"],
  },
];

type Cell = "yes" | "no" | string;

const COMPARE: { label: string; starter: Cell; pro: Cell; lifetime: Cell }[] = [
  { label: "PC Management", starter: "Basic", pro: "yes", lifetime: "yes" },
  { label: "Tournaments", starter: "no", pro: "yes", lifetime: "yes" },
  { label: "Pause/Resume", starter: "no", pro: "yes", lifetime: "yes" },
  { label: "Memberships", starter: "no", pro: "yes", lifetime: "yes" },
  { label: "Expenses & P&L", starter: "no", pro: "yes", lifetime: "yes" },
  { label: "Heatmap Analytics", starter: "no", pro: "yes", lifetime: "yes" },
  { label: "Multi-Branch (Future)", starter: "no", pro: "no", lifetime: "no" },
  { label: "Updates", starter: "While active", pro: "While active", lifetime: "Forever" },
];

const ROADMAP = [
  "Windows PC Agent (remote lock/shutdown/monitoring)",
  "Customer Mobile App",
  "AI Business Assistant",
  "Multi-Branch Cloud",
];

function CompareCell({ value }: { value: Cell }) {
  if (value === "yes") return <Check className="mx-auto h-4 w-4 text-emerald-400" aria-label="Included" />;
  if (value === "no") return <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-violet-500/15 bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav aria-label="Landing" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="#roadmap" className="transition-colors hover:text-foreground">Roadmap</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Log in</Button>
            </Link>
            <Link href="/book">
              <Button className="bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.35)] hover:opacity-90">
                Book a PC Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" aria-hidden />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium tracking-wide text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 dot-glow" aria-hidden />
                NexoryOS presents
              </span>
              <h1 className="font-display text-5xl font-extrabold leading-tight sm:text-6xl lg:text-7xl">
                <span className="neon-text">GameZone OS</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Complete Gaming Zone Management &amp; PC Control Platform — one OS for gaming cafes,
                esports lounges &amp; VR arenas. Every session billed. Every hour filled.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/book">
                  <Button size="lg" className="h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 font-display font-semibold text-white shadow-[0_0_28px_rgba(16,185,129,0.45)] hover:opacity-90">
                    Book a PC Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="h-12 border-violet-500/40 px-6 font-display hover:bg-violet-500/10">
                    Try Free Demo
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> No hardware needed</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Owner & staff roles</span>
                <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-emerald-400" /> Setup in 10 minutes</span>
              </div>
            </div>

            {/* Hero mock: live floor */}
            <GlassCard className="relative p-5 sm:p-6" aria-hidden>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-display text-sm font-semibold tracking-widest text-cyan-300">LIVE FLOOR VIEW</p>
                <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 dot-glow dot-pulse" /> 9 of 15 stations busy
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { name: "PC-01", type: "PC", state: "BUSY", time: "1:24:10", cost: "₹248" },
                  { name: "PC-03", type: "PC", state: "BUSY", time: "0:47:33", cost: "₹63" },
                  { name: "VR-01", type: "VR", state: "FREE", time: null, cost: null },
                  { name: "PS5-01", type: "PS5", state: "BUSY", time: "2:02:51", cost: "₹305" },
                  { name: "PC-06", type: "PC", state: "MAINT", time: null, cost: null },
                  { name: "Racing-01", type: "RACING", state: "FREE", time: null, cost: null },
                ].map((s) => (
                  <div key={s.name} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-xs font-semibold">{s.name}</p>
                      <StatusDot
                        state={s.state === "BUSY" ? "BUSY" : s.state === "MAINT" ? "MAINTENANCE" : "FREE"}
                        className={s.state === "MAINT" ? "!text-red-500" : undefined}
                      />
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{s.type}</p>
                    <p className="mt-2 h-4 text-xs tabular text-cyan-300">{s.time ?? ""}</p>
                    <p className="h-4 text-xs tabular text-emerald-300">{s.cost ?? ""}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-200">
                <Clock className="mr-1.5 inline h-3.5 w-3.5" />
                Empty hours today: <strong>10 AM – 12 PM</strong> — push a student combo to fill them.
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Pain points */}
        <section className="border-y border-white/5 bg-white/[0.02] px-4 py-12 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-6 text-center sm:grid-cols-3">
            {[
              { stat: "₹40k+/mo", label: "lost to unbilled minutes & paper errors in a typical 15-station zone" },
              { stat: "30–40%", label: "of phone bookings never show up without deposits & reminders" },
              { stat: "0", label: "insights today — which station, game or hour actually earns" },
            ].map((p) => (
              <div key={p.stat}>
                <p className="font-display text-3xl font-extrabold text-amber-300">{p.stat}</p>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{p.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <p className="font-display text-sm font-semibold tracking-[0.3em] text-violet-300">FEATURES</p>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Everything your zone needs. Nothing it doesn&apos;t.</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <GlassCard key={f.title} className="group p-6 transition-transform hover:-translate-y-1">
                  <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-3">
                    <f.icon className={`h-6 w-6 ${f.accent}`} aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-white/5 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <p className="font-display text-sm font-semibold tracking-[0.3em] text-cyan-300">PRICING</p>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Simple plans. Pay from your first filled hour.</h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PLANS.map((p) => (
                <GlassCard
                  key={p.name}
                  variant="purple"
                  className={`relative p-6 ${
                    p.glow === "violet" ? "neon-border-glow lg:-translate-y-2" : ""
                  }`}
                  style={
                    p.glow === "amber"
                      ? {
                          borderColor: "rgba(251, 191, 36, 0.45)",
                          boxShadow: "0 0 24px rgba(245, 158, 11, 0.28), inset 0 0 22px rgba(245, 158, 11, 0.04)",
                        }
                      : undefined
                  }
                >
                  {p.badge ? (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-0.5 text-xs font-semibold ${p.badge.cls}`}>
                      {p.badge.label}
                    </span>
                  ) : null}
                  <h3 className="font-display text-lg font-bold">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                  <p className="mt-4">
                    <span className="font-display text-4xl font-extrabold neon-text tabular">{p.price}</span>
                    <span className="text-sm text-muted-foreground">{p.period}</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-cyan-300">{p.sub}</p>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {p.plus ? (
                      <li className="flex items-start gap-2 font-medium text-violet-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden /> {p.plus}
                      </li>
                    ) : null}
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="#demo" className="mt-6 block">
                    <Button
                      className={`w-full h-11 font-display font-semibold ${
                        p.glow !== "none"
                          ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90"
                          : "border border-violet-500/40 bg-transparent text-foreground hover:bg-violet-500/10"
                      }`}
                      variant={p.glow !== "none" ? "default" : "outline"}
                    >
                      {p.name === "Lifetime" ? "Talk to us" : "Start free demo"}
                    </Button>
                  </Link>
                </GlassCard>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Yearly plans = 2 months free. Prices exclude GST.
            </p>
          </div>
        </section>

        {/* Plan comparison */}
        <section aria-label="Plan comparison" className="border-t border-white/5 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-xl font-bold sm:text-2xl">Plan comparison</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl glass scroll-neon">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th scope="col" className="p-4 text-left font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Feature</th>
                    <th scope="col" className="p-4 text-center font-display text-xs font-semibold uppercase tracking-widest text-foreground">Starter</th>
                    <th scope="col" className="p-4 text-center font-display text-xs font-semibold uppercase tracking-widest text-violet-300">Pro</th>
                    <th scope="col" className="p-4 text-center font-display text-xs font-semibold uppercase tracking-widest text-amber-300">Lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.label} className="border-b border-white/5 last:border-b-0">
                      <th scope="row" className="p-4 text-left font-medium text-foreground">{row.label}</th>
                      <td className="p-4 text-center"><CompareCell value={row.starter} /></td>
                      <td className="p-4 text-center"><CompareCell value={row.pro} /></td>
                      <td className="p-4 text-center"><CompareCell value={row.lifetime} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Multi-Branch is on the roadmap for every plan.</p>
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <p className="font-display text-sm font-semibold tracking-[0.3em] text-violet-300">ROADMAP</p>
            <h2 className="mt-2 font-display text-2xl font-bold">What&apos;s next for GameZone OS</h2>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {ROADMAP.map((r) => (
                <span key={r} className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/5 px-4 py-1.5 text-sm text-muted-foreground">
                  <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
                    Coming soon
                  </span>
                  {r}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Roadmap features release separately after testing.</p>
          </div>
        </section>

        {/* Demo form */}
        <section id="demo" className="scroll-mt-20 border-t border-white/5 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">See GameZone OS on <span className="neon-text">your</span> floor</h2>
            <p className="mt-3 text-muted-foreground">
              20-minute walkthrough on WhatsApp video. We&apos;ll set up your stations live on the call.
            </p>
            <GlassCard className="mt-8 p-6 text-left sm:p-8">
              <DemoForm />
            </GlassCard>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-violet-500/15 bg-[#0c1122]/70 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div>
            <Brand />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Complete Gaming Zone Management &amp; PC Control Platform. Built in India, for Indian gaming entrepreneurs.
            </p>
          </div>
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a className="text-muted-foreground transition-colors hover:text-foreground" href="#features">Features</a></li>
              <li><a className="text-muted-foreground transition-colors hover:text-foreground" href="#pricing">Pricing</a></li>
              <li><a className="text-muted-foreground transition-colors hover:text-foreground" href="#roadmap">Roadmap</a></li>
            </ul>
          </div>
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="text-muted-foreground transition-colors hover:text-foreground" href="/book">Book a PC</Link></li>
              <li><Link className="text-muted-foreground transition-colors hover:text-foreground" href="/login">Log in</Link></li>
              <li><Link className="text-muted-foreground transition-colors hover:text-foreground" href="/signup">Create owner account</Link></li>
              <li><Link className="text-muted-foreground transition-colors hover:text-foreground" href="/dashboard">Open dashboard</Link></li>
            </ul>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <NexoryosBadge />
            <Image src="/nexoryos.png" alt="Nexoryos — next generation, limitless possibilities" width={120} height={120}
              className="rounded-xl bg-white p-1.5" />
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/5 pt-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} NexoryOS GameZone OS · Developed &amp; Powered by <span className="font-semibold text-violet-300">NEXORYOS</span> · Rajkot → Ahmedabad → Surat → India
        </div>
      </footer>
    </div>
  );
}
