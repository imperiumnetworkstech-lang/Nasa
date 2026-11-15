import type { Metadata } from "next";
import { commanderContext } from "@/lib/mission/context";
import { listMissionDocs } from "@/lib/data/repo";
import { latestCaseByCrew } from "@/lib/cases";
import { fmtDateTime, missionDay, requestTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, ViewAll } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { CaseCard, CrewStatusBoard } from "@/components/cases/staff";
import { profilesFor } from "@/lib/health/personal-server";

export const metadata: Metadata = { title: "Home" };

/** Mission commander: who is normal, who has an active case (with remedy & medicine), what's next. */
export default async function MissionHome() {
  const { user, mission, crew, tz } = await commanderContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const now = requestTime();
  const [{ cases, latest }, events] = await Promise.all([latestCaseByCrew(mission.id), listMissionDocs(mission.id, "missionEvents")]);
  const active = cases.filter((c) => c.status === "active");
  const drift = await profilesFor(crew.map((c) => c.uid));
  const normalCount = crew.filter((m) => latest.get(m.uid) && latest.get(m.uid)!.status !== "active").length;
  const upcoming = events.filter((e) => Date.parse(e.start) > now).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hello, {user.callSign ?? user.displayName}! 👋</h1>
          <p className="mt-1 text-sm text-muted">
            {mission.missionCode} · Day {missionDay(mission.startAt)} · {normalCount} of {crew.length} crew normal
          </p>
        </div>
        {mission.isDemo ? <DemoBadge /> : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Crew status</h2>
        <CrewStatusBoard crew={crew} latest={latest} now={now} drift={drift} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          Active cases <span className="ml-1 rounded-full bg-[#e5484d] px-2 py-0.5 text-sm text-white">{active.length}</span>
        </h2>
        {active.length === 0 ? <p className="rounded-[var(--radius-card)] bg-ok-soft p-5 text-sm font-semibold text-ok">✅ All crew normal.</p> : null}
        {active.map((c) => (
          <CaseCard key={c.id} c={c} now={now} editable={false} />
        ))}
      </section>

      <Card>
        <CardHeader title="Coming up" action={<ViewAll href="/app/mission/timeline" />} />
        <CardBody className="space-y-2">
          {upcoming.map((e) => (
            <div key={e.id} className="flex justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
              <span className="truncate">{e.title}</span>
              <span className="shrink-0 text-xs text-muted">{fmtDateTime(e.start, tz)}</span>
            </div>
          ))}
          {upcoming.length === 0 ? <p className="text-sm text-muted">Nothing planned.</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
