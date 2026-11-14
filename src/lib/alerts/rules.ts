import { computeDrift } from "@/lib/health/baseline";
import type { AlertSeverity, CheckIn, SleepLog, SymptomReport, Thresholds, Vital } from "@/lib/types";

/**
 * Explainable, rules-based alert engine (versioned). No black-box scoring.
 * Every candidate explains what was observed, the source, when, why it was flagged,
 * data freshness, and a recommended *workflow* (never a diagnosis or treatment).
 * Thresholds are configurable and the defaults are illustrative only.
 */
export const RULES_VERSION = "2026.11-1";

export interface RuleInput {
  crewUid: string;
  crewLabel: string;
  now: Date;
  thresholds: Thresholds;
  vitals: Vital[];
  sleep: SleepLog[];
  checkIns: CheckIn[];
  symptoms: SymptomReport[];
}

export interface AlertCandidate {
  ruleId: string;
  ruleVersion: string;
  dedupeKey: string;
  severity: AlertSeverity;
  title: string;
  observed: string;
  source: string;
  observedAt: string;
  reason: string;
  dataState: "fresh" | "stale" | "missing" | "sparse";
  recommendedAction: string;
  operational: boolean;
}

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
}

export const RULE_DEFINITIONS: RuleDefinition[] = [
  { id: "hr-baseline-drift", name: "Heart-rate baseline drift", description: "Latest valid heart rate deviates from the person's own baseline by ≥ the configured SD threshold." },
  { id: "spo2-low", name: "Oxygen saturation below configured value", description: "A valid SpO₂ observation is below the mission-configured illustrative threshold." },
  { id: "temperature-high", name: "Body temperature above configured value", description: "A valid temperature observation is above the mission-configured illustrative threshold." },
  { id: "sleep-deficit", name: "Short sleep (3-night average)", description: "Average logged sleep over the last 3 nights is below the configured hours." },
  { id: "missed-check-in", name: "Missed daily check-ins", description: "No check-in for at least the configured number of days. Indicates missing data, not a health problem." },
  { id: "sustained-stress", name: "Sustained high self-reported stress", description: "Self-reported stress ≥ 4/5 for the configured number of consecutive check-ins." },
  { id: "symptom-review", name: "Symptom report requests review", description: "Crew member submitted a symptom report and asked for medical review." },
  { id: "follow-up-requested", name: "Check-in asked for follow-up", description: "Crew member asked for medical follow-up in a daily check-in." },
];

const day = (iso: string) => iso.slice(0, 10);
const hoursSince = (iso: string, now: Date) => (now.getTime() - Date.parse(iso)) / 3_600_000;
function freshness(iso: string, now: Date, staleHours = 36): "fresh" | "stale" {
  return hoursSince(iso, now) > staleHours ? "stale" : "fresh";
}

