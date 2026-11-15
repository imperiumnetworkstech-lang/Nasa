import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Dumbbell, GlassWater, MessageSquare, Moon, Stethoscope, Trophy } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { computeBaseline } from "@/lib/health/baseline";
import { dayKey, fmtDateTime, missionDay, relativeTime } from "@/lib/utils";
import { Card, CardBody, CardHeader, IconTile, Progress, ViewAll, type TileTone } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { QuickFeeling } from "@/components/crew/quick-feeling";
import { AstronautIllustration } from "@/components/illustrations";
import { ScenarioGrid } from "@/components/cases/scenario-grid";
import { CaseView } from "@/components/cases/case-view";
import { SCENARIOS } from "@/lib/scenarios";
import { getMissionDoc } from "@/lib/data/repo";
import { deckState } from "@/lib/skills/schedule";
import { weeklyBalance } from "@/lib/exercise/balance";
import { questionStage } from "@/lib/questions/eta";
import { GraduationCap, MessageCircleQuestion, UtensilsCrossed } from "lucide-react";

export const metadata: Metadata = { title: "Home" };

/**
 * Deliberately simple crew home: answers "How am I doing? What next? Anything needing attention?"
 * Detailed summaries live on the module pages.
 */
export default async function CrewDashboard() {
  const { user, mission, tz } = await crewContext();
  const [sleep, hydration, activity, symptoms] = await Promise.all([
    listPersonal(user.uid, "sleepLogs", { sinceDays: 30 }),
    listPersonal(user.uid, "hydrationLogs", { sinceDays: 2 }),
    listPersonal(user.uid, "activityLogs", { sinceDays: 7 }),
    listPersonal(user.uid, "symptomReports", { limit: 10 }),
  ]);
  const myCases = user.missionId ? await listMissionDocs(user.missionId, "cases", { where: [["crewUid", "==", user.uid]], orderBy: { field: "createdAt", dir: "desc" }, limit: 1 }) : [];
  const lastCase = myCases[0] ?? null;
  const activeCase = lastCase?.status === "active" ? lastCase : null;
  const [cards, reviews, exPlan, questions, foodToday] = await Promise.all([
    user.missionId ? listMissionDocs(user.missionId, "skillCards") : Promise.resolve([]),
    listPersonal(user.uid, "skillReviews", { limit: 500 }),
    user.missionId ? getMissionDoc(user.missionId, "exercisePlans", user.uid) : Promise.resolve(null),
    user.missionId ? listMissionDocs(user.missionId, "questions", { where: [["crewUid", "==", user.uid]] }) : Promise.resolve([]),
    listPersonal(user.uid, "foodRatings", { sinceDays: 1 }),
  ]);
  const [plans, messages] = user.missionId
    ? await Promise.all([
        listMissionDocs(user.missionId, "carePlans", { where: [["crewUid", "==", user.uid]] }),
        listMissionDocs(user.missionId, "messages", { where: [["threadId", "==", user.uid]], orderBy: { field: "createdAt", dir: "desc" }, limit: 1 }),
      ])
    : [[], []];

  const now = new Date();
  const todayK = dayKey(now.toISOString(), tz);
  const lastSleep = sleep[0];
  const todayMl = hydration.filter((h) => dayKey(h.at, tz) === todayK).reduce((s, h) => s + h.amountMl, 0);
  const target = user.preferences.hydrationTargetMl;
  const weekActivity = activity.reduce((s, a) => s + a.durationMin, 0);
  const first = user.callSign ?? user.displayName.split(" ")[0];
  const sleepBase = computeBaseline(sleep.map((s) => ({ t: s.end, v: s.durationMin / 60 })), { windowDays: 21, minObs: 7, now, excludeLatest: true });


  const openTasks = plans.flatMap((p) => p.tasks.filter((t) => !t.doneAt).map((t) => ({ ...t, plan: p.title }))).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const openSymptoms = symptoms.filter((s) => s.status !== "resolved").length;
  // "Today for you": the few things worth doing now, from the new features.
  const dueSkills = deckState(cards, reviews, now).due.length;
  const exDebt = exPlan ? weeklyBalance(activity, exPlan, now).reduce((s, b) => s + b.debtMin, 0) : 0;
  const newAnswers = questions.filter((q) => q.answer && !q.readAt && questionStage(q, now.getTime()) === "answered").length;
  const todo: { href: string; icon: typeof Moon; tone: TileTone; title: string; sub: string }[] = [];
  if (newAnswers) todo.push({ href: "/app/crew/ask", icon: MessageCircleQuestion, tone: "blue", title: `${newAnswers} new answer${newAnswers > 1 ? "s" : ""} from your doctor`, sub: "Tap to read" });
  if (dueSkills) todo.push({ href: "/app/crew/skills", icon: GraduationCap, tone: "violet", title: `${dueSkills} skill${dueSkills > 1 ? "s" : ""} to refresh`, sub: "About 2 minutes" });
  if (exDebt) todo.push({ href: "/app/crew/activity", icon: Dumbbell, tone: "green", title: `${exDebt} min of exercise to catch up`, sub: "See free slots this week" });
  if (!foodToday.length) todo.push({ href: "/app/crew/hydration", icon: UtensilsCrossed, tone: "amber", title: "Rate today's meal", sub: "Three taps — keeps your taste radar useful" });

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
      sub: exPlan ? `${weekActivity} of ${exPlan.resistanceMinPerWeek + exPlan.aerobicMinPerWeek + exPlan.mobilityMinPerWeek} min this week` : `${weekActivity} min this week`,
      pct: Math.min(100, (weekActivity / (exPlan ? exPlan.resistanceMinPerWeek + exPlan.aerobicMinPerWeek + exPlan.mobilityMinPerWeek : 420)) * 100),
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
        <div className="flex shrink-0 items-center gap-2">
          {user.isDemo ? <DemoBadge /> : null}
        </div>
      </div>

      <section className={`relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-pop)] ${activeCase ? (activeCase.analysis.severity === "urgent" ? "bg-[#d64545]" : "bg-[#e08a1e]") : "hero-gradient"}`}>
        <div className="relative z-10 max-w-[62%] space-y-3">
          <p className="text-xs font-medium text-white/85">{lastCase ? `Last suit reading ${relativeTime(lastCase.createdAt, now.getTime())}` : "No suit reading yet"}</p>
          <h2 className="text-xl font-bold leading-snug sm:text-2xl">{activeCase ? `${activeCase.analysis.emoji} ${activeCase.analysis.label}` : "All suit readings normal ✓"}</h2>
          <ButtonLink href="#suit-check" variant="light" size="sm">
            Run a suit check <ChevronRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
        </div>
        <AstronautIllustration className="absolute -bottom-4 right-0 h-40 w-40 sm:h-48 sm:w-48" />
      </section>
      {activeCase ? (
        <section className="pop-in rounded-[var(--radius-card)] border-2 border-danger/30 bg-surface p-5 shadow-[var(--shadow-card)]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-danger">Your current health alert</p>
          <CaseView c={activeCase} audience="crew" />
        </section>
      ) : null}

      <section id="suit-check" className="scroll-mt-20 space-y-3">
        <div>
          <h2 className="text-lg font-bold">Suit check</h2>
          <p className="text-sm text-muted">Tap a scenario to send a suit reading to the health model. Demo data — real readings will come from your suit.</p>
        </div>
        <ScenarioGrid scenarios={SCENARIOS.map((x) => ({ id: x.id, title: x.title, emoji: x.emoji, blurb: x.blurb }))} mode="crew" />
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">

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

        </div>

        <div className="space-y-6">
          {todo.length ? (
            <Card>
              <CardHeader title="Today for you" />
              <CardBody className="space-y-2">
                {todo.map((t) => (
                  <Link key={t.href} href={t.href} className="lift flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
                    <IconTile tone={t.tone} size="sm">
                      <t.icon aria-hidden className="h-4 w-4" />
                    </IconTile>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{t.title}</span>
                      <span className="block text-xs text-muted">{t.sub}</span>
                    </span>
                    <ChevronRight aria-hidden className="h-4 w-4 text-muted" />
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="Quick mood" description="One tap · private unless you share it" />
            <CardBody>
              <QuickFeeling />
            </CardBody>
          </Card>

          {openTasks.length || messages[0] ? (
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
            </CardBody>
          </Card>
          ) : null}

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

        </div>
      </div>
      <p className="text-center text-xs text-muted">A summary of your own records — not a diagnosis. In an emergency, follow your mission&apos;s emergency procedure.</p>
    </div>
  );
}
