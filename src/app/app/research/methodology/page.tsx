import type { Metadata } from "next";
import { requireSection } from "@/lib/auth/current-user";
import { physioModel } from "@/lib/ml/physio-state";
import { RULE_DEFINITIONS, RULES_VERSION } from "@/lib/alerts/rules";
import { DEFAULT_SETTINGS } from "@/lib/config";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Methodology" };

export default async function Methodology() {
  await requireSection("research");
  const th = DEFAULT_SETTINGS.thresholds;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Methodology" description="How Antariksha's indicators work, what is novel product design, and what is not validated." crumbs={[{ label: "Research", href: "/app/research" }, { label: "Methodology" }]} />

      <Card id="model">
        <CardHeader title="Physiological-state model (experimental)" action={<Badge tone="warn">Not validated for astronauts</Badge>} />
        <CardBody className="space-y-3 text-sm leading-relaxed">
          <p>
            <strong>Data.</strong> {physioModel.dataset.name} by {physioModel.dataset.authors} ({physioModel.dataset.publisher}, {physioModel.dataset.licence}). {physioModel.dataset.population}. Wrist sensors recorded heart rate and SpO₂ (1 Hz) and electrodermal activity, skin temperature and 3-axis acceleration (8 Hz) through scripted stages: relaxation, physical exertion, cognitive load (mental arithmetic, Stroop) and emotional arousal (film clip).
          </p>
          <p>
            <strong>Features.</strong> 30-second windows (15 s hop). Each signal is expressed relative to the person&apos;s own first relaxed stage — matching Antariksha&apos;s personal-baseline philosophy: {physioModel.features.join(", ")}.
          </p>
          <p>
            <strong>Model.</strong> {physioModel.algorithm}. Trained by <code>ml/train-physio-state.ts</code> with no third-party ML libraries, so every weight is inspectable in <code>src/lib/ml/physio-state-model.json</code>. Each prediction lists the features that contributed most.
          </p>
          <p>
            <strong>Evaluation.</strong> {physioModel.evaluation.method}: accuracy {Math.round(physioModel.evaluation.accuracy * 100)}%, balanced accuracy {Math.round(physioModel.evaluation.balancedAccuracy * 100)}% across 4 classes (chance ≈ 25%). Physical exertion is recognised most reliably; cognitive and emotional states are often confused with each other and with relaxation.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {physioModel.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card id="baseline">
        <CardHeader title="Personal Baseline Drift Monitor" />
        <CardBody className="space-y-2 text-sm leading-relaxed">
          <p>Baseline = mean and SD of a person&apos;s own valid observations over the last {th.baselineWindowDays} days, excluding the newest value. At least {th.baselineMinObservations} observations are required; below that, no conclusion is drawn. A flag is raised when the newest value is ≥ {th.hrDriftZ} SD from the baseline (SD floored to avoid over-sensitivity on flat histories). Confidence is reported as low / moderate / high based on sample size.</p>
        </CardBody>
      </Card>

      <Card id="alerts">
        <CardHeader title={`Alert rules (version ${RULES_VERSION})`} description="Rules-based by default. Thresholds are illustrative and configurable per mission." />
        <CardBody>
          <ul className="space-y-2 text-sm">
            {RULE_DEFINITIONS.map((r) => (
              <li key={r.id} className="rounded-2xl bg-surface-2 p-3">
                <strong>{r.name}</strong> <code className="text-xs text-muted">{r.id}</code>
                <p className="text-muted">{r.description}</p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card id="privacy">
        <CardHeader title="Privacy-preserving aggregates" />
        <CardBody className="text-sm leading-relaxed">
          Aggregates shown to commanders and researchers are suppressed when fewer than {DEFAULT_SETTINGS.privacyMinGroupSize} people contribute (configurable), so an individual&apos;s value cannot be inferred from a small group. Mood entries, journals, symptoms and clinical notes are never included in commander views.
        </CardBody>
      </Card>

      <Card id="novelty">
        <CardHeader title="What is novel vs established" />
        <CardBody className="space-y-2 text-sm leading-relaxed">
          <p>
            <strong>Established techniques:</strong> rules-based clinical alerting, personal baselines/z-scores, logistic regression, k-anonymity-style suppression, offline queues.
          </p>
          <p>
            <strong>Product concepts explored here:</strong> combining them with mission context, communication-delay delivery states, and role-scoped readiness views. These are design proposals for research and simulation — not flight-certified capabilities, and we make no claim that nobody has built similar tools.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
