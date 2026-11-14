import {
  Activity,
  BellRing,
  Brain,
  CalendarRange,
  CloudOff,
  HeartPulse,
  LineChart,
  Lock,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { PublicPage } from "@/components/public-chrome";
import { ButtonLink } from "@/components/ui/button";
import { DemoEntry } from "@/components/auth/demo-entry";
import { isDemoEnabled } from "@/lib/config";

// Reads runtime configuration (demo mode, Firebase) on each request.
export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: HeartPulse, title: "Your body at a glance", body: "Heart rate, oxygen, sweat, temperature, breathing and blood pressure — plus sleep, water, exercise and mood." },
  { icon: LineChart, title: "Personal baseline drift", body: "Compares each person with their own recent pattern, shows the window and sample size, and stays quiet when data is sparse." },
  { icon: BellRing, title: "Explainable alert centre", body: "Versioned, rules-based alerts that say what was observed, where it came from, why it was flagged and what workflow comes next." },
  { icon: CalendarRange, title: "Mission context timeline", body: "See observations alongside EVAs, shift changes, habitat events and environment readings — to explore correlation, never to claim causation." },
  { icon: CloudOff, title: "Communication-delay mode", body: "Queued, sent, received and acknowledged states; offline check-ins that are clearly marked as not yet sent." },
  { icon: Users, title: "Privacy-preserving readiness", body: "Commanders see operational summaries with small-group suppression — never mood, journals, or detailed records." },
  { icon: Brain, title: "Simple for crew", body: "A one-minute check-in, plain-language results and one tap to ask the doctor for help." },
];

export default function Landing() {
  const demo = isDemoEnabled();
  return (
    <PublicPage>
      <section className="relative overflow-hidden bg-navy text-white">
        <svg aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[42rem] w-[42rem] opacity-25" viewBox="0 0 400 400">
          <ellipse cx="200" cy="200" rx="190" ry="90" transform="rotate(-28 200 200)" fill="none" stroke="#20A7A0" strokeWidth="1.2" />
          <ellipse cx="200" cy="200" rx="150" ry="65" transform="rotate(-28 200 200)" fill="none" stroke="#5B95E6" strokeWidth="0.8" />
          <circle cx="352" cy="96" r="5" fill="#E9A23B" />
        </svg>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-28">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
              <Activity aria-hidden className="h-3.5 w-3.5 text-teal" /> Crew health & wellbeing intelligence for simulated missions
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Calm, explainable health insight for crews far from home.</h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Antariksha helps crew members understand their own wellbeing and helps authorised medical officers spot trends, coordinate care and make informed decisions — with privacy, provenance and human judgement at the centre.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/login" size="lg">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10">
                Create an account
              </ButtonLink>
            </div>
          </div>
          <div className="self-center rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm font-medium text-white/90">Today · Mission day 39</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Sleep", "7.3 h", "within your usual range"],
                ["Resting HR", "59 bpm", "baseline 58 ± 2"],
                ["Hydration", "1.6 / 2.5 L", "target set by you"],
                ["Check-in", "Done", "08:14 UTC"],
              ].map(([k, v, h]) => (
                <div key={k} className="rounded-2xl bg-white/6 p-3">
                  <p className="text-xs text-white/60">{k}</p>
                  <p className="mt-1 text-lg font-semibold">{v}</p>
                  <p className="text-xs text-white/55">{h}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/50">Illustration with synthetic values.</p>
          </div>
        </div>
      </section>

      {demo ? (
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <h2 className="mb-1 text-xl font-semibold">Explore the demo</h2>
            <p className="mb-5 text-sm text-muted">Enter as any role. Every person and record in the demo is fictional and labelled as synthetic.</p>
            <DemoEntry />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Built for real decisions — and honest about its limits</h2>
        <p className="mt-2 max-w-2xl text-muted">Every number shows its source, freshness and the data behind it. Nothing pretends to be a diagnosis.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-line bg-surface p-5">
              <Icon aria-hidden className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ice dark:bg-surface-2">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div className="rounded-2xl bg-surface p-5">
            <Lock aria-hidden className="h-6 w-6 text-teal" />
            <h3 className="mt-3 font-semibold">Privacy by role</h3>
            <p className="mt-1 text-sm text-muted">Server-enforced permissions. Private journals are author-only. Medical officers see only their assigned mission.</p>
          </div>
          <div className="rounded-2xl bg-surface p-5">
            <Stethoscope aria-hidden className="h-6 w-6 text-teal" />
            <h3 className="mt-3 font-semibold">Not an emergency service</h3>
            <p className="mt-1 text-sm text-muted">In a real mission, follow approved emergency procedures. Never delay emergency contact to complete a form.</p>
          </div>
          <div className="rounded-2xl bg-surface p-5">
            <ShieldCheck aria-hidden className="h-6 w-6 text-teal" />
            <h3 className="mt-3 font-semibold">Honest by design</h3>
            <p className="mt-1 text-sm text-muted">Practice and demo data is always labelled. Antariksha supports your doctor — it never replaces them. Not affiliated with NASA.</p>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
