import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { dailySeries, meanOf } from "@/lib/health/series";
import { fmtDateTime, scaleLabel } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { JournalForm, MoodForm } from "@/components/crew/forms";
import { BreathingExercise } from "@/components/crew/breathing";

export const metadata: Metadata = { title: "Mood" };

export default async function MoodPage() {
  const { user, tz } = await crewContext();
  const [moods, journal] = await Promise.all([listPersonal(user.uid, "moodLogs", { sinceDays: 30 }), listPersonal(user.uid, "journal", { limit: 10 })]);
  const demo = moods.some((m) => m.origin === "simulated");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mood"
        description="Private by default. Only you decide what to share."
        crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Mood" }]}
        badges={demo ? <DemoBadge /> : undefined}
        actions={<ButtonLink href="/app/crew/my-plan#consult" variant="secondary">Request support</ButtonLink>}
      />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Mood check-in" />
          <CardBody>
            <MoodForm />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Take a breath" description="Breathing & grounding" />
          <CardBody>
            <BreathingExercise />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Mood & stress" description="Last 30 days · your own entries" />
        <CardBody>
          <TrendChart
            title="Mood and stress (1–5)"
            unit="/5"
            yDomain={[1, 5]}
            data={dailySeries(moods, (m) => m.at, 30, { mood: meanOf((m) => m.mood), stress: meanOf((m) => m.stress) }, tz)}
            series={[
              { key: "mood", label: "Mood", color: CHART_COLORS.violet, type: "area", unit: "/5" },
              { key: "stress", label: "Stress", color: CHART_COLORS.amber, unit: "/5" },
            ]}
            demo={demo}
          />
          <ul className="mt-4 space-y-2 text-sm">
            {moods.slice(0, 5).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-2.5">
                <span>
                  {scaleLabel("mood", m.mood)} · stress {scaleLabel("stress", m.stress).toLowerCase()}
                  {m.reflection ? <span className="block text-xs text-muted">“{m.reflection}”</span> : null}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {fmtDateTime(m.at, tz)} {m.shareWithMedical ? <Badge tone="info">Shared with medical</Badge> : <Badge>Private</Badge>}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<Lock className="h-4 w-4" />} title="Private journal" description="Visible only to you" />
        <CardBody className="space-y-4">
          <JournalForm />
          <ul className="space-y-2 text-sm">
            {journal.map((j) => (
              <li key={j.id} className="rounded-2xl bg-surface-2 p-4">
                <p className="whitespace-pre-line">{j.text}</p>
                <p className="mt-1 text-xs text-muted">{fmtDateTime(j.at, tz)}</p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
