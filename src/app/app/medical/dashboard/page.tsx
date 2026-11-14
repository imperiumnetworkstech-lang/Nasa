import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, MessageCircleQuestion } from "lucide-react";
import { medicalContext } from "@/lib/medical/context";
import { listMissionDocs } from "@/lib/data/repo";
import { latestCaseByCrew } from "@/lib/cases";
import { questionStage } from "@/lib/questions/eta";
import { missionDay, requestTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import { DemoBadge } from "@/components/ui/badge";
import { CaseCard, CrewStatusBoard } from "@/components/cases/staff";

export const metadata: Metadata = { title: "Home" };

/** Base-station doctor: active cases first (editable), then crew status. Live-refreshing. */
export default async function MedicalHome() {
  const { user, mission, crew } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" body="An administrator must assign you to a mission before crew records are visible." />;
  const now = requestTime();
  const [{ cases, latest }, alerts, questions] = await Promise.all([
    latestCaseByCrew(mission.id),
    listMissionDocs(mission.id, "alerts"),
    listMissionDocs(mission.id, "questions"),
  ]);
  const active = cases.filter((c) => c.status === "active").sort((a, b) => (a.analysis.severity === b.analysis.severity ? b.createdAt.localeCompare(a.createdAt) : a.analysis.severity === "urgent" ? -1 : 1));
  const openAlerts = alerts.filter((a) => a.status === "open").length;
  const waitingQs = questions.filter((q) => !q.answer && questionStage(q, now) === "with-doctor").length;
  const name = user.displayName.startsWith("Dr.") ? `Dr. ${user.displayName.split(" ").slice(-1)[0]}` : user.displayName.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hello, {name}! 👋</h1>
          <p className="mt-1 text-sm text-muted">
            Base station · {mission.missionCode} · Day {missionDay(mission.startAt)} · {crew.length} crew
          </p>
        </div>
        {mission.isDemo ? <DemoBadge /> : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          Active cases <span className="ml-1 rounded-full bg-[#e5484d] px-2 py-0.5 text-sm text-white">{active.length}</span>
        </h2>
        {active.length === 0 ? <p className="rounded-[var(--radius-card)] bg-ok-soft p-5 text-sm font-semibold text-ok">✅ No active cases — everyone is normal.</p> : null}
        {active.map((c) => (
          <CaseCard key={c.id} c={c} now={now} editable />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Crew status</h2>
        <CrewStatusBoard crew={crew} latest={latest} now={now} />
      </section>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/app/medical/alerts" className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 shadow-[var(--shadow-card)] hover:text-primary">
          <BellRing aria-hidden className="h-4 w-4" /> Other alerts ({openAlerts})
        </Link>
        <Link href="/app/medical/questions" className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 shadow-[var(--shadow-card)] hover:text-primary">
          <MessageCircleQuestion aria-hidden className="h-4 w-4" /> Questions ({waitingQs})
        </Link>
      </div>
    </div>
  );
}
