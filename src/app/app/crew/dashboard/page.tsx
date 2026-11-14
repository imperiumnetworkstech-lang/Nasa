import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Dumbbell, Flame, GlassWater, HeartPulse, MessageSquare, Moon, Stethoscope, Trophy } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { dailySeries, meanOf } from "@/lib/health/series";
import { computeBaseline } from "@/lib/health/baseline";
import { dayKey, fmtDateTime, missionDay, scaleLabel } from "@/lib/utils";
import { Card, CardBody, CardHeader, IconTile, Progress, ViewAll, type TileTone } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { QuickFeeling } from "@/components/crew/quick-feeling";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { AstronautIllustration } from "@/components/illustrations";

export const metadata: Metadata = { title: "Home" };

/**
 * Deliberately simple crew home: answers "How am I doing? What next? Anything needing attention?"
 * Detailed summaries live on the module pages.
 */
export default async function CrewDashboard() {
  const { user, mission, tz } = await crewContext();
  const [checkIns, sleep, vitals, hydration, activity, symptoms] = await Promise.all([
    listPersonal(user.uid, "checkIns", { sinceDays: 30 }),
    listPersonal(user.uid, "sleepLogs", { sinceDays: 30 }),
    listPersonal(user.uid, "vitals", { sinceDays: 8 }),
    listPersonal(user.uid, "hydrationLogs", { sinceDays: 2 }),
    listPersonal(user.uid, "activityLogs", { sinceDays: 7 }),
    listPersonal(user.uid, "symptomReports", { limit: 10 }),
  ]);
  const [plans, messages] = user.missionId
    ? await Promise.all([
        listMissionDocs(user.missionId, "carePlans", { where: [["crewUid", "==", user.uid]] }),
        listMissionDocs(user.missionId, "messages", { where: [["threadId", "==", user.uid]], orderBy: { field: "createdAt", dir: "desc" }, limit: 1 }),
      ])
    : [[], []];

  const now = new Date();
  const todayK = dayKey(now.toISOString(), tz);
  const todayCheckIn = checkIns.find((c) => dayKey(c.at, tz) === todayK);
  const lastSleep = sleep[0];
  const todayMl = hydration.filter((h) => dayKey(h.at, tz) === todayK).reduce((s, h) => s + h.amountMl, 0);
  const target = user.preferences.hydrationTargetMl;
  const weekActivity = activity.reduce((s, a) => s + a.durationMin, 0);
  const first = user.callSign ?? user.displayName.split(" ")[0];
  const sleepBase = computeBaseline(sleep.map((s) => ({ t: s.end, v: s.durationMin / 60 })), { windowDays: 21, minObs: 7, now, excludeLatest: true });

  const ciDays = new Set(checkIns.map((c) => dayKey(c.at, tz)));
  let streak = 0;
  for (let i = todayCheckIn ? 0 : 1; i < 30; i++) {
    if (ciDays.has(dayKey(new Date(now.getTime() - i * 86_400_000).toISOString(), tz))) streak++;
    else break;
  }

  const hrSeries = dailySeries(vitals.filter((v) => v.kind === "heart_rate" && v.quality === "valid"), (v) => v.measuredAt, 7, { hr: meanOf((v) => v.value) }, tz);
  const openTasks = plans.flatMap((p) => p.tasks.filter((t) => !t.doneAt).map((t) => ({ ...t, plan: p.title }))).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const openSymptoms = symptoms.filter((s) => s.status !== "resolved").length;

  const wellbeing: { href: string; icon: typeof Moon; tone: TileTone; title: string; sub: string; pct: number }[] = [
    {
      href: "/app/crew/sleep",
      icon: Moon,
      tone: "blue",
      title: "Sleep",
      sub: lastSleep ? `${(lastSleep.durationMin / 60).toFixed(1)} h last night${sleepBase.sufficient ? ` · usually ${sleepBase.mean.toFixed(1)} h` : ""}` : "Not logged yet",
      pct: lastSleep ? (sleepBase.sufficient ? (lastSleep.durationMin / 60 / sleepBase.mean) * 100 : 100) : 0,
    },
    {
      href: "/app/crew/hydration",
      icon: GlassWater,
      tone: "teal",
      title: "Water",
      sub: target ? `${(todayMl / 1000).toFixed(1)} of ${(target / 1000).toFixed(1)} L today` : `${(todayMl / 1000).toFixed(1)} L today`,
      pct: target ? (todayMl / target) * 100 : 0,
    },
    {
      href: "/app/crew/activity",
      icon: Dumbbell,
      tone: "green",
      title: "Exercise",
      sub: `${weekActivity} min this week`,
      pct: Math.min(100, (weekActivity / 420) * 100),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl min-w-0 space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hello, {first}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted">{mission ? `Mission day ${missionDay(mission.startAt, now)} · ` : ""}How are you feeling today?</p>
        </div>
        <div className="flex items-center gap-2">
          {user.isDemo ? <DemoBadge /> : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-[var(--shadow-card)]" title="Days in a row with a check-in">
            <Flame aria-hidden className="h-4 w-4 text-amber" /> {streak}
            <span className="sr-only">day check-in streak</span>
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="hero-gradient relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-pop)]">
            <div className="relative z-10 max-w-[60%] space-y-3">
              <p className="text-xs font-medium text-white/80">{todayCheckIn ? "Done for today" : "Takes about a minute"}</p>
              <h2 className="text-xl font-bold leading-snug sm:text-2xl">{todayCheckIn ? `You're feeling ${scaleLabel("overall", todayCheckIn.overall).toLowerCase()}` : "Daily check-in"}</h2>
              <ButtonLink href="/app/crew/check-in" variant="light" size="sm">
                {todayCheckIn ? "Update" : "Start check-in"} <ChevronRight aria-hidden className="h-4 w-4" />
              </ButtonLink>
            </div>
            <AstronautIllustration className="absolute -bottom-4 right-0 h-40 w-40 sm:h-48 sm:w-48" />
          </section>

          <Card>
            <CardHeader title="My wellbeing" action={<ViewAll href="/app/crew/history" />} />
            <CardBody className="space-y-2.5">
              {wellbeing.map((w) => (
                <Link key={w.title} href={w.href} className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-primary-soft active:scale-[0.99]">
                  <IconTile tone={w.tone}>
                    <w.icon aria-hidden className="h-5 w-5" />
                  </IconTile>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex min-w-0 items-baseline justify-between gap-2">
                      <p className="shrink-0 text-sm font-semibold">{w.title}</p>
                      <p className="min-w-0 truncate text-xs text-muted">{w.sub}</p>
                    </div>
                    <Progress value={w.pct} label={`${w.title} progress`} />
                  </div>
                  <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted" />
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Heart rate this week" action={<ViewAll href="/app/crew/health">Vitals</ViewAll>} />
            <CardBody>
              <TrendChart title="Resting heart rate" unit="bpm" data={hrSeries} series={[{ key: "hr", label: "Heart rate", color: CHART_COLORS.violet, type: "area", unit: "bpm" }]} demo={user.isDemo} height={180} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Quick mood" description="One tap · private unless you share it" />
            <CardBody>
              <QuickFeeling />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Up next" action={<ViewAll href="/app/crew/my-plan" />} />
            <CardBody className="space-y-2">
              {openTasks.slice(0, 3).map((t) => (
                <div key={t.plan + t.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                  <IconTile tone="violet" size="sm">
                    <Trophy aria-hidden className="h-4 w-4" />
                  </IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.title}</span>
                    {t.due ? <span className="block text-xs text-muted">Due {fmtDateTime(t.due, tz, { dateStyle: "medium", timeStyle: undefined })}</span> : null}
                  </span>
                </div>
              ))}
              {messages[0] ? (
                <Link href="/app/crew/my-plan#messages" className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm hover:bg-primary-soft">
                  <IconTile tone="blue" size="sm">
                    <MessageSquare aria-hidden className="h-4 w-4" />
                  </IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{messages[0].body}</span>
                    <span className="block text-xs text-muted">{messages[0].fromName}</span>
                  </span>
                </Link>
              ) : null}
              {!openTasks.length && !messages[0] ? <p className="text-sm text-muted">You&apos;re all caught up.</p> : null}
            </CardBody>
          </Card>

          <Link href="/app/crew/symptoms" className="lift flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 text-sm shadow-[var(--shadow-card)] hover:bg-primary-soft">
            <IconTile tone="pink">
              <Stethoscope aria-hidden className="h-5 w-5" />
            </IconTile>
            <span className="flex-1">
              <span className="block font-semibold">Need medical support?</span>
              <span className="text-xs text-muted">{openSymptoms ? `${openSymptoms} open report(s) with your care team` : "Report a symptom or request a consultation"}</span>
            </span>
            <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
          </Link>

          <Link href="/app/crew/health" className="lift flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 text-sm shadow-[var(--shadow-card)] hover:bg-primary-soft">
            <IconTile tone="violet">
              <HeartPulse aria-hidden className="h-5 w-5" />
            </IconTile>
            <span className="flex-1">
              <span className="block font-semibold">My body</span>
              <span className="text-xs text-muted">Heart, oxygen, sweat and temperature</span>
            </span>
            <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
          </Link>
        </div>
      </div>
      <p className="text-center text-xs text-muted">A summary of your own records — not a diagnosis. In an emergency, follow your mission&apos;s emergency procedure.</p>
    </div>
  );
}
