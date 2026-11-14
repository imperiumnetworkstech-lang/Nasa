import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CrewSnapshot } from "@/lib/medical/summary";
import { relativeTime } from "@/lib/utils";

export function CrewCard({ s }: { s: CrewSnapshot }) {
  const urgent = s.openAlerts.filter((a) => a.severity === "urgent").length;
  const attention = s.openAlerts.filter((a) => a.severity === "attention").length;
  return (
    <Link href={`/app/medical/crew/${s.member.uid}`} className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-primary-soft">
      <span className="hero-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white" aria-hidden>
        {s.member.callSign.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">
          {s.member.callSign} <span className="font-normal text-muted">· {s.member.displayName}</span>
        </span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          {urgent ? <Badge tone="danger">{urgent} urgent</Badge> : null}
          {attention ? <Badge tone="warn">{attention} to review</Badge> : null}
          {!urgent && !attention ? <Badge tone="ok">No open alerts</Badge> : null}
          {s.openSymptoms ? <Badge tone="info">{s.openSymptoms} symptom report</Badge> : null}
          <Badge>{s.checkedInToday ? "Checked in today" : `Check-in ${relativeTime(s.lastCheckIn)}`}</Badge>
        </span>
        <span className="mt-1 block text-xs text-muted">
          HR {s.lastHr ?? "—"} bpm · Sleep {s.lastSleepH?.toFixed(1) ?? "—"} h
        </span>
      </span>
      <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}
