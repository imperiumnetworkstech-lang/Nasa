import type { Metadata } from "next";
import { Dumbbell, HeartPulse, StretchHorizontal } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { dailySeries, meanOf, sumOf } from "@/lib/health/series";
import { fmtDateTime, requestTime } from "@/lib/utils";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { ActivityForm } from "@/components/crew/forms";

export const metadata: Metadata = { title: "Exercise" };

export default async function ActivityPage() {
  const { user, tz } = await crewContext();
  const acts = await listPersonal(user.uid, "activityLogs", { sinceDays: 30 });
  const week = acts.filter((a) => Date.parse(a.at) > requestTime() - 7 * 86_400_000);
  const by = (c: string) => week.filter((a) => a.category === c).reduce((s, a) => s + a.durationMin, 0);
  const demo = acts.some((a) => a.origin === "simulated");
  return (
    <div className="space-y-6">
      <PageHeader title="Exercise & recovery" description="Resistance, aerobic and mobility sessions with soreness and recovery check-ins." crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Exercise" }]} badges={demo ? <DemoBadge /> : undefined} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat tone="violet" icon={<Dumbbell aria-hidden className="h-5 w-5" />} label="Resistance (7 d)" value={by("resistance")} unit="min" />
        <Stat tone="pink" icon={<HeartPulse aria-hidden className="h-5 w-5" />} label="Aerobic (7 d)" value={by("aerobic")} unit="min" />
        <Stat tone="green" icon={<StretchHorizontal aria-hidden className="h-5 w-5" />} label="Mobility (7 d)" value={by("mobility")} unit="min" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Training & recovery" description="Last 21 days" />
          <CardBody>
            <TrendChart
              title="Minutes per day and recovery"
              unit="min"
              rightUnit="/5"
              data={dailySeries(acts, (a) => a.at, 21, { min: sumOf((a) => a.durationMin), rec: meanOf((a) => a.recovery) }, tz)}
              series={[
                { key: "min", label: "Minutes", color: CHART_COLORS.violet, type: "bar", unit: "min" },
                { key: "rec", label: "Recovery (1–5)", color: CHART_COLORS.teal, axis: "right", unit: "/5" },
              ]}
              demo={demo}
              height={260}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Log exercise" />
          <CardBody>
            <ActivityForm />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Recent sessions" description={user.preferences.reminders.mobilityBreaks ? "Mobility-break reminders are on" : "Mobility-break reminders can be turned on in Profile"} />
        <CardBody>
          <ul className="divide-y divide-line text-sm">
            {acts.slice(0, 10).map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>
                  <strong>{a.name}</strong> · {a.durationMin} min · {a.intensity}
                  {a.soreness !== null ? ` · soreness ${a.soreness}/4` : ""}
                </span>
                <span className="text-xs text-muted">{fmtDateTime(a.at, tz)}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
