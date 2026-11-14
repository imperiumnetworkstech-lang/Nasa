import type { Metadata } from "next";
import Link from "next/link";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { VITAL_META } from "@/lib/health/vitals";
import { fmtDateTime, scaleLabel } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { OriginBadge } from "@/components/ui/badge";
import { QueuedList } from "@/components/crew/queued-list";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "History" };

const FILTERS = [
  ["all", "All"],
  ["checkIns", "Check-ins"],
  ["vitals", "Vitals"],
  ["sleepLogs", "Sleep"],
  ["activityLogs", "Exercise"],
  ["moodLogs", "Mood"],
  ["symptomReports", "Symptoms"],
] as const;

export default async function HistoryPage({ searchParams }: PageProps<"/app/crew/history">) {
  const { user, tz } = await crewContext();
  const sp = await searchParams;
  const kind = typeof sp.kind === "string" ? sp.kind : "all";
  const [checkIns, vitals, sleep, acts, moods, symptoms] = await Promise.all([
    listPersonal(user.uid, "checkIns", { sinceDays: 30 }),
    listPersonal(user.uid, "vitals", { sinceDays: 30 }),
    listPersonal(user.uid, "sleepLogs", { sinceDays: 30 }),
    listPersonal(user.uid, "activityLogs", { sinceDays: 30 }),
    listPersonal(user.uid, "moodLogs", { sinceDays: 30 }),
    listPersonal(user.uid, "symptomReports", { sinceDays: 30 }),
  ]);
  type Row = { id: string; kind: string; at: string; text: string; origin: string };
  const rows: Row[] = [
    ...checkIns.map((c) => ({ id: c.id, kind: "checkIns", at: c.at, text: `Check-in · feeling ${scaleLabel("overall", c.overall).toLowerCase()}`, origin: c.origin })),
    ...vitals.filter((v) => v.kind === "heart_rate" || v.kind === "spo2" || v.kind === "eda").map((v) => ({ id: v.id, kind: "vitals", at: v.measuredAt, text: `${VITAL_META[v.kind].label}: ${v.value} ${v.unit}`, origin: v.origin })),
    ...sleep.map((s) => ({ id: s.id, kind: "sleepLogs", at: s.end, text: `Sleep · ${(s.durationMin / 60).toFixed(1)} h`, origin: s.origin })),
    ...acts.map((a) => ({ id: a.id, kind: "activityLogs", at: a.at, text: `${a.name} · ${a.durationMin} min`, origin: a.origin })),
    ...moods.map((m) => ({ id: m.id, kind: "moodLogs", at: m.at, text: `Mood · ${scaleLabel("mood", m.mood).toLowerCase()}`, origin: m.origin })),
    ...symptoms.map((s) => ({ id: s.id, kind: "symptomReports", at: s.createdAt, text: `Symptom · ${s.symptomType} (${s.status.replace(/_/g, " ")})`, origin: s.origin })),
  ]
    .filter((r) => kind === "all" || r.kind === kind)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 150);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="History"
        description="Everything you've recorded in the last 30 days."
        crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "History" }]}
        actions={
          <a href="/api/export/me" className={buttonClass("secondary", "sm")}>
            Download my data
          </a>
        }
      />
      <Card id="queued">
        <CardHeader title="Waiting to send" description="Entries saved on this device while offline" />
        <CardBody>
          <QueuedList />
        </CardBody>
      </Card>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k === "all" ? "/app/crew/history" : `/app/crew/history?kind=${k}`} className={`rounded-full px-4 py-1.5 text-sm ${kind === k ? "hero-gradient text-white" : "bg-surface text-muted shadow-[var(--shadow-card)] hover:text-primary"}`} aria-current={kind === k ? "true" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <Card>
        <CardBody>
          <ul className="divide-y divide-line">
            {rows.length === 0 ? <li className="py-6 text-center text-sm text-muted">No records for this filter.</li> : null}
            {rows.map((r) => (
              <li key={r.kind + r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span>{r.text}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {fmtDateTime(r.at, tz)} <OriginBadge origin={r.origin} />
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
