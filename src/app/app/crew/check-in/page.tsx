import type { Metadata } from "next";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CheckInForm } from "@/components/crew/forms";
import { fmtDateTime, missionDay, scaleLabel } from "@/lib/utils";
import { OriginBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Daily check-in" };

export default async function CheckInPage() {
  const { user, mission, tz } = await crewContext();
  const recent = await listPersonal(user.uid, "checkIns", { limit: 5 });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Daily check-in"
        description={`${mission ? `Mission day ${missionDay(mission.startAt)} · ` : ""}About a minute. Any question can be skipped with “Prefer not to answer”.`}
        crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Check-in" }]}
      />
      <Card>
        <CardBody>
          <CheckInForm />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Recent check-ins" />
        <CardBody className="space-y-2">
          {recent.length === 0 ? <p className="text-sm text-muted">No check-ins yet.</p> : null}
          {recent.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              <span>
                <strong>{scaleLabel("overall", c.overall)}</strong> · fatigue {scaleLabel("fatigue", c.fatigue).toLowerCase()} · stress {scaleLabel("stress", c.stress).toLowerCase()}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {fmtDateTime(c.at, tz)} <OriginBadge origin={c.origin} />
              </span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
