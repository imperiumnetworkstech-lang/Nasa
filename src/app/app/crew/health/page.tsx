import type { Metadata } from "next";
import Link from "next/link";
import { Droplets, HeartPulse, Thermometer, Waves, Wind, Sun } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { computeBaseline } from "@/lib/health/baseline";
import { dailySeries, meanOf } from "@/lib/health/series";
import { VITAL_META } from "@/lib/health/vitals";
import { relativeTime } from "@/lib/utils";
import type { VitalKind } from "@/lib/types";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, IconTile, type TileTone } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { VitalForm } from "@/components/crew/forms";
import { BodyStateCard } from "@/components/crew/body-state-card";

export const metadata: Metadata = { title: "My body" };

const TILES: { kind: VitalKind; icon: typeof HeartPulse; tone: TileTone }[] = [
  { kind: "heart_rate", icon: HeartPulse, tone: "pink" },
  { kind: "spo2", icon: Wind, tone: "blue" },
  { kind: "eda", icon: Droplets, tone: "teal" },
  { kind: "temperature", icon: Thermometer, tone: "amber" },
  { kind: "skin_temp", icon: Sun, tone: "violet" },
  { kind: "resp_rate", icon: Waves, tone: "green" },
];

/** Plain-language comparison with the person's own recent readings. */
function usual(values: { t: string; v: number }[]): { text: string; tone: "ok" | "warn" | "muted" } {
  const b = computeBaseline(values, { windowDays: 21, minObs: 7, now: new Date(), excludeLatest: true });
  const latest = [...values].sort((a, b) => b.t.localeCompare(a.t))[0];
  if (!latest) return { text: "No reading yet", tone: "muted" };
  if (!b.sufficient) return { text: "Learning your usual…", tone: "muted" };
  const band = Math.max(2 * b.sd, Math.abs(b.mean) * 0.03);
  if (latest.v > b.mean + band) return { text: "Higher than usual", tone: "warn" };
  if (latest.v < b.mean - band) return { text: "Lower than usual", tone: "warn" };
  return { text: "Usual for you", tone: "ok" };
}

const CHARTS: Record<string, { kind: VitalKind; label: string }> = {
  heart: { kind: "heart_rate", label: "Heart rate" },
  oxygen: { kind: "spo2", label: "Oxygen" },
  sweat: { kind: "eda", label: "Sweat" },
  temp: { kind: "temperature", label: "Temperature" },
};

export default async function MyBodyPage({ searchParams }: PageProps<"/app/crew/health">) {
  const { user, tz } = await crewContext();
  const sp = await searchParams;
  const show = typeof sp.show === "string" && sp.show in CHARTS ? sp.show : "heart";
  const [vitals, wearables] = await Promise.all([listPersonal(user.uid, "vitals", { sinceDays: 30 }), listPersonal(user.uid, "wearableSessions", { limit: 3 })]);
  const valid = (k: VitalKind) => vitals.filter((v) => v.kind === k && v.quality === "valid");
  const demo = vitals.some((v) => v.origin === "simulated");
  const chart = CHARTS[show];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="My body" description="Your latest readings, compared with what's usual for you." crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "My body" }]} badges={demo ? <DemoBadge /> : undefined} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {TILES.map(({ kind, icon: Icon, tone }) => {
          const list = valid(kind);
          const v = list[0];
          const m = VITAL_META[kind];
          const u = usual(list.map((x) => ({ t: x.measuredAt, v: x.value })));
          return (
            <div key={kind} className="rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2">
                <IconTile tone={tone} size="sm">
                  <Icon aria-hidden className="h-4 w-4" />
                </IconTile>
                <span className="text-sm font-medium">{m.short}</span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums">
                {v ? v.value : "—"} <span className="text-xs font-normal text-muted">{m.unit}</span>
              </p>
              <p className={`text-xs font-medium ${u.tone === "ok" ? "text-ok" : u.tone === "warn" ? "text-warn" : "text-muted"}`}>{u.text}</p>
              <p className="text-[11px] text-muted">{v ? relativeTime(v.measuredAt) : ""}</p>
            </div>
          );
        })}
      </div>

      <BodyStateCard sessions={wearables} tz={tz} />

      <Card>
        <CardHeader title="Last 2 weeks" />
        <CardBody className="space-y-4">
          <nav aria-label="Choose chart" className="flex flex-wrap gap-2">
            {Object.entries(CHARTS).map(([k, c]) => (
              <Link key={k} href={`?show=${k}`} scroll={false} aria-current={show === k ? "true" : undefined} className={`rounded-full px-4 py-1.5 text-sm ${show === k ? "hero-gradient font-semibold text-white" : "bg-surface-2 text-muted hover:text-primary"}`}>
                {c.label}
              </Link>
            ))}
          </nav>
          <TrendChart
            title={chart.label}
            unit={VITAL_META[chart.kind].unit}
            data={dailySeries(valid(chart.kind), (v) => v.measuredAt, 14, { v: meanOf((x) => x.value) }, tz)}
            series={[{ key: "v", label: chart.label, color: CHART_COLORS.violet, type: "area", unit: VITAL_META[chart.kind].unit }]}
            demo={demo}
            height={220}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Add a reading" description="Most readings come in automatically from your sensors. Use this if you measured something yourself." />
        <CardBody>
          <VitalForm />
        </CardBody>
      </Card>
      <p className="text-center text-xs text-muted">Not feeling right? Use “Get help” to tell your doctor.</p>
    </div>
  );
}
