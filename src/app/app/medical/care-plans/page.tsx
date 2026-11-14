import type { Metadata } from "next";
import Link from "next/link";
import { medicalContext } from "@/lib/medical/context";
import { listMissionDocs } from "@/lib/data/repo";
import { carePlanForm } from "@/lib/actions/forms";
import { fmtDateTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, Progress } from "@/components/ui/card";
import { OriginBadge, StatusBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Care plans" };

export default async function CarePlansPage() {
  const { mission, crew, tz } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const plans = await listMissionDocs(mission.id, "carePlans", { orderBy: { field: "createdAt", dir: "desc" } });
  const label = (uid: string) => crew.find((c) => c.uid === uid)?.callSign ?? uid;
  return (
    <div className="space-y-6">
      <PageHeader title="Care plans" description="Tasks with due dates; crew members tick them off from their own app." crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Care plans" }]} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {plans.length === 0 ? <EmptyState title="No care plans yet" /> : null}
          {plans.map((p) => {
            const done = p.tasks.filter((t) => t.doneAt).length;
            return (
              <Card key={p.id}>
                <CardHeader title={p.title} description={<><Link className="font-semibold text-primary" href={`/app/medical/crew/${p.crewUid}?tab=care`}>{label(p.crewUid)}</Link> · by {p.createdByName} · {fmtDateTime(p.createdAt, tz)}</>} action={<span className="flex gap-1.5"><StatusBadge status={p.status} /><OriginBadge origin={p.origin} /></span>} />
                <CardBody className="space-y-3">
                  <Progress value={(done / p.tasks.length) * 100} label="Plan progress" />
                  <ul className="space-y-1 text-sm">
                    {p.tasks.map((t) => (
                      <li key={t.id} className={t.doneAt ? "text-muted line-through" : ""}>
                        {t.doneAt ? "✓" : "○"} {t.title}
                        {t.due ? <span className="text-xs text-muted"> · due {fmtDateTime(t.due, tz, { dateStyle: "medium", timeStyle: undefined })}</span> : null}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
        </div>
        <Card className="self-start">
          <CardHeader title="New care plan" />
          <CardBody>
            <ActionForm action={carePlanForm.bind(null, null)} submitLabel="Create plan">
              <Field label="Crew member" htmlFor="np-crew">
                <Select id="np-crew" name="crew" required>
                  {crew.map((c) => (
                    <option key={c.uid} value={c.uid}>
                      {c.callSign} — {c.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Title" htmlFor="np-title">
                <Input id="np-title" name="title" required />
              </Field>
              <Field label="Tasks (one per line)" htmlFor="np-tasks">
                <Textarea id="np-tasks" name="tasks" required />
              </Field>
              <Field label="Due date" optional htmlFor="np-due">
                <Input id="np-due" name="due" type="date" />
              </Field>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
