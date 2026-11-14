import type { Metadata } from "next";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { fmtDateTime } from "@/lib/utils";
import { EmergencyNotice, EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { OriginBadge, StatusBadge } from "@/components/ui/badge";
import { SymptomForm } from "@/components/crew/symptom-form";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Symptoms & support" };

const STEPS = ["submitted", "acknowledged", "in_review", "follow_up_requested", "resolved"];

export default async function SymptomsPage() {
  const { user, tz } = await crewContext();
  const reports = await listPersonal(user.uid, "symptomReports", { limit: 30 });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Get help"
        description="Tell your doctor how you feel. You will see every update here."
        crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Get help" }]}
        actions={<ButtonLink href="/app/crew/my-plan#consult" variant="secondary">Ask for a call</ButtonLink>}
      />
      <EmergencyNotice />
      <Card>
        <CardHeader title="How are you feeling?" description="If you are offline this will NOT be sent — you will be told." />
        <CardBody>
          <SymptomForm />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Your reports" />
        <CardBody className="space-y-3">
          {reports.length === 0 ? <EmptyState title="No reports yet" body="Anything you submit will appear here with its status." /> : null}
          {reports.map((r) => (
            <details key={r.id} className="group rounded-2xl bg-surface-2 p-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{r.symptomType}</strong> · {r.bodyArea} · {r.severity}
                  <span className="block text-xs text-muted">{fmtDateTime(r.createdAt, tz)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <OriginBadge origin={r.origin} />
                </span>
              </summary>
              <div className="mt-3 space-y-3 text-sm">
                <p>{r.description}</p>
                <ol className="flex flex-wrap gap-1 text-[11px]" aria-label="Status progress">
                  {STEPS.map((s) => (
                    <li key={s} className={`rounded-full px-2 py-0.5 ${STEPS.indexOf(s) <= STEPS.indexOf(r.status) ? "bg-primary-soft text-primary" : "bg-surface text-muted"}`}>
                      {s.replace(/_/g, " ")}
                    </li>
                  ))}
                </ol>
                <ul className="space-y-1 border-l-2 border-line pl-3 text-xs text-muted">
                  {r.history.map((h, i) => (
                    <li key={i}>
                      {fmtDateTime(h.at, tz)} · <strong className="text-fg">{h.action}</strong> by {h.byName}
                      {h.note ? ` — ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
