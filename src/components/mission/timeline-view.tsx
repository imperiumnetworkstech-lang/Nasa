import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select } from "@/components/ui/form";
import { TrendChart, CHART_COLORS, type ChartRow } from "@/components/charts/trend-chart";
import { missionEventForm } from "@/lib/actions/forms";
import type { EnvironmentReading, MissionEvent, MissionMember } from "@/lib/types";
import { fmtDateTime, requestTime } from "@/lib/utils";

const TYPE_LABEL: Record<MissionEvent["type"], string> = {
  eva: "EVA",
  exercise: "Exercise",
  sleep_shift: "Sleep schedule change",
  shift_change: "Shift change",
  vehicle: "Vehicle / habitat",
  comm_delay: "Communication delay",
  workload: "Workload block",
  rest: "Rest window",
  other: "Other",
};
const TYPE_EMOJI: Record<MissionEvent["type"], string> = { eva: "🧑‍🚀", exercise: "🏋️", sleep_shift: "🌙", shift_change: "🔄", vehicle: "🛰️", comm_delay: "📡", workload: "🧰", rest: "😴", other: "📌" };

/**
 * Mission Context Timeline: health observations alongside mission events and habitat
 * environment readings. Helps inspect correlation — never claims causation.
 */
export function TimelineView({
  events,
  env,
  crew,
  tz,
  canEdit,
  overlay,
  overlayTitle,
  demo,
}: {
  events: MissionEvent[];
  env: EnvironmentReading[];
  crew: MissionMember[];
  tz: string;
  canEdit: boolean;
  overlay: ChartRow[];
  overlayTitle: string;
  demo: boolean;
}) {
  const name = (uid: string) => crew.find((c) => c.uid === uid)?.callSign ?? "—";
  const sorted = [...events].sort((a, b) => b.start.localeCompare(a.start));
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Context overlay" description="Exploratory correlation only — co-occurrence is not causation." action={demo ? <DemoBadge /> : undefined} />
        <CardBody>
          <TrendChart
            title={overlayTitle}
            unit="ppm CO₂"
            rightUnit="value"
            data={overlay}
            series={[
              { key: "co2", label: "Cabin CO₂", color: CHART_COLORS.slate, type: "area", unit: "ppm" },
              { key: "a", label: overlay[0]?.aLabel ? String(overlay[0].aLabel) : "Crew metric", color: CHART_COLORS.violet, axis: "right" },
              { key: "b", label: overlay[0]?.bLabel ? String(overlay[0].bLabel) : "Crew metric 2", color: CHART_COLORS.coral, axis: "right" },
            ]}
            demo={demo}
            height={260}
          />
          <p className="mt-2 text-xs text-muted">
            Environment source: {env[0]?.source ?? "none configured"} · units: CO₂ ppm, temperature °C, humidity %RH, noise dBA. Radiation dosimetry is shown only when a valid source is configured (none in demo).
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Mission events" description="Entered by authorised users" />
          <CardBody>
            <ol className="relative space-y-4 border-l-2 border-line pl-5">
              {sorted.map((e) => {
                const future = Date.parse(e.start) > requestTime();
                return (
                  <li key={e.id} className="relative">
                    <span aria-hidden className="absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full bg-surface text-base shadow-[var(--shadow-card)]">
                      {TYPE_EMOJI[e.type]}
                    </span>
                    <div className="rounded-2xl bg-surface-2 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong>{e.title}</strong>
                        <span className="flex flex-wrap gap-1.5">
                          {future ? <Badge tone="info">Planned</Badge> : null}
                          {e.workload ? <Badge tone={e.workload === "high" ? "warn" : "neutral"}>{e.workload} workload</Badge> : null}
                          {e.origin === "simulated" ? <DemoBadge label="Simulated" /> : null}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {TYPE_LABEL[e.type]} · {fmtDateTime(e.start, tz)}
                        {e.end ? ` → ${fmtDateTime(e.end, tz)}` : ""} · {e.crewUids.length ? e.crewUids.map(name).join(", ") : "Whole crew"}
                      </p>
                      {e.notes ? <p className="mt-1 text-xs">{e.notes}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
        {canEdit ? (
          <Card className="self-start">
            <CardHeader title="Add event" />
            <CardBody>
              <ActionForm action={missionEventForm} submitLabel="Add to timeline">
                <Field label="Type" htmlFor="ev-type">
                  <Select id="ev-type" name="type" defaultValue="workload">
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Title" htmlFor="ev-title">
                  <Input id="ev-title" name="title" required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start" htmlFor="ev-start">
                    <Input id="ev-start" name="start" type="datetime-local" required />
                  </Field>
                  <Field label="End" optional htmlFor="ev-end">
                    <Input id="ev-end" name="end" type="datetime-local" />
                  </Field>
                </div>
                <Field label="Workload" htmlFor="ev-wl">
                  <Select id="ev-wl" name="workload" defaultValue="moderate">
                    <option value="">Not applicable</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </Select>
                </Field>
                <fieldset>
                  <legend className="mb-1 text-sm font-medium">Crew involved (none = whole crew)</legend>
                  <div className="flex flex-wrap gap-2">
                    {crew.map((c) => (
                      <label key={c.uid} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm">
                        <input type="checkbox" name="crew" value={c.uid} className="accent-[var(--primary)]" /> {c.callSign}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Notes" optional htmlFor="ev-notes">
                  <Input id="ev-notes" name="notes" />
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
