import type { Metadata } from "next";
import Link from "next/link";
import { medicalContext } from "@/lib/medical/context";
import { listMembers, listMissionDocs } from "@/lib/data/repo";
import { rerunAlerts } from "@/lib/actions/medical";
import { RULE_DEFINITIONS } from "@/lib/alerts/rules";
import { fmtDateTime, relativeTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ActionButton } from "@/components/action-ui";
import { AlertCard } from "@/components/medical/alert-card";
import { CheckCheck } from "lucide-react";

export const metadata: Metadata = { title: "Alert centre" };

const FILTERS = [
  ["active", "Needs action"],
  ["open", "New"],
  ["acknowledged", "Acknowledged"],
  ["assigned", "Assigned"],
  ["escalated", "Escalated"],
  ["resolved", "Resolved"],
  ["all", "All"],
] as const;

export default async function AlertsPage({ searchParams }: PageProps<"/app/medical/alerts">) {
  const { mission, tz } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "active";
  const [alerts, members] = await Promise.all([listMissionDocs(mission.id, "alerts", { orderBy: { field: "createdAt", dir: "desc" } }), listMembers(mission.id)]);
  const medics = members.filter((m) => m.assignment === "medical");
  const match = (k: string, s: string) => (k === "active" ? s !== "resolved" : k === "all" ? true : s === k);
  const sevRank = { urgent: 0, attention: 1, info: 2 };
  const shown = alerts.filter((a) => match(status, a.status)).sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Alert centre"
        description="Tap to respond. Every response is saved to the audit log."
        crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Alerts" }]}
        actions={
          <ActionButton action={rerunAlerts} variant="secondary" size="md">
            Check for new alerts
          </ActionButton>
        }
      />
      <nav aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map(([k, l]) => {
          const n = alerts.filter((a) => match(k, a.status)).length;
          return (
            <Link key={k} href={`?status=${k}`} scroll={false} aria-current={status === k ? "true" : undefined} className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${status === k ? "hero-gradient font-semibold text-white" : "bg-surface text-muted shadow-[var(--shadow-card)] hover:text-primary"}`}>
              {l} <span className={status === k ? "text-white/80" : "text-muted/70"}>{n}</span>
            </Link>
          );
        })}
      </nav>
      {shown.length === 0 ? <EmptyState icon={<CheckCheck className="h-5 w-5" />} title="All clear" body="Nothing here right now." /> : null}
      <div className="space-y-4">
        {shown.map((a) => (
          <AlertCard
            key={`${a.id}-${a.status}`}
            alert={a}
            tz={tz}
            ruleDescription={RULE_DEFINITIONS.find((r) => r.id === a.ruleId)?.description ?? ""}
            assigneeName={a.assignedTo ? (medics.find((m) => m.uid === a.assignedTo)?.displayName ?? a.assignedTo) : null}
            observedAtLabel={`${relativeTime(a.observedAt)} · ${fmtDateTime(a.observedAt, tz)}`}
            history={a.history.map((h) => ({ when: fmtDateTime(h.at, tz), action: h.action, by: h.byName, note: h.note }))}
          />
        ))}
      </div>
    </div>
  );
}
