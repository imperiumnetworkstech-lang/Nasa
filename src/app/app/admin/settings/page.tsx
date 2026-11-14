import type { Metadata } from "next";
import { getSettings, listPlatformAudit } from "@/lib/data/repo";
import { backendName } from "@/lib/data";
import { refreshDemo, seedDemo } from "@/lib/actions/admin";
import { settingsForm } from "@/lib/actions/forms";
import { isDemoEnabled } from "@/lib/config";
import { isProviderConfigured } from "@/lib/guide/provider";
import { fmtDateTime } from "@/lib/utils";
import { Callout, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/action-ui";
import { Field, Input } from "@/components/ui/form";

export const metadata: Metadata = { title: "Settings" };

const NUM_FIELDS: [keyof Awaited<ReturnType<typeof getSettings>>["thresholds"], string, string, number][] = [
  ["hrDriftZ", "Heart-rate drift threshold", "SD", 0.1],
  ["baselineWindowDays", "Baseline window", "days", 1],
  ["baselineMinObservations", "Min observations for baseline", "obs", 1],
  ["minSleepHours", "Short-sleep threshold (3-night avg)", "h", 0.1],
  ["spo2Below", "SpO₂ flag below", "%", 1],
  ["temperatureAboveC", "Temperature flag above", "°C", 0.1],
  ["missedCheckInDays", "Missed check-in after", "days", 1],
  ["sustainedStressCount", "Sustained stress check-ins", "count", 1],
  ["minRestHoursBetweenHighWorkload", "Min rest between high-workload blocks", "h", 0.5],
];

export default async function AdminSettings() {
  const [s, log] = await Promise.all([getSettings(), listPlatformAudit()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" description={`Data backend: ${backendName() === "firestore" ? "Cloud Firestore" : "Local file store (development / demo)"}. Last updated ${fmtDateTime(s.updatedAt)} by ${s.updatedBy}.`} />
      <Callout tone="warn" title="Illustrative thresholds">
        Default values are for demonstration only. Mission medical teams must configure mission-specific thresholds. Rule set version {s.rulesVersion}.
      </Callout>
      <Card>
        <CardHeader title="Thresholds, privacy & communication delay" />
        <CardBody>
          <ActionForm
            action={settingsForm}
            resetOnSuccess={false}
            submitLabel="Save settings"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Simulated one-way comm delay (minutes)" htmlFor="cd" help="0 disables communication-delay mode. Max 45 min.">
                <Input id="cd" name="commDelayMin" type="number" step="0.5" min={0} max={45} defaultValue={s.commDelaySeconds / 60} />
              </Field>
              <Field label="Privacy minimum group size" htmlFor="pg" help="Aggregates over fewer people are hidden.">
                <Input id="pg" name="privacyMinGroupSize" type="number" min={2} max={20} defaultValue={s.privacyMinGroupSize} />
              </Field>
              {NUM_FIELDS.map(([k, label, unit, step]) => (
                <Field key={k} label={`${label} (${unit})`} htmlFor={k}>
                  <Input id={k} name={k} type="number" step={step} defaultValue={s.thresholds[k]} />
                </Field>
              ))}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Features</legend>
              {[
                ["readinessSummary", "Wellbeing summary on crew pages", s.features.readinessSummary],
                ["environmentOverlay", "Habitat environment overlay", s.features.environmentOverlay],
                ["guideAI", `External AI provider for Antariksha Guide ${isProviderConfigured() ? "(provider configured)" : "(no provider configured — local guide will be used)"}`, s.features.guideAI],
              ].map(([k, l, v]) => (
                <label key={String(k)} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={String(k)} defaultChecked={Boolean(v)} className="h-5 w-5 accent-[var(--primary)]" /> {String(l)}
                </label>
              ))}
              <p className="text-xs text-muted">The AI provider never receives health records. Review your organisation&apos;s privacy requirements before enabling it.</p>
            </fieldset>
          </ActionForm>
        </CardBody>
      </Card>
      {isDemoEnabled() ? (
        <Card>
          <CardHeader title="Demo data" description="Synthetic, clearly-labelled data for evaluation." action={<Badge tone="warn">Demo mode on</Badge>} />
          <CardBody className="flex flex-wrap gap-3">
            <ActionButton action={seedDemo} variant="secondary" size="md">
              Seed demo data
            </ActionButton>
            <ActionButton action={refreshDemo} variant="outline" size="md">
              Regenerate demo data (current dates)
            </ActionButton>
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader title="Platform audit log" />
        <CardBody>
          <ul className="space-y-1 text-sm">
            {log.slice(0, 40).map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 border-t border-line py-1.5">
                <span>
                  <code className="rounded bg-surface-2 px-1 text-xs">{l.action}</code> {l.target} {l.detail ? <span className="text-muted">({l.detail})</span> : null}
                </span>
                <span className="text-xs text-muted">
                  {l.actorName} · {fmtDateTime(l.at)}
                </span>
              </li>
            ))}
            {log.length === 0 ? <li className="text-muted">No platform-level events yet.</li> : null}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
