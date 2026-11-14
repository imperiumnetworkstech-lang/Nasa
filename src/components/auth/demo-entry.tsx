"use client";

import { FlaskConical, HeartPulse, ShieldCheck, SlidersHorizontal, Stethoscope } from "lucide-react";
import { useState } from "react";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; title: string; who: string; icon: typeof HeartPulse }[] = [
  { role: "astronaut", title: "Crew member", who: "Anaya Rao “Vega”", icon: HeartPulse },
  { role: "medical", title: "Base-station doctor", who: "Dr. Priya Natarajan", icon: Stethoscope },
  { role: "commander", title: "Mission commander", who: "Elena Kovac “Polaris”", icon: ShieldCheck },
];

/** Demo-mode role selector. Signs in as seeded synthetic accounts; disabled when demo mode is off. */
export function DemoEntry({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(role: Role) {
    setBusy(role);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start demo");
      window.location.assign(json.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start demo");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-warn">
        <FlaskConical aria-hidden className="h-4 w-4" /> Demo mode — fictional people, synthetic data
      </div>
      <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-3"}>
        {ROLES.map(({ role, title, who, icon: Icon }) => (
          <button
            key={role}
            onClick={() => enter(role)}
            disabled={busy !== null}
            className="group flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-60"
          >
            <span className="rounded-xl bg-primary-soft p-2 text-primary group-hover:bg-surface">
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-fg">{busy === role ? "Entering…" : title}</span>
              <span className="block text-xs text-muted">{who}</span>
            </span>
          </button>
        ))}
      </div>
      <a href="/console" className="lift flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft p-3 text-left">
        <span className="rounded-xl bg-surface p-2 text-primary">
          <SlidersHorizontal aria-hidden className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-fg">Scenario console</span>
          <span className="block text-xs text-muted">Send suit scenarios for any astronaut — no sign-in</span>
        </span>
      </a>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
