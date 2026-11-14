import type { Metadata } from "next";
import { getSettings, listPlatformAudit } from "@/lib/data/repo";
import { backendName } from "@/lib/data";
import { refreshDemo, seedDemo } from "@/lib/actions/admin";
import { settingsForm } from "@/lib/actions/forms";
import { isDemoEnabled } from "@/lib/config";
import { isProviderConfigured } from "@/lib/guide/provider";
import { fmtDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/action-ui";
import { Field, Input } from "@/components/ui/form";

export const metadata: Metadata = { title: "Settings" };

const THRESHOLDS: [keyof Awaited<ReturnType<typeof getSettings>>["thresholds"], string, string, number][] = [
  ["hrDriftZ", "Heart-rate change to flag", "× usual variation", 0.1],
  ["baselineWindowDays", "Days used to learn someone's usual", "days", 1],
  ["baselineMinObservations", "Readings needed before comparing", "readings", 1],
  ["minSleepHours", "Flag sleep shorter than (3-night average)", "hours", 0.1],
  ["spo2Below", "Flag oxygen below", "%", 1],
  ["temperatureAboveC", "Flag temperature above", "°C", 0.1],
  ["missedCheckInDays", "Remind after missed check-ins", "days", 1],
  ["sustainedStressCount", "Flag high stress after", "check-ins in a row", 1],
  ["minRestHoursBetweenHighWorkload", "Minimum rest between heavy tasks", "hours", 0.5],
];

function Toggle({ name, label, help, checked }: { name: string; label: string; help: string; checked: boolean }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl bg-surface-2 p-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{help}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" />
    </label>
  );
}

export default async function AdminSettings() {
  const [s, log] = await Promise.all([getSettings(), listPlatformAudit()]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description={`Last changed ${fmtDateTime(s.updatedAt)} by ${s.updatedBy}.`} />

      <ActionForm action={settingsForm} resetOnSuccess={false} submitLabel="Save settings" className="space-y-6">
        <Card>
          <CardHeader title="Message delay" description="Pretend messages take time to travel, like on a real deep-space mission." />
          <CardBody>
            <Field label="Delay each way (minutes)" htmlFor="cd" help="0 means no delay. Up to 45 minutes.">
              <Input id="cd" name="commDelayMin" type="number" step="0.5" min={0} max={45} defaultValue={s.commDelaySeconds / 60} className="max-w-40" />
            </Field>
            <div className="mt-4">
              <Field label="Link available every (hours)" htmlFor="cw" help="0 means the link is always up. Otherwise questions wait for the next window, starting at midnight UTC.">
                <Input id="cw" name="commWindowEveryHours" type="number" min={0} max={24} defaultValue={s.commWindowEveryHours} className="max-w-40" />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Privacy" />
          <CardBody>
            <Field label="Hide group averages when fewer than this many people" htmlFor="pg" help="Stops anyone working out one person's data from a small group. 3 or more is recommended.">
              <Input id="pg" name="privacyMinGroupSize" type="number" min={2} max={20} defaultValue={s.privacyMinGroupSize} className="max-w-40" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Features" />
          <CardBody className="space-y-2">
            <Toggle name="readinessSummary" label="Wellbeing summary" help="Shows crew a short ‘how am I doing’ summary." checked={s.features.readinessSummary} />
            <Toggle name="environmentOverlay" label="Habitat readings on the timeline" help="Shows cabin CO₂ and temperature next to crew trends." checked={s.features.environmentOverlay} />
            <Toggle
              name="guideAI"
              label="Use an outside AI service for the assistant"
              help={`Off is safest. Health records are never sent to it. ${isProviderConfigured() ? "A service is configured." : "No service is configured, so the built-in assistant is used either way."}`}
              checked={s.features.guideAI}
            />
          </CardBody>
        </Card>

        <Card>
          <details>
            <summary className="cursor-pointer list-none px-5 py-5">
              <span className="block text-base font-semibold">Health alert levels</span>
              <span className="block text-xs text-muted">Advanced — set these with your mission&apos;s medical team. The defaults are examples only.</span>
            </summary>
            <CardBody className="grid gap-4 pt-0 sm:grid-cols-2">
              {THRESHOLDS.map(([k, label, unit, step]) => (
                <Field key={k} label={label} htmlFor={k} help={unit}>
                  <Input id={k} name={k} type="number" step={step} defaultValue={s.thresholds[k]} />
                </Field>
              ))}
            </CardBody>
          </details>
        </Card>
      </ActionForm>

      {isDemoEnabled() ? (
        <Card>
          <CardHeader title="Practice data" description="Made-up people and records for trying the app." action={<Badge tone="warn">Demo mode on</Badge>} />
          <CardBody className="flex flex-wrap gap-3">
            <ActionButton action={seedDemo} variant="secondary" size="md">
              Add practice data
            </ActionButton>
            <ActionButton action={refreshDemo} variant="outline" size="md">
              Refresh practice data to today
            </ActionButton>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <details>
          <summary className="cursor-pointer list-none px-5 py-5">
            <span className="block text-base font-semibold">Activity log</span>
            <span className="block text-xs text-muted">Admin changes, newest first · storage: {backendName() === "firestore" ? "Cloud Firestore" : "local file (testing only)"}</span>
          </summary>
          <CardBody className="pt-0">
            <ul className="space-y-1 text-sm">
              {log.slice(0, 40).map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 border-t border-line py-1.5">
                  <span>
                    <code className="rounded bg-surface-2 px-1 text-xs">{l.action}</code> {l.detail ? <span className="text-muted">({l.detail})</span> : null}
                  </span>
                  <span className="text-xs text-muted">
                    {l.actorName} · {fmtDateTime(l.at)}
                  </span>
                </li>
              ))}
              {log.length === 0 ? <li className="text-muted">Nothing yet.</li> : null}
            </ul>
          </CardBody>
        </details>
      </Card>
    </div>
  );
}
