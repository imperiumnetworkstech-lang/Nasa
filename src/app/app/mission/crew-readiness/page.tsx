import type { Metadata } from "next";
import { requestTime } from "@/lib/utils";
import { CheckCircle2, CircleDashed, ShieldAlert } from "lucide-react";
import { commanderContext, commanderSummary } from "@/lib/mission/context";
import { listMissionDocs } from "@/lib/data/repo";
import { detectConflicts } from "@/lib/mission/planner";
import { Callout, EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Crew readiness" };

export default async function CrewReadiness() {
  const { mission, crew } = await commanderContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const s = await commanderSummary(mission.id, crew.map((c) => c.uid));
  const events = await listMissionDocs(mission.id, "missionEvents");
  const conflicts = detectConflicts(events.filter((e) => Date.parse(e.end ?? e.start) > requestTime()), crew.map((c) => c.uid), { minRestHours: s.settings.thresholds.minRestHoursBetweenHighWorkload, sleepWindow: { startHour: 22, endHour: 6 } });
  return (
    <div className="space-y-6">
      <PageHeader title="Crew readiness" description="Operational status per crew member — planning information, not a fitness-for-duty decision." crumbs={[{ label: "Mission", href: "/app/mission/dashboard" }, { label: "Crew readiness" }]} />
      <div className="grid gap-3 md:grid-cols-2">
        {crew.map((c) => {
          const p = s.perCrew.find((x) => x.uid === c.uid)!;
          const cf = conflicts.filter((x) => x.crewUid === c.uid);
          return (
            <Card key={c.uid}>
              <CardBody className="flex items-start gap-3">
                <span className="hero-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-white" aria-hidden>
                  {c.callSign.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold">
                    {c.callSign} <span className="font-normal text-muted">· {c.displayName}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.checkedInToday ? <Badge tone="ok" icon={<CheckCircle2 className="h-3 w-3" />}>Checked in today</Badge> : <Badge icon={<CircleDashed className="h-3 w-3" />}>No check-in yet</Badge>}
                    {p.operationalReview ? <Badge tone="warn" icon={<ShieldAlert className="h-3 w-3" />}>Medical review in progress</Badge> : <Badge tone="ok">No operational items</Badge>}
                    {cf.length ? <Badge tone="warn">{cf.length} schedule conflict(s)</Badge> : <Badge>Schedule OK</Badge>}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      <Callout tone="info">“Medical review in progress” means the flight surgeon is reviewing an operationally relevant item. Details stay with the medical team; ask them if you need to know more for planning.</Callout>
    </div>
  );
}
