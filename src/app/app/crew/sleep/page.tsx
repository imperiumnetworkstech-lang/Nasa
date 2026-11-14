import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { dailySeries, meanOf } from "@/lib/health/series";
import { average } from "@/lib/health/baseline";
import { fmtDateTime, fmtTime, scaleLabel } from "@/lib/utils";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { SleepForm } from "@/components/crew/forms";
import { Moon, Clock, Star } from "lucide-react";

export const metadata: Metadata = { title: "Sleep" };

export default async function SleepPage() {
  const { user, tz } = await crewContext();
  const sleep = await listPersonal(user.uid, "sleepLogs", { sinceDays: 30 });
  const demo = sleep.some((s) => s.origin === "simulated");
  const h7 = average(sleep.slice(0, 7).map((s) => s.durationMin / 60));
  const h30 = average(sleep.map((s) => s.durationMin / 60));
  const q7 = average(sleep.slice(0, 7).map((s) => s.quality).filter((x): x is NonNullable<typeof x> => x !== null));
  const shifted = sleep.filter((s) => s.shift && s.shift !== "Nominal");
  const avgShifted = average(shifted.map((s) => s.durationMin / 60));
  const avgNominal = average(sleep.filter((s) => !s.shift || s.shift === "Nominal").map((s) => s.durationMin / 60));

  // Gentle, non-clinical suggestions derived only from the person's own patterns.
  const tips: string[] = [];
  if (h7 !== null && h30 !== null && h7 < h30 - 0.4) tips.push(`This week you averaged ${h7.toFixed(1)} h, below your 30-day ${h30.toFixed(1)} h. Protecting your sleep window may help.`);
  if (avgShifted !== null && avgNominal !== null && avgShifted < avgNominal - 0.3) tips.push(`Nights with a shifted schedule averaged ${avgShifted.toFixed(1)} h vs ${avgNominal.toFixed(1)} h on nominal nights.`);
  if (sleep.slice(0, 7).some((s) => s.wakeUps >= 3)) tips.push("You logged several wake-ups recently. Noise and light around the sleep station are worth checking.");
  if (!tips.length) tips.push("Your recent sleep looks consistent with your own pattern. Keep logging to keep the picture clear.");

  return (
    <div className="space-y-6">
      <PageHeader title="Sleep" description="Your sleep, schedule context and gentle suggestions from your own patterns." crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Sleep" }]} badges={demo ? <DemoBadge /> : undefined} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat tone="blue" icon={<Moon aria-hidden className="h-5 w-5" />} label="7-day average" value={h7?.toFixed(1) ?? "—"} unit="h" />
        <Stat tone="violet" icon={<Clock aria-hidden className="h-5 w-5" />} label="30-day average" value={h30?.toFixed(1) ?? "—"} unit="h" />
        <Stat tone="amber" icon={<Star aria-hidden className="h-5 w-5" />} label="Quality (7 days)" value={q7 ? scaleLabel("quality", Math.round(q7)) : "—"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Sleep duration" description="Last 30 days" />
          <CardBody>
            <TrendChart
              title="Sleep"
              unit="h"
              data={dailySeries(sleep, (s) => s.end, 30, { h: meanOf((s) => s.durationMin / 60), q: meanOf((s) => s.quality) }, tz)}
              series={[
                { key: "h", label: "Duration", color: CHART_COLORS.violet, type: "bar", unit: "h" },
                { key: "q", label: "Quality (1–5)", color: CHART_COLORS.amber, axis: "right", unit: "/5" },
              ]}
              rightUnit="/5"
              demo={demo}
              height={260}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="Suggestions for you" description="Based only on your logs · not medical advice" />
          <CardBody className="space-y-3 text-sm">
            {tips.map((t) => (
              <p key={t} className="rounded-2xl bg-surface-2 p-3">
                {t}
              </p>
            ))}
            <Link href="/app/library#sleep-hygiene-basics" className="text-sm font-semibold text-primary hover:underline">
              Read: Sleep hygiene in a confined habitat
            </Link>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Log sleep" />
        <CardBody>
          <SleepForm />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Recent nights" />
        <CardBody>
          <ul className="divide-y divide-line text-sm">
            {sleep.slice(0, 10).map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>
                  <strong>{(s.durationMin / 60).toFixed(1)} h</strong> · {fmtTime(s.start, tz)}–{fmtTime(s.end, tz)} · {scaleLabel("quality", s.quality)} · {s.wakeUps} wake-ups
                </span>
                <span className="text-xs text-muted">
                  {fmtDateTime(s.end, tz, { dateStyle: "medium", timeStyle: undefined })}
                  {s.shift ? ` · ${s.shift}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
