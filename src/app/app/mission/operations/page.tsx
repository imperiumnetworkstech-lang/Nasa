import type { Metadata } from "next";
import Link from "next/link";
import { commanderContext } from "@/lib/mission/context";
import { getSettings, listMissionDocs } from "@/lib/data/repo";
import { detectConflicts } from "@/lib/mission/planner";
import { dayKey, fmtDate, fmtTime, requestTime } from "@/lib/utils";
import { Callout, EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Workload & recovery planner" };

const WL_STYLE = { high: "bg-tile-pink text-coral", moderate: "bg-tile-amber text-warn", low: "bg-tile-green text-ok" } as const;

export default async function OperationsPage() {
  const { mission, crew, tz } = await commanderContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const [events, settings] = await Promise.all([listMissionDocs(mission.id, "missionEvents"), getSettings()]);
  const minRest = settings.thresholds.minRestHoursBetweenHighWorkload;
  const conflicts = detectConflicts(events, crew.map((c) => c.uid), { minRestHours: minRest, sleepWindow: { startHour: 22, endHour: 6 } }).filter((c) => Date.parse(c.at) > requestTime() - 86_400_000);
  const days = Array.from({ length: 5 }, (_, i) => new Date(requestTime() + (i - 1) * 86_400_000).toISOString());
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workload & recovery planner"
        description={`Planned work, rest and exercise per crew member. Rules: ≥ ${minRest} h between high-workload blocks; protect the 22:00–06:00 UTC sleep window.`}
        crumbs={[{ label: "Mission", href: "/app/mission/dashboard" }, { label: "Planner" }]}
        actions={<Link href="/app/mission/timeline" className={buttonClass("primary", "md")}>Add a block</Link>}
      />
      <Callout tone="info">A planning aid only. It highlights schedule conflicts; it does not decide who is fit for duty.</Callout>
      <Card>
        <CardHeader title={`Conflicts (${conflicts.length})`} />
        <CardBody className="space-y-2">
          {conflicts.length === 0 ? <p className="text-sm text-muted">No conflicts in the current plan.</p> : null}
          {conflicts.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-warn-soft px-4 py-2.5 text-sm">
              <span>
                <strong>{crew.find((x) => x.uid === c.crewUid)?.callSign}</strong>: {c.message}
              </span>
              <Badge tone="warn">{c.kind === "insufficient-rest" ? "Recovery gap" : "Sleep window"}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Schedule" description="Yesterday to +3 days" />
        <CardBody className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="w-28 py-2">Crew</th>
                {days.map((d) => (
                  <th key={d} className="px-1">
                    {fmtDate(d, tz)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crew.map((c) => (
                <tr key={c.uid} className="border-t border-line align-top">
                  <td className="py-2 font-semibold">{c.callSign}</td>
                  {days.map((d) => {
                    const k = dayKey(d, tz);
                    const evs = events.filter((e) => (e.crewUids.length === 0 || e.crewUids.includes(c.uid)) && dayKey(e.start, tz) === k);
                    return (
                      <td key={d} className="space-y-1 px-1 py-2">
                        {evs.map((e) => (
                          <div key={e.id} className={`rounded-xl px-2 py-1 text-[11px] ${e.type === "rest" ? "bg-tile-blue text-[#3b6fd8]" : WL_STYLE[e.workload ?? "low"]}`}>
                            <span className="block font-semibold">{e.title}</span>
                            {fmtTime(e.start, tz)}
                            {e.end ? `–${fmtTime(e.end, tz)}` : ""}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
            <Badge tone="danger">High workload</Badge>
            <Badge tone="warn">Moderate</Badge>
            <Badge tone="ok">Low</Badge>
            <Badge tone="info">Rest window</Badge>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