export function evaluateRules(input: RuleInput): AlertCandidate[] {
  const { now, thresholds: th, crewUid } = input;
  const out: AlertCandidate[] = [];
  const validVitals = input.vitals.filter((v) => v.quality === "valid");

  // 1. Heart-rate drift against personal baseline.
  const hr = validVitals.filter((v) => v.kind === "heart_rate").map((v) => ({ t: v.measuredAt, v: v.value }));
  if (hr.length) {
    const drift = computeDrift(hr, {
      windowDays: th.baselineWindowDays,
      minObs: th.baselineMinObservations,
      zThreshold: th.hrDriftZ,
      now,
      unit: "bpm",
      label: "resting heart rate",
    });
    if (drift.flagged && drift.latest) {
      const src = input.vitals.find((v) => v.measuredAt === drift.latest!.t);
      out.push({
        ruleId: "hr-baseline-drift",
        ruleVersion: RULES_VERSION,
        dedupeKey: `hr-baseline-drift:${crewUid}:${day(drift.latest.t)}`,
        severity: "attention",
        title: "Heart rate differs from personal baseline",
        observed: `${drift.latest.v} bpm`,
        source: `${src?.source ?? "unknown"} observation${src?.device ? ` (${src.device})` : ""}`,
        observedAt: drift.latest.t,
        reason: `${drift.explanation} Baseline confidence: ${drift.confidence}.`,
        dataState: freshness(drift.latest.t, now),
        recommendedAction: "Review recent context (exercise, sleep, workload) and consider a repeat measurement.",
        operational: false,
      });
    }
  }

  // 2/3. Point-in-time vitals against configured illustrative thresholds.
  for (const v of validVitals) {
    if (hoursSince(v.measuredAt, now) > 72) continue;
    if (v.kind === "spo2" && v.value < th.spo2Below) {
      out.push({
        ruleId: "spo2-low",
        ruleVersion: RULES_VERSION,
        dedupeKey: `spo2-low:${crewUid}:${day(v.measuredAt)}`,
        severity: "urgent",
        title: "SpO₂ below configured value",
        observed: `${v.value}%`,
        source: `${v.source} observation`,
        observedAt: v.measuredAt,
        reason: `Observation is below the mission-configured threshold of ${th.spo2Below}% (illustrative default).`,
        dataState: freshness(v.measuredAt, now),
        recommendedAction: "Repeat the measurement and contact the crew member per mission medical procedure.",
        operational: true,
      });
    }
    if (v.kind === "temperature" && v.value > th.temperatureAboveC) {
      out.push({
        ruleId: "temperature-high",
        ruleVersion: RULES_VERSION,
        dedupeKey: `temperature-high:${crewUid}:${day(v.measuredAt)}`,
        severity: "attention",
        title: "Temperature above configured value",
        observed: `${v.value.toFixed(1)} °C`,
        source: `${v.source} observation`,
        observedAt: v.measuredAt,
        reason: `Observation is above the mission-configured threshold of ${th.temperatureAboveC} °C (illustrative default).`,
        dataState: freshness(v.measuredAt, now),
        recommendedAction: "Repeat measurement; review symptoms with the crew member.",
        operational: false,
      });
    }
  }

  // 4. Sleep deficit.
  const recentSleep = [...input.sleep].sort((a, b) => b.end.localeCompare(a.end)).slice(0, 3);
  if (recentSleep.length === 3) {
    const avgH = recentSleep.reduce((s, x) => s + x.durationMin, 0) / 3 / 60;
    if (avgH < th.minSleepHours) {
      out.push({
        ruleId: "sleep-deficit",
        ruleVersion: RULES_VERSION,
        dedupeKey: `sleep-deficit:${crewUid}:${day(recentSleep[0].end)}`,
        severity: "attention",
        title: "Short sleep over the last 3 nights",
        observed: `${avgH.toFixed(1)} h average`,
        source: "Sleep logs",
        observedAt: recentSleep[0].end,
        reason: `3-night average is below the configured ${th.minSleepHours} h (illustrative default).`,
        dataState: freshness(recentSleep[0].end, now),
        recommendedAction: "Review schedule and workload; discuss sleep opportunity with the crew member.",
        operational: true,
      });
    }
  }

  // 5. Missed check-ins (missing data, explicitly not a health conclusion).
  const lastCheckIn = [...input.checkIns].sort((a, b) => b.at.localeCompare(a.at))[0];
  const gapDays = lastCheckIn ? hoursSince(lastCheckIn.at, now) / 24 : Infinity;
  if (gapDays >= th.missedCheckInDays) {
    out.push({
      ruleId: "missed-check-in",
      ruleVersion: RULES_VERSION,
      dedupeKey: `missed-check-in:${crewUid}:${day(now.toISOString())}`,
      severity: "info",
      title: "Check-ins missing",
      observed: lastCheckIn ? `Last check-in ${Math.floor(gapDays)} days ago` : "No check-ins recorded",
      source: "Daily check-ins",
      observedAt: lastCheckIn?.at ?? now.toISOString(),
      reason: `No check-in for ≥ ${th.missedCheckInDays} days. This is a data gap, not a health finding.`,
      dataState: "missing",
      recommendedAction: "Send a friendly check-in reminder.",
      operational: true,
    });
  }

  // 6. Sustained self-reported stress (medical-only; never shown to commanders).
  const recentCheckIns = [...input.checkIns].sort((a, b) => b.at.localeCompare(a.at)).slice(0, th.sustainedStressCount);
  if (recentCheckIns.length === th.sustainedStressCount && recentCheckIns.every((c) => c.stress !== null && c.stress >= 4)) {
    out.push({
      ruleId: "sustained-stress",
      ruleVersion: RULES_VERSION,
      dedupeKey: `sustained-stress:${crewUid}:${day(recentCheckIns[0].at)}`,
      severity: "attention",
      title: "Sustained high self-reported stress",
      observed: `Stress ≥ 4/5 in last ${th.sustainedStressCount} check-ins`,
      source: "Daily check-ins (self-report)",
      observedAt: recentCheckIns[0].at,
      reason: "Self-reported values only. No inference about mental health is made.",
      dataState: freshness(recentCheckIns[0].at, now),
      recommendedAction: "Offer a private support conversation.",
      operational: false,
    });
  }

  // 7. Symptom reports requesting review.
  for (const s of input.symptoms) {
    if (!s.requestReview || s.status === "resolved") continue;
    out.push({
      ruleId: "symptom-review",
      ruleVersion: RULES_VERSION,
      dedupeKey: `symptom-review:${crewUid}:${s.id}`,
      severity: s.severity === "severe" ? "urgent" : "attention",
      title: `Symptom review requested: ${s.symptomType}`,
      observed: `${s.bodyArea} · ${s.severity} · ${s.duration}`,
      source: "Symptom report (self-report)",
      observedAt: s.createdAt,
      reason: "Crew member explicitly requested medical review.",
      dataState: "fresh",
      recommendedAction: "Acknowledge and review the report; contact the crew member.",
      operational: s.severity === "severe",
    });
  }

  // 8. Follow-up requested in a recent check-in.
  for (const c of input.checkIns) {
    if (!c.wantsFollowUp || hoursSince(c.at, now) > 72) continue;
    out.push({
      ruleId: "follow-up-requested",
      ruleVersion: RULES_VERSION,
      dedupeKey: `follow-up-requested:${crewUid}:${c.id}`,
      severity: "attention",
      title: "Follow-up requested in check-in",
      observed: "Crew member asked for medical follow-up",
      source: "Daily check-in",
      observedAt: c.at,
      reason: "Explicit request by the crew member.",
      dataState: freshness(c.at, now),
      recommendedAction: "Contact the crew member to arrange follow-up.",
      operational: false,
    });
  }

  return out;
}
