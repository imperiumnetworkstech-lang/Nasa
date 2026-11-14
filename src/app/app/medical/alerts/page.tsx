import type { Metadata } from "next";
import Link from "next/link";
import { medicalContext } from "@/lib/medical/context";
import { listMembers, listMissionDocs } from "@/lib/data/repo";
import { rerunAlerts } from "@/lib/actions/medical";
import { alertForm } from "@/lib/actions/forms";
import { RULE_DEFINITIONS } from "@/lib/alerts/rules";
import { fmtDateTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, OriginBadge, SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/action-ui";
import { Field, Input, Select } from "@/components/ui/form";

export const metadata: Metadata = { title: "Alert centre" };

export default async function AlertsPage({ searchParams }: PageProps<"/app/medical/alerts">) {
  const { mission, tz } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "active";
  const [alerts, members] = await Promise.all([listMissionDocs(mission.id, "alerts", { orderBy: { field: "createdAt", dir: "desc" } }), listMembers(mission.id)]);
  const medics = members.filter((m) => m.assignment === "medical");
  const sevRank = { urgent: 0, attention: 1, info: 2 };
  const shown = alerts
    .filter((a) => (status === "active" ? a.status !== "resolved" : status === "all" ? true : a.status === status))
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert centre"
        description="Rules-based, explainable alerts. Every action is recorded in the audit log."
        crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Alerts" }]}
        actions={<ActionButton action={rerunAlerts} variant="secondary" size="md">Re-evaluate rules</ActionButton>}
      />
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {[
          ["active", "Active"],
          ["open", "Open"],
          ["acknowledged", "Acknowledged"],
          ["assigned", "Assigned"],
          ["escalated", "Escalated"],
          ["resolved", "Resolved"],
          ["all", "All"],
        ].map(([k, l]) => (
          <Link key={k} href={`?status=${k}`} className={`rounded-full px-4 py-1.5 text-sm ${status === k ? "hero-gradient text-white" : "bg-surface text-muted shadow-[var(--shadow-card)]"}`}>
            {l} ({alerts.filter((a) => (k === "active" ? a.status !== "resolved" : k === "all" ? true : a.status === k)).length})
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? <EmptyState title="No alerts here" body="Nothing matches this filter." /> : null}
      <div className="space-y-4">
        {shown.map((a) => (
          <Card key={a.id} id={a.id}>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">
                    <Link href={`/app/medical/crew/${a.crewUid}`} className="font-semibold text-primary hover:underline">
                      {a.crewLabel}
                    </Link>{" "}
                    · {fmtDateTime(a.createdAt, tz)}
                  </p>
                  <h2 className="text-base font-semibold">{a.title}</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <SeverityBadge severity={a.severity} />
                  <StatusBadge status={a.status} />
                  <OriginBadge origin={a.origin} />
                </div>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["What was observed", a.observed],
                  ["Source", a.source],
                  ["When", fmtDateTime(a.observedAt, tz)],
                  ["Why it was flagged", a.reason],
                  ["Data state", a.dataState === "fresh" ? "Fresh" : a.dataState === "stale" ? "Stale — consider a repeat measurement" : a.dataState === "missing" ? "Missing data" : "Sparse data"],
                  ["Recommended next step", a.recommendedAction],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-surface-2 p-3">
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted">
                Rule <code>{a.ruleId}</code> v{a.ruleVersion} — {RULE_DEFINITIONS.find((r) => r.id === a.ruleId)?.description} · {a.operational ? <Badge tone="info">Visible to commander as operational status</Badge> : <Badge>Medical-only</Badge>}
                {a.assignedTo ? ` · Assigned to ${medics.find((m) => m.uid === a.assignedTo)?.displayName ?? a.assignedTo}` : ""}
              </p>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-primary">Audit trail ({a.history.length})</summary>
                <ul className="mt-2 space-y-1 border-l-2 border-line pl-3 text-xs text-muted">
                  {a.history.map((h, i) => (
                    <li key={i}>
                      {fmtDateTime(h.at, tz)} · <strong className="text-fg">{h.action}</strong> — {h.byName}
                      {h.note ? `: ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
              <ActionForm
                action={alertForm.bind(null, a.id)}
                submitLabel="Apply"
                className="grid items-end gap-3 sm:grid-cols-[11rem_11rem_1fr_auto]"
              >
                <Field label="Action" htmlFor={`ac-${a.id}`}>
                  <Select id={`ac-${a.id}`} name="action" defaultValue={a.status === "open" ? "acknowledge" : "resolve"}>
                    <option value="acknowledge">Acknowledge</option>
                    <option value="assign">Assign</option>
                    <option value="escalate">Escalate</option>
                    <option value="resolve">Resolve</option>
                    <option value="reopen">Reopen</option>
                  </Select>
                </Field>
                <Field label="Assign to" htmlFor={`as-${a.id}`}>
                  <Select id={`as-${a.id}`} name="assignee" defaultValue="">
                    <option value="">Me</option>
                    {medics.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Note" optional htmlFor={`an-${a.id}`}>
                  <Input id={`an-${a.id}`} name="note" maxLength={500} />
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
