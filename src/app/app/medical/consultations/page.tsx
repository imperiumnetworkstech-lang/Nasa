import type { Metadata } from "next";
import { medicalContext } from "@/lib/medical/context";
import { getSettings, listMissionDocs } from "@/lib/data/repo";
import { consultationUpdateForm, medicalMessageForm } from "@/lib/actions/forms";
import { deliveryState, DELIVERY_LABEL } from "@/lib/messages";
import { fmtDateTime, requestTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Consultations" };

export default async function ConsultationsPage() {
  const { mission, crew, tz } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const [consults, messages, settings] = await Promise.all([
    listMissionDocs(mission.id, "consultations", { orderBy: { field: "createdAt", dir: "desc" } }),
    listMissionDocs(mission.id, "messages", { orderBy: { field: "createdAt", dir: "asc" } }),
    getSettings(),
  ]);
  const now = requestTime();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations & messages"
        description={settings.commDelaySeconds ? `Communication-delay mode: ${Math.round(settings.commDelaySeconds / 60)} min one-way (simulated).` : "No communication delay configured."}
        crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Consultations" }]}
      />
      <Card>
        <CardHeader title="Consultation requests" />
        <CardBody className="space-y-3">
          {consults.length === 0 ? <p className="text-sm text-muted">No requests.</p> : null}
          {consults.map((c) => (
            <div key={c.id} className="space-y-3 rounded-2xl bg-surface-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{c.crewLabel}</strong>: {c.reason}
                  <span className="block text-xs text-muted">
                    Preferred: {c.preferredWindow} · requested {fmtDateTime(c.createdAt, tz)}
                    {c.scheduledFor ? ` · scheduled ${fmtDateTime(c.scheduledFor, tz)}` : ""}
                  </span>
                </span>
                <StatusBadge status={c.status} />
              </div>
              <ActionForm action={consultationUpdateForm.bind(null, c.id)} submitLabel="Update" className="grid items-end gap-3 sm:grid-cols-[10rem_14rem_1fr_auto]">
                <Field label="Status" htmlFor={`cs-${c.id}`}>
                  <Select id={`cs-${c.id}`} name="status" defaultValue="scheduled">
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </Field>
                <Field label="When" optional htmlFor={`cw-${c.id}`}>
                  <Input id={`cw-${c.id}`} name="when" type="datetime-local" />
                </Field>
                <Field label="Note" optional htmlFor={`cn-${c.id}`}>
                  <Input id={`cn-${c.id}`} name="note" />
                </Field>
              </ActionForm>
            </div>
          ))}
        </CardBody>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {crew.map((c) => {
          const thread = messages.filter((m) => m.threadId === c.uid);
          return (
            <Card key={c.uid}>
              <CardHeader title={`Thread · ${c.callSign}`} />
              <CardBody className="space-y-2">
                {thread.length === 0 ? <p className="text-sm text-muted">No messages.</p> : null}
                {thread.slice(-4).map((m) => {
                  const st = deliveryState(m, now);
                  const fromCrew = m.fromUid === c.uid;
                  if (fromCrew && st === "sent") return <p key={m.id} className="text-xs italic text-muted">A message from {c.callSign} is in transit (comm delay).</p>;
                  return (
                    <div key={m.id} className={`rounded-2xl px-3 py-2 text-sm ${fromCrew ? "bg-surface-2" : "bg-primary-soft"}`}>
                      <p>{m.body}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        {m.fromName} · {fmtDateTime(m.createdAt, tz)}
                        {!fromCrew ? <Badge tone={st === "acknowledged" ? "ok" : st === "received" ? "info" : "warn"}>{DELIVERY_LABEL[st]}</Badge> : null}
                        {m.priority === "urgent" ? <Badge tone="danger">Urgent</Badge> : null}
                      </p>
                    </div>
                  );
                })}
                <ActionForm action={medicalMessageForm.bind(null, c.uid)} submitLabel="Send">
                  <Field label={`Message to ${c.callSign}`} htmlFor={`mm-${c.uid}`}>
                    <Textarea id={`mm-${c.uid}`} name="body" required className="min-h-16" />
                  </Field>
                </ActionForm>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
