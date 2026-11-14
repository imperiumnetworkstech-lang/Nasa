import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, ShieldAlert } from "lucide-react";
import { commanderContext, commanderSummary } from "@/lib/mission/context";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { detectConflicts } from "@/lib/mission/planner";
import { skillState } from "@/lib/skills/schedule";
import { fmtDateTime, missionDay, requestTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, IconTile, Progress, ViewAll, type TileTone } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Home" };

/** Commander home: three numbers, what's coming up, and (folded) skill readiness. Operational only. */
export default async function MissionHome() {
  const { user, mission, crew, tz } = await commanderContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const now = requestTime();
  const s = await commanderSummary(mission.id, crew.map((c) => c.uid));
  const events = await listMissionDocs(mission.id, "missionEvents");
  const conflicts = detectConflicts(events.filter((e) => Date.parse(e.end ?? e.start) > now), crew.map((c) => c.uid), { minRestHours: s.settings.thresholds.minRestHoursBetweenHighWorkload, sleepWindow: { startHour: 22, endHour: 6 } });
  const upcoming = events.filter((e) => Date.parse(e.start) > now).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
  const cards = await listMissionDocs(mission.id, "skillCards");
  const reviews = Object.fromEntries(await Promise.all(crew.map(async (c) => [c.uid, await listPersonal(c.uid, "skillReviews", { limit: 500 })] as const)));
  const skills = cards.map((card) => ({ title: card.title, fresh: crew.filter((c) => skillState(card, reviews[c.uid], new Date(now)).freshness >= 70).length }));

  const tiles: { href: string; label: string; value: string | number; icon: typeof ClipboardCheck; tone: TileTone }[] = [
    { href: "/app/mission/crew-readiness", label: "Checked in today", value: `${s.completion}/${crew.length}`, icon: ClipboardCheck, tone: "teal" },
    { href: "/app/mission/crew-readiness", label: "With the doctor", value: s.operationalOpen, icon: ShieldAlert, tone: s.operationalOpen ? "pink" : "green" },
    { href: "/app/mission/operations", label: "Schedule clashes", value: conflicts.length, icon: CalendarClock, tone: conflicts.length ? "amber" : "green" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hello, {user.callSign ?? user.displayName}! 👋</h1>
          <p className="mt-1 text-sm text-muted">
            {mission.missionCode} · Day {missionDay(mission.startAt)} · {crew.length} crew
          </p>
        </div>
        {mission.isDemo ? <DemoBadge /> : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="lift flex flex-col items-start gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
            <IconTile tone={t.tone} size="sm">
              <t.icon aria-hidden className="h-4 w-4" />
            </IconTile>
            <span className="text-2xl font-bold tabular-nums">{t.value}</span>
            <span className="text-xs text-muted">{t.label}</span>
          </Link>
        ))}
      </div>

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
          {conflicts.length ? (
            <Link href="/app/mission/operations" className="block rounded-2xl bg-warn-soft px-3 py-2.5 text-sm text-warn">
              ⚠️ {conflicts[0].message} <span className="font-semibold">Open schedule →</span>
            </Link>
          ) : null}
        </CardBody>
      </Card>

      {skills.length ? (
        <details className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
            Emergency skill readiness
            <span className="text-xs font-normal text-muted">
              {skills.filter((x) => x.fresh >= 2).length} of {skills.length} skills well covered
            </span>
          </summary>
          <div className="grid gap-3 p-5 pt-0 sm:grid-cols-2">
            {skills.map((x) => (
              <div key={x.title} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{x.title}</span>
                  <span className={x.fresh >= 2 ? "font-semibold text-ok" : "font-semibold text-warn"}>
                    {x.fresh}/{crew.length}
                  </span>
                </div>
                <Progress value={(x.fresh / Math.max(1, crew.length)) * 100} tone={x.fresh >= 2 ? "teal" : "amber"} label={x.title} />
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <p className="text-center text-xs text-muted">You see operational status only — health details stay with the medical team.</p>
    </div>
  );
}
