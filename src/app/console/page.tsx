import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { isDemoEnabled, DEMO_MISSION_ID } from "@/lib/config";
import { listCrew } from "@/lib/data/repo";
import { getStore } from "@/lib/data";
import { latestCaseByCrew } from "@/lib/cases";
import { SCENARIOS } from "@/lib/scenarios";
import { requestTime } from "@/lib/utils";
import { Wordmark } from "@/components/brand";
import { DemoBadge } from "@/components/ui/badge";
import { ConsoleClient } from "@/components/cases/console-client";
import { ConsolePulse } from "@/components/cases/live";
import { CaseCard, CrewStatusBoard } from "@/components/cases/staff";
import { profilesFor } from "@/lib/health/personal-server";

export const metadata: Metadata = { title: "Scenario console" };
export const dynamic = "force-dynamic";

/**
 * Demo-only scenario console. Stands in for the suit sensor feed: pick an astronaut and a
 * scenario; the model analyses it and the crew member, base-station doctor and commander all
 * get it live. Returns 404 when demo mode is off.
 */
export default async function ConsolePage() {
  if (!isDemoEnabled()) notFound();
  await getStore(); // seeds demo data on first run
  const crew = await listCrew(DEMO_MISSION_ID);
  const { cases, latest } = await latestCaseByCrew(DEMO_MISSION_ID);
  const now = requestTime();
  const active = cases.filter((c) => c.status === "active");
  const drift = await profilesFor(crew.map((c) => c.uid));
  const tabs = [
    { who: "Crew (astronaut)", url: "http://localhost:3000/login", hint: "Sign in as Crew member" },
    { who: "Base-station doctor", url: "http://127.0.0.1:3000/login", hint: "Sign in as Base-station doctor" },
    { who: "Mission commander", url: "http://[::1]:3000/login", hint: "Sign in as Mission commander" },
  ];
  return (
    <div className="min-h-screen">
      <ConsolePulse />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark tagline={false} />
          <span className="flex items-center gap-2 text-sm font-semibold">
            Scenario console <DemoBadge />
          </span>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <section className="hero-gradient rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-pop)]">
          <h1 className="text-2xl font-bold">Suit sensor simulator</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/85">
            Real readings will stream from each astronaut&apos;s suit. Until then, send a scenario here: the health model checks every reading against its normal range, works out the condition, and sends the alert, remedy and suggested medicine to the astronaut, the base-station doctor and the mission commander.
          </p>
        </section>

        <ConsoleClient crew={crew.map((c) => ({ uid: c.uid, name: c.displayName, callSign: c.callSign }))} scenarios={SCENARIOS.map((s) => ({ id: s.id, title: s.title, emoji: s.emoji, blurb: s.blurb }))} />

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Live crew status</h2>
          <CrewStatusBoard crew={crew} latest={latest} now={now} drift={drift} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Active cases ({active.length})</h2>
          {active.length === 0 ? <p className="rounded-[var(--radius-card)] bg-ok-soft p-5 text-sm font-semibold text-ok">✅ All crew normal.</p> : null}
          {active.map((c) => (
            <CaseCard key={c.id} c={c} now={now} editable={false} />
          ))}
        </section>

        <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-bold">Watch all three views at once</h2>
          <p className="text-sm text-muted">A browser keeps one sign-in per address, so open each view on a different address (or use a private window):</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {tabs.map((t) => (
              <li key={t.who}>
                <a href={t.url} target="_blank" rel="noopener noreferrer" className="lift flex h-full flex-col gap-1 rounded-2xl bg-surface-2 p-4 text-sm">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {t.who} <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  </span>
                  <code className="text-xs text-primary">{t.url.replace("/login", "")}</code>
                  <span className="text-xs text-muted">{t.hint}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
