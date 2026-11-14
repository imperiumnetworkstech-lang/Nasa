import type { Metadata } from "next";
import { BellRing, ClipboardCheck, Stethoscope, Users } from "lucide-react";
import { medicalContext } from "@/lib/medical/context";
import { crewSnapshots } from "@/lib/medical/summary";
import { listMissionDocs } from "@/lib/data/repo";
import { missionDay } from "@/lib/utils";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, ViewAll } from "@/components/ui/card";
import { DemoBadge, SeverityBadge } from "@/components/ui/badge";
import { CrewCard } from "@/components/medical/crew-card";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import Link from "next/link";
import { ActionButton } from "@/components/action-ui";
import { alertAction } from "@/lib/actions/medical";

export const metadata: Metadata = { title: "Medical dashboard" };

export default async function MedicalDashboard() {
  const { user, mission, crew } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" body="An administrator must assign you to a mission before crew records are visible." />;
  const alerts = await listMissionDocs(mission.id, "alerts", { orderBy: { field: "createdAt", dir: "desc" } });
  const snaps = await crewSnapshots(crew, alerts);
  const open = alerts.filter((a) => a.status !== "resolved");
  const checkedIn = snaps.filter((s) => s.checkedInToday).length;
  const dist = (["urgent", "attention", "info"] as const).map((sev) => ({
    label: sev === "attention" ? "Needs attention" : sev[0].toUpperCase() + sev.slice(1),
    open: alerts.filter((a) => a.severity === sev && a.status === "open").length,
    inProgress: alerts.filter((a) => a.severity === sev && ["acknowledged", "assigned", "escalated"].includes(a.status)).length,
    resolved: alerts.filter((a) => a.severity === sev && a.status === "resolved").length,
  }));
  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${user.displayName.split(" ").slice(-1)[0]}! 👋`} description={`${mission.missionCode} · Mission day ${missionDay(mission.startAt)} · ${crew.length} crew assigned to you`} badges={mission.isDemo ? <DemoBadge /> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" icon={<Users aria-hidden className="h-5 w-5" />} label="Assigned crew" value={crew.length} />
        <Stat tone="pink" icon={<BellRing aria-hidden className="h-5 w-5" />} label="Open alerts" value={open.length} hint={`${open.filter((a) => a.severity === "urgent").length} urgent`} />
        <Stat tone="teal" icon={<ClipboardCheck aria-hidden className="h-5 w-5" />} label="Checked in today" value={`${checkedIn}/${crew.length}`} />
        <Stat tone="amber" icon={<Stethoscope aria-hidden className="h-5 w-5" />} label="Open symptom reports" value={snaps.reduce((s, x) => s + x.openSymptoms, 0)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Your crew" action={<ViewAll href="/app/medical/crew" />} />
          <CardBody className="space-y-3">
            {snaps.map((s) => (
              <CrewCard key={s.member.uid} s={s} />
            ))}
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Needs review" action={<ViewAll href="/app/medical/alerts" />} />
            <CardBody className="space-y-2">
              {open.length === 0 ? <p className="text-sm text-muted">No open alerts.</p> : null}
              {open.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                  <Link href={`/app/medical/alerts#${a.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="flex items-center gap-2">
                      <strong className="truncate">{a.crewLabel}: {a.title}</strong>
                    </span>
                    <span className="block truncate text-xs text-muted">{a.observed}</span>
                  </Link>
                  <SeverityBadge severity={a.severity} />
                  {a.status === "open" ? (
                    <ActionButton action={alertAction.bind(null, { alertId: a.id, action: "acknowledge" })} variant="primary" successTitle="Acknowledged">
                      OK
                    </ActionButton>
                  ) : null}
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Alerts by severity & status" />
            <CardBody>
              <TrendChart
                title="Alert count"
                unit="alerts"
                data={dist}
                series={[
                  { key: "open", label: "Open", color: CHART_COLORS.coral, type: "bar" },
                  { key: "inProgress", label: "In progress", color: CHART_COLORS.amber, type: "bar" },
                  { key: "resolved", label: "Resolved", color: CHART_COLORS.teal, type: "bar" },
                ]}
                demo={mission.isDemo}
                height={200}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
