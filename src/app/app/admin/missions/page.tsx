import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { listMembers, listMissions } from "@/lib/data/repo";
import { missionForm } from "@/lib/actions/forms";
import { fmtDateTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, IconTile } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Mission } from "@/lib/types";

export const metadata: Metadata = { title: "Missions" };

const STATUS: Record<Mission["status"], { label: string; tone: "info" | "ok" | "neutral" }> = {
  planned: { label: "Planned", tone: "info" },
  active: { label: "Active", tone: "ok" },
  completed: { label: "Finished", tone: "neutral" },
};

export default async function AdminMissions() {
  const missions = await listMissions();
  const members = await Promise.all(missions.map((m) => listMembers(m.id)));
  const day = (iso: string | null, tz: string) => (iso ? fmtDateTime(iso, tz, { dateStyle: "medium", timeStyle: undefined }) : "No end date");
  return (
    <div className="space-y-6">
      <PageHeader title="Missions" description="Create a mission, then add people to it from the People page." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {missions.length === 0 ? <EmptyState title="No missions yet" body="Create your first mission on the right." /> : null}
          {missions.map((m, i) => {
            const crew = members[i].filter((x) => x.assignment === "crew").length;
            const staff = members[i].length - crew;
            return (
              <Card key={m.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start gap-3">
                    <IconTile tone="violet">
                      <Rocket aria-hidden className="h-5 w-5" />
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {m.missionCode} · {m.name} <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge> {m.isDemo ? <DemoBadge /> : null}
                      </p>
                      <p className="text-sm text-muted">
                        {day(m.startAt, m.timezone)} → {day(m.endAt, m.timezone)} · {crew} crew · {staff} staff
                      </p>
                    </div>
                  </div>
                  {m.description ? <p className="text-sm text-muted">{m.description}</p> : null}
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-primary">Edit</summary>
                    <ActionForm action={missionForm.bind(null, m.id)} resetOnSuccess={false} submitLabel="Save changes" className="mt-3 space-y-3">
                      <MissionFields m={m} />
                    </ActionForm>
                  </details>
                </CardBody>
              </Card>
            );
          })}
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

/** Name, short code and start date up front; everything else under "More options". */
function MissionFields({ m }: { m?: Mission }) {
  const p = m?.id ?? "new";
  return (
    <>
      <Field label="Mission name" htmlFor={`${p}-name`}>
        <Input id={`${p}-name`} name="name" required minLength={3} defaultValue={m?.name} placeholder="e.g. Lunar Habitat Analog 3" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Short code" htmlFor={`${p}-code`}>
          <Input id={`${p}-code`} name="code" required minLength={2} defaultValue={m?.missionCode} placeholder="e.g. LHA-3" />
        </Field>
        <Field label="Starts" htmlFor={`${p}-start`}>
          <Input id={`${p}-start`} name="start" type="date" required defaultValue={m?.startAt.slice(0, 10)} />
        </Field>
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted">More options</summary>
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ends" optional htmlFor={`${p}-end`}>
              <Input id={`${p}-end`} name="end" type="date" defaultValue={m?.endAt?.slice(0, 10)} />
            </Field>
            <Field label="Status" htmlFor={`${p}-status`}>
              <Select id={`${p}-status`} name="status" defaultValue={m?.status ?? "planned"}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Finished</option>
              </Select>
            </Field>
          </div>
          <Field label="Time zone" htmlFor={`${p}-tz`} help="Used for mission dates. UTC is usually right.">
            <Input id={`${p}-tz`} name="tz" defaultValue={m?.timezone ?? "UTC"} />
          </Field>
          <Field label="Description" optional htmlFor={`${p}-desc`}>
            <Textarea id={`${p}-desc`} name="desc" defaultValue={m?.description} className="min-h-16" />
          </Field>
        </div>
      </details>
    </>
  );
}
