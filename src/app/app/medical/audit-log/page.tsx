import type { Metadata } from "next";
import { medicalContext } from "@/lib/medical/context";
import { listMissionDocs } from "@/lib/data/repo";
import { fmtDateTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  const { mission, tz } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const logs = await listMissionDocs(mission.id, "auditLogs", { orderBy: { field: "at", dir: "desc" }, limit: 300 });
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Who viewed, exported or changed what. Entries contain no health content." crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Audit log" }]} />
      <Card>
        <CardBody>
          {logs.length === 0 ? <EmptyState title="No audit entries yet" /> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-2">When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="py-2 pr-3 text-xs text-muted">{fmtDateTime(l.at, tz)}</td>
                    <td className="pr-3">{l.actorName}</td>
                    <td className="pr-3">
                      <code className="rounded-lg bg-surface-2 px-1.5 py-0.5 text-xs">{l.action}</code>
                    </td>
                    <td className="pr-3 text-xs">{l.target}</td>
                    <td className="text-xs text-muted">{l.detail ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
