import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, ChevronRight, ClipboardCheck, MessageCircleQuestion } from "lucide-react";
import { medicalContext } from "@/lib/medical/context";
import { crewSnapshots } from "@/lib/medical/summary";
import { listMissionDocs } from "@/lib/data/repo";
import { alertAction } from "@/lib/actions/medical";
import { questionStage } from "@/lib/questions/eta";
import { missionDay, relativeTime, requestTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, IconTile, ViewAll, type TileTone } from "@/components/ui/card";
import { Badge, DemoBadge, SeverityBadge } from "@/components/ui/badge";
import { ActionButton } from "@/components/action-ui";

export const metadata: Metadata = { title: "Home" };

/** Doctor home: three numbers, one "needs you now" list, and the crew. Nothing else. */
export default async function MedicalHome() {
  const { user, mission, crew } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" body="An administrator must assign you to a mission before crew records are visible." />;
  const now = requestTime();
  const [alerts, questions] = await Promise.all([
    listMissionDocs(mission.id, "alerts", { orderBy: { field: "createdAt", dir: "desc" } }),
    listMissionDocs(mission.id, "questions", { orderBy: { field: "createdAt", dir: "desc" } }),
  ]);
  const snaps = await crewSnapshots(crew, alerts);
  const openAlerts = alerts.filter((a) => a.status === "open");
  const waitingQs = questions.filter((q) => !q.answer && questionStage(q, now) === "with-doctor");
  const checkedIn = snaps.filter((s) => s.checkedInToday).length;
  const rank = { urgent: 0, attention: 1, info: 2 };

  const tiles: { href: string; label: string; value: string | number; icon: typeof BellRing; tone: TileTone }[] = [
    { href: "/app/medical/alerts", label: "Alerts to review", value: openAlerts.length, icon: BellRing, tone: openAlerts.some((a) => a.severity === "urgent") ? "pink" : "amber" },
    { href: "/app/medical/questions", label: "Questions waiting", value: waitingQs.length, icon: MessageCircleQuestion, tone: "blue" },
    { href: "/app/medical/crew", label: "Checked in today", value: `${checkedIn}/${crew.length}`, icon: ClipboardCheck, tone: "teal" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hello, {user.displayName.split(" ").slice(-1)[0]}! 👋</h1>
          <p className="mt-1 text-sm text-muted">
            {mission.missionCode} · Day {missionDay(mission.startAt)} · {crew.length} crew
          </p>
        </div>
        {mission.isDemo ? <DemoBadge /> : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="lift flex flex-col items-start gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
            <IconTile tone={t.tone} size="sm">
              <t.icon aria-hidden className="h-4 w-4" />
            </IconTile>
            <span className="text-2xl font-bold tabular-nums">{t.value}</span>
            <span className="text-xs text-muted">{t.label}</span>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title="Needs you now" action={<ViewAll href="/app/medical/alerts" />} />
        <CardBody className="space-y-2">
          {openAlerts.length === 0 && waitingQs.length === 0 ? <p className="text-sm text-muted">Nothing waiting. 🎉</p> : null}
          {[...openAlerts]
            .sort((a, b) => rank[a.severity] - rank[b.severity])
            .slice(0, 4)
            .map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                <Link href={`/app/medical/alerts#${a.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-semibold">
                    {a.crewLabel}: {a.title}
                  </span>
                  <span className="block truncate text-xs text-muted">{a.observed}</span>
                </Link>
                <SeverityBadge severity={a.severity} />
                <ActionButton action={alertAction.bind(null, { alertId: a.id, action: "acknowledge" })} variant="primary" successTitle="Acknowledged">
                  OK
                </ActionButton>
              </div>
            ))}
          {waitingQs.slice(0, 3).map((q) => (
            <Link key={q.id} href="/app/medical/questions" className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm hover:bg-primary-soft">
              <IconTile tone="blue" size="sm">
                <MessageCircleQuestion aria-hidden className="h-4 w-4" />
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {q.crewLabel} asked: {q.text}
                </span>
                <span className="block text-xs text-muted">{relativeTime(q.arriveAt, now)}</span>
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your crew" />
        <CardBody className="grid gap-2 sm:grid-cols-2">
          {snaps.map((s) => {
            const urgent = s.openAlerts.some((a) => a.severity === "urgent");
            const review = s.openAlerts.length > 0 || s.openSymptoms > 0;
            return (
              <Link key={s.member.uid} href={`/app/medical/crew/${s.member.uid}`} className="lift flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="hero-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" aria-hidden>
                  {s.member.callSign.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.member.callSign}</span>
                  <span className="block truncate text-xs text-muted">{s.checkedInToday ? "Checked in today" : `Last check-in ${relativeTime(s.lastCheckIn, now)}`}</span>
                </span>
                {urgent ? <Badge tone="danger">Urgent</Badge> : review ? <Badge tone="warn">Review</Badge> : <Badge tone="ok">OK</Badge>}
              </Link>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
