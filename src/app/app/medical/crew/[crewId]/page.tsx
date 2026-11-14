import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { assignedCrewMember } from "@/lib/medical/context";
import { getSettings, listMissionDocs, listPersonal } from "@/lib/data/repo";
import { filterMoodForViewer, toSubject } from "@/lib/permissions/server";
import { toActor } from "@/lib/auth/current-user";
import { computeDrift } from "@/lib/health/baseline";
import { dailySeries, meanOf } from "@/lib/health/series";
import { VITAL_META } from "@/lib/health/vitals";
import { fmtDateTime, scaleLabel } from "@/lib/utils";
import { carePlanForm, clinicalNoteForm, exercisePlanForm, medicationForm, symptomStatusForm } from "@/lib/actions/forms";
import { getMissionDoc } from "@/lib/data/repo";
import { weeklyBalance } from "@/lib/exercise/balance";
import { analyseFood } from "@/lib/food/fatigue";
import { MENU } from "@/lib/content/menu";
import { ExerciseBalance } from "@/components/crew/exercise-balance";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge, OriginBadge, SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { PhysioStateCard } from "@/components/crew/physio-state-card";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Crew detail" };

const TABS = [
  ["overview", "Overview"],
  ["symptoms", "Symptoms"],
  ["care", "Care & medication"],
  ["notes", "Clinical notes"],
] as const;

