import type { Metadata } from "next";
import { listMembers, listMissions } from "@/lib/data/repo";
import { missionForm } from "@/lib/actions/forms";
import { fmtDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge, StatusBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Missions" };

export default async function AdminMissions() {
  const missions = await listMissions();
  const members = await Promise.all(missions.map((m) => listMembers(m.id)));
  return (
    <div className="space-y-6">
      <PageHeader title="Missions" description="Create missions and review assignments. Assign people from Users & invites." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {missions.map((m, i) => (
            <Card key={m.id}>
              <CardHeader title={`${m.missionCode} · ${m.name}`} description={`${fmtDateTime(m.startAt, m.timezone, { dateStyle: "medium", timeStyle: undefined })} → ${m.endAt ? fmtDateTime(m.endAt, m.timezone, { dateStyle: "medium", timeStyle: undefined }) : "open-ended"} · ${m.timezone}`} action={<span className="flex gap-1.5"><StatusBadge status={m.status === "active" ? "active" : m.status === "completed" ? "completed" : "scheduled"} />{m.isDemo ? <DemoBadge /> : null}</span>} />
              <CardBody className="space-y-3 text-sm">
                <p className="text-muted">{m.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {members[i].map((mm) => (
                    <Badge key={mm.uid} tone={mm.assignment === "crew" ? "info" : "neutral"}>
                      {mm.callSign} · {mm.assignment}
                    </Badge>
                  ))}
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-primary">Edit mission</summary>
                  <ActionForm
                    action={missionForm.bind(null, m.id)}
                    resetOnSuccess={false}
                    submitLabel="Save mission"
                    className="mt-3 space-y-3"
                  >
                    <MissionFields m={m} />
                  </ActionForm>
                </details>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="self-start">
          <CardHeader title="New mission" />
          <CardBody>
            <ActionForm action={missionForm.bind(null, null)} submitLabel="Create mission">
              <MissionFields />
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MissionFields({ m }: { m?: { id: string; name: string; missionCode: string; description: string; startAt: string; endAt: string | null; status: string; timezone: string } }) {
  const p = m?.id ?? "new";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field label="Code" htmlFor={`${p}-code`}>
          <Input id={`${p}-code`} name="code" required defaultValue={m?.missionCode} />
        </Field>
        <Field label="Name" htmlFor={`${p}-name`}>
          <Input id={`${p}-name`} name="name" required defaultValue={m?.name} />
        </Field>
      </div>
      <Field label="Description" htmlFor={`${p}-desc`}>
        <Textarea id={`${p}-desc`} name="desc" defaultValue={m?.description} className="min-h-16" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start" htmlFor={`${p}-start`}>
          <Input id={`${p}-start`} name="start" type="date" required defaultValue={m?.startAt.slice(0, 10)} />
        </Field>
        <Field label="End" optional htmlFor={`${p}-end`}>
          <Input id={`${p}-end`} name="end" type="date" defaultValue={m?.endAt?.slice(0, 10)} />
        </Field>
        <Field label="Status" htmlFor={`${p}-status`}>
          <Select id={`${p}-status`} name="status" defaultValue={m?.status ?? "planned"}>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label="Timezone" htmlFor={`${p}-tz`}>
          <Input id={`${p}-tz`} name="tz" required defaultValue={m?.timezone ?? "UTC"} />
        </Field>
      </div>
    </>
  );
}
