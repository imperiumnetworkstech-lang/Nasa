import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { getSettings, listMissionDocs } from "@/lib/data/repo";
import { acknowledgeMessage, toggleCarePlanTask } from "@/lib/actions/crew";
import { consultationForm, crewMessageForm } from "@/lib/actions/forms";
import { deliveryState, DELIVERY_LABEL } from "@/lib/messages";
import { fmtDateTime, requestTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, Progress, ViewAll } from "@/components/ui/card";
import { Badge, OriginBadge, StatusBadge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/action-ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "My plan" };

export default async function MyPlanPage() {
  const { user, tz } = await crewContext();
  const settings = await getSettings();
  const [plans, consults, messages] = user.missionId
    ? await Promise.all([
        listMissionDocs(user.missionId, "carePlans", { where: [["crewUid", "==", user.uid]] }),
        listMissionDocs(user.missionId, "consultations", { where: [["crewUid", "==", user.uid]], orderBy: { field: "createdAt", dir: "desc" } }),
        listMissionDocs(user.missionId, "messages", { where: [["threadId", "==", user.uid]], orderBy: { field: "createdAt", dir: "asc" } }),
      ])
    : [[], [], []];
  const now = requestTime();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="My plan" description="Care-plan tasks from your medical team, consultations and messages." crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "My plan" }]} />
      {!user.missionId ? <EmptyState title="No mission assigned" body="Care plans and consultations become available once an administrator assigns you to a mission." /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {plans.length === 0 && user.missionId ? <EmptyState title="No care plans" body="Your medical team hasn't created a plan for you." /> : null}
          {plans.map((p) => {
            const done = p.tasks.filter((t) => t.doneAt).length;
            return (
              <Card key={p.id}>
                <CardHeader title={p.title} description={`From ${p.createdByName} · ${done}/${p.tasks.length} done`} action={<StatusBadge status={p.status} />} />
                <CardBody className="space-y-3">
                  <Progress value={(done / p.tasks.length) * 100} label={`${p.title} progress`} />
                  <ul className="space-y-2">
                    {p.tasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                        <span className="flex items-center gap-2">
                          {t.doneAt ? <CheckCircle2 aria-hidden className="h-5 w-5 text-ok" /> : <Circle aria-hidden className="h-5 w-5 text-muted" />}
                          <span>
                            <span className={t.doneAt ? "text-muted line-through" : ""}>{t.title}</span>
                            {t.due ? <span className="block text-xs text-muted">Due {fmtDateTime(t.due, tz)}</span> : null}
                          </span>
                        </span>
                        <ActionButton action={toggleCarePlanTask.bind(null, p.id, t.id)} variant={t.doneAt ? "outline" : "secondary"}>
                          {t.doneAt ? "Undo" : "Done"}
                        </ActionButton>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })}

          <Card id="consult">
            <CardHeader title="Request a consultation" description="Non-urgent. For urgent issues use your mission's emergency procedure." />
            <CardBody className="space-y-4">
              <ActionForm action={consultationForm} submitLabel="Send request">
                <Field label="What would you like to discuss?" htmlFor="c-reason">
                  <Textarea id="c-reason" name="reason" required minLength={3} maxLength={500} />
                </Field>
                <Field label="Preferred time" htmlFor="c-window">
                  <Input id="c-window" name="window" required placeholder="e.g. next comm pass, after exercise" />
                </Field>
              </ActionForm>
              {consults.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                  <span>
                    {c.reason}
                    <span className="block text-xs text-muted">{c.scheduledFor ? `Scheduled ${fmtDateTime(c.scheduledFor, tz)}` : `Requested ${fmtDateTime(c.createdAt, tz)}`}</span>
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <Card id="messages" className="self-start">
          <CardHeader title="Care-team messages" description={settings.commDelaySeconds ? `Simulated comm delay: ${Math.round(settings.commDelaySeconds / 60)} min one-way` : "No communication delay configured"} action={<ViewAll href="/app/library">Offline library</ViewAll>} />
          <CardBody className="space-y-3">
            {messages.length === 0 ? <p className="text-sm text-muted">No messages yet.</p> : null}
            {messages.map((m) => {
              const mine = m.fromUid === user.uid;
              const state = deliveryState(m, now);
              const visible = mine || state !== "sent"; // incoming messages appear only after the delay
              if (!visible) return null;
              return (
                <div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "hero-gradient ml-auto text-white" : "bg-surface-2"}`}>
                  <p>{m.body}</p>
                  <p className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${mine ? "text-white/80" : "text-muted"}`}>
                    {m.fromName} · {fmtDateTime(m.createdAt, tz)} {mine ? `· ${DELIVERY_LABEL[state]}` : null}
                    {m.origin === "simulated" ? <OriginBadge origin="simulated" /> : null}
                  </p>
                  {!mine && state === "received" ? (
                    <div className="mt-2">
                      <ActionButton action={acknowledgeMessage.bind(null, m.id)} variant="outline">
                        Acknowledge
                      </ActionButton>
                    </div>
                  ) : !mine && state === "acknowledged" ? (
                    <Badge tone="ok" className="mt-1">
                      Acknowledged
                    </Badge>
                  ) : null}
                </div>
              );
            })}
            {user.missionId ? (
              <ActionForm action={crewMessageForm} submitLabel="Send message">
                <Field label="Message to care team" htmlFor="msg-body" help="Not an emergency channel. Messages are never queued offline.">
                  <Textarea id="msg-body" name="body" required maxLength={2000} />
                </Field>
                <Field label="Priority" htmlFor="msg-pri">
                  <Select id="msg-pri" name="priority" defaultValue="routine">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent (still not an emergency channel)</option>
                  </Select>
                </Field>
              </ActionForm>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