export default async function CrewDetail({ params, searchParams }: PageProps<"/app/medical/crew/[crewId]">) {
  const { crewId } = await params;
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" ? sp.tab : "overview") as (typeof TABS)[number][0];
  // Viewing identifiable records is audited.
  const { user, subject, tz } = await assignedCrewMember(crewId, { auditAction: "record.view" });
  const settings = await getSettings();
  const th = settings.thresholds;
  const [exPlan, foodRatings, acts8] = await Promise.all([getMissionDoc(user.missionId!, "exercisePlans", crewId), listPersonal(crewId, "foodRatings", { sinceDays: 30 }), listPersonal(crewId, "activityLogs", { sinceDays: 8 })]);
  const food = analyseFood(foodRatings, MENU.map((m) => m.name), new Date());
  const [vitals, sleep, checkIns, moodsAll, symptoms, meds, notes, wearables, alerts, plans] = await Promise.all([
    listPersonal(crewId, "vitals", { sinceDays: 30 }),
    listPersonal(crewId, "sleepLogs", { sinceDays: 30 }),
    listPersonal(crewId, "checkIns", { sinceDays: 30 }),
    listPersonal(crewId, "moodLogs", { sinceDays: 30 }),
    listPersonal(crewId, "symptomReports", { limit: 30 }),
    listPersonal(crewId, "medications"),
    listPersonal(crewId, "clinicalNotes", { limit: 50 }),
    listPersonal(crewId, "wearableSessions", { limit: 6 }),
    listMissionDocs(user.missionId!, "alerts", { where: [["crewUid", "==", crewId]], orderBy: { field: "createdAt", dir: "desc" } }),
    listMissionDocs(user.missionId!, "carePlans", { where: [["crewUid", "==", crewId]] }),
  ]);
  // Mood entries are only visible when the crew member chose to share them; journals never.
  const moods = filterMoodForViewer(toActor(user), toSubject(subject), moodsAll);
  const demo = subject.isDemo;
  const valid = vitals.filter((v) => v.quality === "valid");
  const drift = computeDrift(valid.filter((v) => v.kind === "heart_rate").map((v) => ({ t: v.measuredAt, v: v.value })), { windowDays: th.baselineWindowDays, minObs: th.baselineMinObservations, zThreshold: th.hrDriftZ, now: new Date(), unit: "bpm", label: "resting heart rate" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${subject.callSign} · ${subject.displayName}`}
        description="Assigned crew member. Your view of this record is logged in the audit trail."
        crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Crew", href: "/app/medical/crew" }, { label: subject.callSign ?? subject.displayName }]}
        badges={demo ? <DemoBadge /> : undefined}
        actions={
          <ButtonLink href={`/app/medical/crew/${crewId}/handover`} variant="secondary">
            <FileText aria-hidden className="h-4 w-4" /> Handover summary
          </ButtonLink>
        }
      />
      <nav aria-label="Sections" className="inline-flex flex-wrap gap-1 rounded-full bg-surface p-1 shadow-[var(--shadow-card)]">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm ${tab === k ? "hero-gradient font-semibold text-white" : "text-muted hover:text-primary"}`}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Open alerts" action={<Link href="/app/medical/alerts" className="text-xs font-semibold text-primary">Alert centre</Link>} />
            <CardBody className="space-y-2">
              {alerts.filter((a) => a.status !== "resolved").length === 0 ? <p className="text-sm text-muted">None open.</p> : null}
              {alerts
                .filter((a) => a.status !== "resolved")
                .map((a) => (
                  <div key={a.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{a.title}</strong>
                      <SeverityBadge severity={a.severity} />
                    </div>
                    <p className="text-xs text-muted">{a.reason}</p>
                  </div>
                ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Baseline drift — heart rate" description={`Window ${th.baselineWindowDays} d · min ${th.baselineMinObservations} obs · threshold ${th.hrDriftZ} SD (configurable)`} />
            <CardBody className="space-y-2 text-sm">
              {drift.confidence === "insufficient" ? <Badge>Insufficient data</Badge> : drift.flagged ? <Badge tone="warn">Flagged</Badge> : <Badge tone="ok">Within baseline</Badge>}
              <p className="text-muted">{drift.explanation}</p>
              <p className="text-xs text-muted">Confidence: {drift.confidence} · n={drift.baseline.n}</p>
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Trends (30 days)" />
            <CardBody className="grid gap-8 md:grid-cols-2">
              <TrendChart title="Resting heart rate" unit="bpm" data={dailySeries(valid.filter((v) => v.kind === "heart_rate"), (v) => v.measuredAt, 30, { v: meanOf((v) => v.value) }, tz)} series={[{ key: "v", label: "HR", color: CHART_COLORS.violet, type: "area", unit: "bpm" }]} demo={demo} />
              <TrendChart title="Sleep" unit="h" data={dailySeries(sleep, (s) => s.end, 30, { v: meanOf((s) => s.durationMin / 60) }, tz)} series={[{ key: "v", label: "Sleep", color: CHART_COLORS.violet, type: "bar", unit: "h" }]} demo={demo} />
              <TrendChart
                title="SpO₂ & EDA (sweat)"
                unit="%"
                rightUnit="µS"
                data={dailySeries(valid, (v) => v.measuredAt, 30, { spo2: meanOf((v) => (v.kind === "spo2" ? v.value : null)), eda: meanOf((v) => (v.kind === "eda" ? v.value : null)) }, tz)}
                series={[
                  { key: "spo2", label: "SpO₂", color: CHART_COLORS.teal, unit: "%" },
                  { key: "eda", label: "EDA", color: CHART_COLORS.amber, axis: "right", unit: "µS" },
                ]}
                demo={demo}
              />
              <TrendChart
                title="Self-reported fatigue & stress (check-ins)"
                unit="/5"
                yDomain={[1, 5]}
                data={dailySeries(checkIns, (c) => c.at, 30, { fatigue: meanOf((c) => c.fatigue), stress: meanOf((c) => c.stress) }, tz)}
                series={[
                  { key: "fatigue", label: "Fatigue", color: CHART_COLORS.violet, unit: "/5" },
                  { key: "stress", label: "Stress", color: CHART_COLORS.coral, unit: "/5" },
                ]}
                demo={demo}
              />
            </CardBody>
          </Card>
          <PhysioStateCard sessions={wearables} tz={tz} />
          <Card>
            <CardHeader title="Shared mood entries" description={`${moods.length} of ${moodsAll.length} entries shared by the crew member · journal is never visible`} />
            <CardBody className="space-y-2 text-sm">
              {moods.slice(0, 6).map((m) => (
                <div key={m.id} className="flex justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2">
                  <span>
                    Mood {scaleLabel("mood", m.mood).toLowerCase()}, stress {scaleLabel("stress", m.stress).toLowerCase()}
                  </span>
                  <span className="text-xs text-muted">{fmtDateTime(m.at, tz)}</span>
                </div>
              ))}
              {moods.length === 0 ? <p className="text-muted">No shared entries.</p> : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Appetite & menu fatigue" description="From the crew member's meal ratings (Menu Fatigue Radar)" />
            <CardBody className="space-y-2 text-sm">
              <p>
                Meals finished: <strong>{food.finishedRecent === null ? "—" : `${Math.round(food.finishedRecent * 100)}%`}</strong> this week vs{" "}
                {food.finishedBefore === null ? "—" : `${Math.round(food.finishedBefore * 100)}%`} last week {food.appetiteDropping ? <Badge tone="warn">Dipping</Badge> : null}
              </p>
              {food.rest.length ? <p className="text-muted">Tiring of: {food.rest.map((r) => r.item).join(", ")}</p> : <p className="text-muted">No menu fatigue detected.</p>}
            </CardBody>
          </Card>
          <ExerciseBalance balance={exPlan ? weeklyBalance(acts8, exPlan, new Date()) : null} slots={[]} setBy={exPlan?.setByName ?? null} tz={tz} />
          <Card className="lg:col-span-2">
            <CardHeader title="Latest vitals" />
            <CardBody>
              <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(VITAL_META) as (keyof typeof VITAL_META)[]).map((k) => {
                  const v = vitals.find((x) => x.kind === k);
                  return (
                    <li key={k} className="rounded-2xl bg-surface-2 px-3 py-2">
                      <span className="text-xs text-muted">{VITAL_META[k].label}</span>
                      <span className="block font-semibold">{v ? `${k === "blood_pressure" ? `${v.value}/${v.value2}` : v.value} ${v.unit}` : "—"}</span>
                      <span className="text-[11px] text-muted">{v ? `${v.source} · ${fmtDateTime(v.measuredAt, tz)}${v.quality !== "valid" ? ` · ${v.quality}` : ""}` : "no data"}</span>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "symptoms" ? (
        <div className="space-y-4">
          {symptoms.length === 0 ? <p className="text-sm text-muted">No symptom reports.</p> : null}
          {symptoms.map((r) => (
            <Card key={r.id}>
              <CardHeader title={`${r.symptomType} · ${r.bodyArea}`} description={`${r.severity} · onset ${fmtDateTime(r.onset, tz)} · ${r.duration}`} action={<StatusBadge status={r.status} />} />
              <CardBody className="space-y-3 text-sm">
                <p className="rounded-2xl bg-surface-2 p-3">“{r.description}”</p>
                {r.associated.length ? <p className="text-xs text-muted">Associated: {r.associated.join(", ")}</p> : null}
                <ul className="space-y-1 border-l-2 border-line pl-3 text-xs text-muted">
                  {r.history.map((h, i) => (
                    <li key={i}>
                      {fmtDateTime(h.at, tz)} · <strong className="text-fg">{h.action}</strong> — {h.byName}
                      {h.note ? `: ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
                <ActionForm action={symptomStatusForm.bind(null, crewId, r.id)} submitLabel="Add status update" className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
                  <Field label="New status" htmlFor={`st-${r.id}`}>
                    <Select id={`st-${r.id}`} name="status" defaultValue="in_review">
                      <option value="acknowledged">Acknowledged</option>
                      <option value="in_review">In review</option>
                      <option value="follow_up_requested">Follow-up requested</option>
                      <option value="resolved">Resolved</option>
                    </Select>
                  </Field>
                  <Field label="Note (appended, attributed)" optional htmlFor={`nt-${r.id}`}>
                    <Input id={`nt-${r.id}`} name="note" maxLength={500} />
                  </Field>
                </ActionForm>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "care" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Medication plan" description="Entered by authorised clinicians only. Doses are never generated." />
            <CardBody className="space-y-3">
              {meds.map((m) => (
                <div key={m.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
                  <strong>{m.name}</strong> <OriginBadge origin={m.origin} />
                  <p className="text-xs text-muted">
                    {m.dose} · {m.schedule}
                  </p>
                </div>
              ))}
              <ActionForm action={medicationForm.bind(null, crewId)} submitLabel="Add medication">
                <Field label="Medication" htmlFor="md-name">
                  <Input id="md-name" name="name" required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Dose (as prescribed)" htmlFor="md-dose">
                    <Input id="md-dose" name="dose" required />
                  </Field>
                  <Field label="Schedule" htmlFor="md-sched">
                    <Input id="md-sched" name="schedule" required />
                  </Field>
                </div>
                <Field label="Instructions" optional htmlFor="md-ins">
                  <Input id="md-ins" name="instructions" />
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Weekly exercise targets" description="Drives the crew member's Exercise balance rings." />
            <CardBody>
              <ActionForm action={exercisePlanForm.bind(null, crewId)} resetOnSuccess={false} submitLabel="Save targets" className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Strength (min/week)" htmlFor="ex-r">
                    <Input id="ex-r" name="resistance" type="number" min={0} max={1500} defaultValue={exPlan?.resistanceMinPerWeek ?? 300} />
                  </Field>
                  <Field label="Cardio (min/week)" htmlFor="ex-a">
                    <Input id="ex-a" name="aerobic" type="number" min={0} max={1500} defaultValue={exPlan?.aerobicMinPerWeek ?? 180} />
                  </Field>
                  <Field label="Stretch (min/week)" htmlFor="ex-m">
                    <Input id="ex-m" name="mobility" type="number" min={0} max={1500} defaultValue={exPlan?.mobilityMinPerWeek ?? 60} />
                  </Field>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Care plans" />
            <CardBody className="space-y-3">
              {plans.map((p) => (
                <div key={p.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
                  <div className="flex justify-between">
                    <strong>{p.title}</strong>
                    <StatusBadge status={p.status} />
                  </div>
                  <ul className="mt-1 text-xs text-muted">
                    {p.tasks.map((t) => (
                      <li key={t.id}>
                        {t.doneAt ? "✓" : "○"} {t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <ActionForm action={carePlanForm.bind(null, crewId)} submitLabel="Create care plan">
                <Field label="Plan title" htmlFor="cp-title">
                  <Input id="cp-title" name="title" required />
                </Field>
                <Field label="Tasks (one per line)" htmlFor="cp-tasks">
                  <Textarea id="cp-tasks" name="tasks" required />
                </Field>
                <Field label="Due date for tasks" optional htmlFor="cp-due">
                  <Input id="cp-due" name="due" type="date" />
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === "notes" ? (
        <Card>
          <CardHeader title="Clinical notes" description="Append-only. To correct a note, add a new note referencing it." />
          <CardBody className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-2xl bg-surface-2 p-3 text-sm">
                <p className="whitespace-pre-line">{n.text}</p>
                <p className="mt-1 text-xs text-muted">
                  {n.authorName} · {fmtDateTime(n.createdAt, tz)}
                  {n.correctsNoteId ? ` · corrects note ${n.correctsNoteId}` : ""} · id {n.id}
                </p>
              </div>
            ))}
            <ActionForm action={clinicalNoteForm.bind(null, crewId)} submitLabel="Add note">
              <Field label="New note" htmlFor="cn-text">
                <Textarea id="cn-text" name="text" required maxLength={4000} />
              </Field>
              <Field label="Corrects note id" optional htmlFor="cn-cor">
                <Select id="cn-cor" name="corrects" defaultValue="">
                  <option value="">— not a correction —</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} ({fmtDateTime(n.createdAt, tz)})
                    </option>
                  ))}
                </Select>
              </Field>
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
