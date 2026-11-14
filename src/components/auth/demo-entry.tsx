"use client";

import { FlaskConical, HeartPulse, ShieldCheck, Stethoscope, Telescope, UserCog } from "lucide-react";
import { useState } from "react";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; title: string; who: string; icon: typeof HeartPulse }[] = [
  { role: "astronaut", title: "Crew member", who: "Anaya Rao “Vega”", icon: HeartPulse },
  { role: "medical", title: "Flight surgeon", who: "Dr. Priya Natarajan", icon: Stethoscope },
  { role: "commander", title: "Mission commander", who: "Elena Kovac “Polaris”", icon: ShieldCheck },
  { role: "researcher", title: "Researcher", who: "Dr. Samuel Achebe", icon: Telescope },
  { role: "admin", title: "Administrator", who: "Platform Admin", icon: UserCog },
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
      <div className={compact ? "grid gap-2 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-5"}>
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
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
