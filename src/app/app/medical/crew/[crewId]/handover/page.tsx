import type { Metadata } from "next";
import Link from "next/link";
import { assignedCrewMember } from "@/lib/medical/context";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { average } from "@/lib/health/baseline";
import { VITAL_META } from "@/lib/health/vitals";
import { fmtDateTime, requestTime } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";
import { Callout } from "@/components/ui/misc";
import type { VitalKind } from "@/lib/types";

export const metadata: Metadata = { title: "Medical handover summary" };

/** Concise, printable handover. Generating it is audited as an export. */
export default async function Handover({ params, searchParams }: PageProps<"/app/medical/crew/[crewId]/handover">) {
  const { crewId } = await params;
  const sp = await searchParams;
  const days = [7, 14, 30].includes(Number(sp.days)) ? Number(sp.days) : 7;
  const { user, subject, tz } = await assignedCrewMember(crewId, { auditAction: "handover.export" });
  const [vitals, sleep, checkIns, symptoms, meds, medLogs, alerts, plans] = await Promise.all([
    listPersonal(crewId, "vitals", { sinceDays: days }),
    listPersonal(crewId, "sleepLogs", { sinceDays: days }),
    listPersonal(crewId, "checkIns", { sinceDays: days }),
    listPersonal(crewId, "symptomReports", { limit: 50 }),
    listPersonal(crewId, "medications"),
    listPersonal(crewId, "medicationLogs", { sinceDays: days }),
    listMissionDocs(user.missionId!, "alerts", { where: [["crewUid", "==", crewId]] }),
    listMissionDocs(user.missionId!, "carePlans", { where: [["crewUid", "==", crewId]] }),
  ]);
  const since = requestTime() - days * 86_400_000;
  const kinds: VitalKind[] = ["heart_rate", "spo2", "temperature", "eda", "skin_temp", "resp_rate", "hrv"];
  const caveats: string[] = [];
  const expectedCheckIns = days;
  if (checkIns.length < expectedCheckIns * 0.8) caveats.push(`Only ${checkIns.length} check-ins in ${days} days.`);
  if (sleep.length < days * 0.8) caveats.push(`Sleep logged on ${sleep.length} of ${days} nights.`);
  if (vitals.some((v) => v.quality !== "valid")) caveats.push(`${vitals.filter((v) => v.quality !== "valid").length} vital reading(s) flagged for quality and excluded from averages.`);
  if (subject.isDemo) caveats.push("All data for this crew member is synthetic demo data.");
  const activeSymptoms = symptoms.filter((s) => s.status !== "resolved");
  const periodAlerts = alerts.filter((a) => Date.parse(a.createdAt) >= since || a.status !== "resolved");

  return (
    <article className="mx-auto max-w-3xl space-y-6 rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-card)] print:shadow-none sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Medical handover summary</p>
          <h1 className="text-2xl font-bold">
            {subject.callSign} · {subject.displayName}
          </h1>
          <p className="text-sm text-muted">
            Period: last {days} days · Generated {fmtDateTime(new Date().toISOString(), tz)} by {user.displayName}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {[7, 14, 30].map((d) => (
            <Link key={d} href={`?days=${d}`} className={`rounded-full px-3 py-1.5 text-sm ${d === days ? "hero-gradient text-white" : "bg-surface-2"}`}>
              {d} d
            </Link>
          ))}
          <PrintButton />
        </div>
      </header>
      <Callout tone="warn">Not a substitute for the official medical record. Decision-support summary of recorded data only.</Callout>

      <section>
        <h2 className="mb-2 font-semibold">Observations (valid readings, period averages)</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1">Measure</th>
              <th>Average</th>
              <th>Latest</th>
              <th>n</th>
              <th>Freshness</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => {
              const vs = vitals.filter((v) => v.kind === k && v.quality === "valid");
              const avg = average(vs.map((v) => v.value));
              return (
                <tr key={k} className="border-t border-line">
                  <td className="py-1.5">{VITAL_META[k].label}</td>
                  <td>{avg !== null ? `${avg.toFixed(1)} ${VITAL_META[k].unit}` : "—"}</td>
                  <td>{vs[0] ? `${vs[0].value} ${vs[0].unit}` : "—"}</td>
                  <td>{vs.length}</td>
                  <td className="text-xs text-muted">{vs[0] ? fmtDateTime(vs[0].measuredAt, tz) : "no data"}</td>
                </tr>
              );
            })}
            <tr className="border-t border-line">
              <td className="py-1.5">Sleep</td>
              <td>{average(sleep.map((s) => s.durationMin / 60))?.toFixed(1) ?? "—"} h</td>
              <td>{sleep[0] ? `${(sleep[0].durationMin / 60).toFixed(1)} h` : "—"}</td>
              <td>{sleep.length}</td>
              <td className="text-xs text-muted">{sleep[0] ? fmtDateTime(sleep[0].end, tz) : "no data"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Active symptoms</h2>
        {activeSymptoms.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {activeSymptoms.map((s) => (
              <li key={s.id}>
                {s.symptomType} ({s.bodyArea}, {s.severity}) — {s.status.replace(/_/g, " ")}, reported {fmtDateTime(s.createdAt, tz)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">None.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Care-plan tasks</h2>
        <ul className="space-y-1 text-sm">
          {plans.flatMap((p) => p.tasks.map((t) => <li key={p.id + t.id}>{t.doneAt ? "✓" : "○"} {t.title} <span className="text-muted">({p.title})</span></li>))}
          {plans.length === 0 ? <li className="text-muted">None.</li> : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Medication adherence</h2>
        {meds.length ? (
          <ul className="space-y-1 text-sm">
            {meds.map((m) => {
              const l = medLogs.filter((x) => x.medicationId === m.id);
              return (
                <li key={m.id}>
                  {m.name} — {m.dose}, {m.schedule}: {l.filter((x) => x.status === "taken").length} taken, {l.filter((x) => x.status === "late").length} late, {l.filter((x) => x.status === "skipped").length} skipped
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No medications.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Alerts and actions taken</h2>
        <ul className="space-y-2 text-sm">
          {periodAlerts.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong> ({a.severity}, {a.status}) — {a.observed}. {a.history.slice(1).map((h) => `${h.action} by ${h.byName}`).join("; ") || "No actions yet."}
            </li>
          ))}
          {periodAlerts.length === 0 ? <li className="text-muted">None.</li> : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Missing data & caveats</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {caveats.length ? caveats.map((c) => <li key={c}>{c}</li>) : <li>No notable data gaps.</li>}
          <li>Thresholds used for alerts are configured per mission; defaults are illustrative.</li>
        </ul>
      </section>
      <footer className="border-t border-line pt-3 text-xs text-muted">Antariksha · {fmtDateTime(new Date().toISOString(), tz)} · Author: {user.displayName} · Not a substitute for the official medical record.</footer>
    </article>
  );
}
