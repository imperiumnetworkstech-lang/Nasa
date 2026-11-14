import type { Metadata } from "next";
import { CalendarClock, ClipboardCheck, Moon, ShieldAlert } from "lucide-react";
import { commanderContext, commanderSummary } from "@/lib/mission/context";
import { listMissionDocs } from "@/lib/data/repo";
import { detectConflicts } from "@/lib/mission/planner";
import { fmtDateTime, missionDay, requestTime } from "@/lib/utils";
import { Callout, EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, Progress, ViewAll } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata: Metadata = { title: "Mission dashboard" };

export default async function MissionDashboard() {
  const { user, mission, crew, tz } = await commanderContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const s = await commanderSummary(mission.id, crew.map((c) => c.uid));
  const events = await listMissionDocs(mission.id, "missionEvents");
  const conflicts = detectConflicts(events.filter((e) => Date.parse(e.end ?? e.start) > requestTime()), crew.map((c) => c.uid), { minRestHours: s.settings.thresholds.minRestHoursBetweenHighWorkload, sleepWindow: { startHour: 22, endHour: 6 } });
  const upcoming = events.filter((e) => Date.parse(e.start) > requestTime()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${user.callSign ?? user.displayName}! 👋`} description={`${mission.missionCode} · Mission day ${missionDay(mission.startAt)} · ${crew.length} crew`} badges={mission.isDemo ? <DemoBadge /> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="teal" icon={<ClipboardCheck aria-hidden className="h-5 w-5" />} label="Checked in today" value={`${s.completion}/${crew.length}`} />
        <Stat tone="pink" icon={<ShieldAlert aria-hidden className="h-5 w-5" />} label="Operational items" value={s.operationalOpen} hint="Under medical review" />
        <Stat tone="amber" icon={<CalendarClock aria-hidden className="h-5 w-5" />} label="Planner conflicts" value={conflicts.length} />
        <Stat tone="blue" icon={<Moon aria-hidden className="h-5 w-5" />} label="Crew avg sleep (3 nights)" value={s.aggSleep.suppressed ? "Hidden" : s.aggSleep.value!.toFixed(1)} unit={s.aggSleep.suppressed ? "" : "h"} hint={s.aggSleep.suppressed ? `Needs ≥ ${s.minGroup} people` : `n=${s.aggSleep.n}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Check-in completion" action={<ViewAll href="/app/mission/crew-readiness" />} />
          <CardBody className="space-y-3">
            <Progress value={(s.completion / Math.max(1, crew.length)) * 100} tone="teal" label="Check-in completion" />
            <p className="text-sm text-muted">
              {s.completion} of {crew.length} crew have checked in today.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming" action={<ViewAll href="/app/mission/timeline" />} />
          <CardBody className="space-y-2">
            {upcoming.map((e) => (
              <div key={e.id} className="flex justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                <span>{e.title}</span>
                <span className="text-xs text-muted">{fmtDateTime(e.start, tz)}</span>
              </div>
            ))}
            {upcoming.length === 0 ? <p className="text-sm text-muted">Nothing planned.</p> : null}
          </CardBody>
        </Card>
      </div>
      {conflicts.length ? (
        <Callout tone="warn" title={`${conflicts.length} schedule conflict(s) to review`}>
          {conflicts[0].message}{" "}
          <Link href="/app/mission/operations" className="font-semibold text-primary">
            Open planner
          </Link>
        </Callout>
      ) : null}
      <Callout tone="info" title="What you can see">
        Operational, privacy-preserving summaries only. Mood, journals, symptoms and detailed medical records are never shown here. Aggregates covering fewer than {s.minGroup} people are hidden.
      </Callout>
    </div>
  );
}
