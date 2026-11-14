import type { Metadata } from "next";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { computeBaseline } from "@/lib/health/baseline";
import { fmtDateTime, scaleLabel } from "@/lib/utils";
import { Callout, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { CognitiveTasks } from "@/components/crew/cognitive-tasks";

export const metadata: Metadata = { title: "Focus check" };

export default async function CognitivePage() {
  const { user, tz } = await crewContext();
  const tests = await listPersonal(user.uid, "cognitiveTests", { sinceDays: 60 });
  const reaction = tests.filter((t) => t.test === "reaction");
  const base = computeBaseline(reaction.map((t) => ({ t: t.at, v: t.score })), { windowDays: 60, minObs: 4, now: new Date() });
  const demo = tests.some((t) => t.origin === "simulated");
  return (
    <div className="space-y-6">
      <PageHeader title="Focus check" description="Three quick games. Your results are only compared with your own." crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Focus check" }]} badges={demo ? <DemoBadge /> : undefined} />
      <Callout tone="info">Just for you — a quick way to notice when you might be tired. It is not a test of whether you can work.</Callout>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Try a task" />
          <CardBody>
            <CognitiveTasks />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Your reaction times" description={base.sufficient ? `Usually about ${base.mean.toFixed(0)} ms for you` : "Do a few more to see your usual"} />
          <CardBody>
            <TrendChart
              title="Reaction time"
              unit="ms"
              data={[...reaction].reverse().map((t) => ({ label: fmtDateTime(t.at, tz, { dateStyle: "short", timeStyle: undefined }), ms: t.score }))}
              series={[{ key: "ms", label: "Median reaction", color: CHART_COLORS.violet, type: "area", unit: "ms" }]}
              demo={demo}
            />
            <ul className="mt-4 space-y-2 text-sm">
              {tests.slice(0, 5).map((t) => (
                <li key={t.id} className="flex justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-2.5">
                  <span>
                    {t.test}: <strong>{t.score} {t.unit}</strong> · focus {scaleLabel("focus", t.selfFocus).toLowerCase()}
                  </span>
                  <span className="text-xs text-muted">{fmtDateTime(t.at, tz)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
