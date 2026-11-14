import type { Metadata } from "next";
import { Pill } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { fmtDateTime } from "@/lib/utils";
import { Callout, EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, Progress } from "@/components/ui/card";
import { Badge, OriginBadge } from "@/components/ui/badge";
import { MedicationLogButtons } from "@/components/crew/forms";

export const metadata: Metadata = { title: "Medications" };

export default async function MedicationsPage() {
  const { user, tz } = await crewContext();
  const [meds, logs] = await Promise.all([listPersonal(user.uid, "medications"), listPersonal(user.uid, "medicationLogs", { sinceDays: 14 })]);
  const active = meds.filter((m) => m.active);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Medications" description="Your plan as entered by your medical team, and your adherence log." crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Medications" }]} />
      <Callout tone="info">Antariksha never suggests medications or doses and never tells you to start or stop one. Ask your flight surgeon about any change.</Callout>
      {user.allergies ? (
        <Callout tone="warn" title="Recorded allergies">
          {user.allergies}
        </Callout>
      ) : null}
      {active.length === 0 ? <EmptyState icon={<Pill className="h-5 w-5" />} title="No active medications" body="Medications added by your medical team will appear here." /> : null}
      {active.map((m) => {
        const mine = logs.filter((l) => l.medicationId === m.id);
        const taken = mine.filter((l) => l.status !== "skipped").length;
        return (
          <Card key={m.id}>
            <CardHeader
              icon={<Pill className="h-4 w-4" />}
              title={m.name}
              description={`${m.dose} · ${m.schedule}`}
              action={<OriginBadge origin={m.origin} />}
            />
            <CardBody className="space-y-4">
              {m.instructions ? <p className="text-sm text-muted">{m.instructions}</p> : null}
              <div>
                <p className="mb-1 text-xs text-muted">
                  Adherence (14 days): {taken} of {mine.length} logged doses taken
                </p>
                <Progress value={mine.length ? (taken / mine.length) * 100 : 0} tone="teal" label="Adherence" />
              </div>
              <MedicationLogButtons medicationId={m.id} />
              <ul className="flex flex-wrap gap-1.5">
                {mine.slice(0, 14).map((l) => (
                  <li key={l.id}>
                    <Badge tone={l.status === "taken" ? "ok" : l.status === "late" ? "warn" : "neutral"}>
                      {fmtDateTime(l.at, tz, { dateStyle: "short", timeStyle: undefined })} · {l.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        );
      })}
      <p className="text-xs text-muted">Medication reminders: {user.preferences.reminders.medication ? "on (in-app)" : "off"} — change in Profile.</p>
    </div>
  );
}
