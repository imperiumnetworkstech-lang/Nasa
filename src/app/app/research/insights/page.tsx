import type { Metadata } from "next";
import { requestTime } from "@/lib/utils";
import { requireSection, toActor } from "@/lib/auth/current-user";
import { canViewResearchAggregates, privateAggregate } from "@/lib/permissions";
import { getSettings, listCrew, listMissions, listPersonal } from "@/lib/data/repo";
import { listGeode } from "@/lib/nasa/osdr";
import { CLASS_LABELS, physioModel, predictPhysioState, type PhysioClass } from "@/lib/ml/physio-state";
import holdout from "@/lib/ml/physio-holdout-samples.json";
import { Callout, PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, Progress } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { Brain, Database, Rocket, Users } from "lucide-react";

export const metadata: Metadata = { title: "Insights & model" };

export default async function Insights() {
  const user = await requireSection("research");
  const canAgg = canViewResearchAggregates(toActor(user));
  const settings = await getSettings();
  const [missionsApi, experimentsApi] = await Promise.all([listGeode("missions", 0), listGeode("experiments", 0)]);

  // De-identified aggregates across all missions: per-day means only, suppressed below k people.
  let aggRows: { label: string; sleep: number | null; stress: number | null; n: number }[] = [];
  if (canAgg) {
    const missions = await listMissions();
    const crew = (await Promise.all(missions.map((m) => listCrew(m.id)))).flat();
    const data = await Promise.all(crew.map(async (c) => ({ sleep: await listPersonal(c.uid, "sleepLogs", { sinceDays: 14 }), ci: await listPersonal(c.uid, "checkIns", { sinceDays: 14 }) })));
    aggRows = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(requestTime() - (13 - i) * 86_400_000).toISOString().slice(0, 10);
      const s = privateAggregate(data.map((x) => x.sleep.find((y) => y.end.slice(0, 10) === d)?.durationMin).filter((v): v is number => typeof v === "number").map((v) => v / 60), settings.privacyMinGroupSize);
      const st = privateAggregate(data.map((x) => x.ci.find((y) => y.at.slice(0, 10) === d)?.stress).filter((v): v is NonNullable<typeof v> => typeof v === "number"), settings.privacyMinGroupSize);
      return { label: d.slice(5), sleep: s.value, stress: st.value, n: s.n };
    });
  }
  const ev = physioModel.evaluation;
  const classes = physioModel.classes as PhysioClass[];

  return (
    <div className="space-y-6">
      <PageHeader title="Insights & model" description="De-identified aggregates, NASA OSDR catalogue figures and the open-data model's evaluation." crumbs={[{ label: "Research", href: "/app/research" }, { label: "Insights" }]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" icon={<Rocket aria-hidden className="h-5 w-5" />} label="OSDR missions" value={missionsApi.total || "—"} hint={missionsApi.total ? "Live from GEODE API" : "API unavailable"} />
        <Stat tone="teal" icon={<Database aria-hidden className="h-5 w-5" />} label="OSDR experiments" value={experimentsApi.total || "—"} hint="Live from GEODE API" />
        <Stat tone="amber" icon={<Brain aria-hidden className="h-5 w-5" />} label="Model accuracy (LOSO)" value={`${Math.round(ev.accuracy * 100)}%`} hint={`Balanced ${Math.round(ev.balancedAccuracy * 100)}% · chance 25%`} />
        <Stat tone="pink" icon={<Users aria-hidden className="h-5 w-5" />} label="Training subjects" value={ev.subjects} hint={`${ev.windows} windows`} />
      </div>

      {canAgg ? (
        <Card>
          <CardHeader title="Crew aggregates (de-identified)" description={`Daily means across all crew; any day with fewer than ${settings.privacyMinGroupSize} contributors is hidden.`} action={<DemoBadge />} />
          <CardBody>
            <TrendChart
              title="Mean sleep and self-reported stress"
              unit="h"
              rightUnit="/5"
              data={aggRows}
              series={[
                { key: "sleep", label: "Mean sleep", color: CHART_COLORS.violet, type: "bar", unit: "h" },
                { key: "stress", label: "Mean stress", color: CHART_COLORS.coral, axis: "right", unit: "/5" },
              ]}
              demo
            />
          </CardBody>
        </Card>
      ) : (
        <Callout tone="info">Aggregate crew insights are available to researchers, medical officers and administrators.</Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Physiological-state model — evaluation" description={ev.method} action={<Badge tone="warn">Experimental</Badge>} />
          <CardBody className="space-y-4">
            {classes.map((c) => (
              <div key={c} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{CLASS_LABELS[c]}</span>
                  <span className="text-muted">
                    recall {Math.round((ev.recall as Record<string, number>)[c] * 100)}% · precision {Math.round((ev.precision as Record<string, number>)[c] * 100)}%
                  </span>
                </div>
                <Progress value={(ev.recall as Record<string, number>)[c] * 100} label={`${c} recall`} />
              </div>
            ))}
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <caption className="mb-1 text-left text-muted">Confusion matrix (rows = true stage, columns = predicted)</caption>
                <thead>
                  <tr>
                    <th />
                    {classes.map((c) => (
                      <th key={c} className="px-1 py-1 font-medium">
                        {c.replace("Stress", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ev.confusion.map((row, i) => (
                    <tr key={i}>
                      <th className="py-1 text-left font-medium">{classes[i].replace("Stress", "")}</th>
                      {row.map((v, j) => (
                        <td key={j} className={`rounded-lg px-1 py-1 ${i === j ? "bg-primary-soft font-semibold text-primary" : ""}`}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Held-out real windows" description={holdout.subject} />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {holdout.samples.map((s, i) => {
                const p = predictPhysioState(s.features);
                return (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2">
                    <span>
                      True: <strong>{s.trueLabel}</strong> · HR {s.raw.hr.toFixed(0)} bpm · SpO₂ {s.raw.spo2.toFixed(0)}%
                    </span>
                    <Badge tone={p.top === s.trueLabel ? "ok" : "warn"}>
                      Predicted {p.top} ({Math.round(p.probabilities[p.top] * 100)}%)
                    </Badge>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted">Final model shown; per-fold leave-one-subject-out results are in the evaluation card.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
