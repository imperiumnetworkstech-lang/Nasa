import type { Metadata } from "next";
import { crewContext } from "@/lib/crew/context";
import { getSettings, listMissionDocs } from "@/lib/data/repo";
import { buildAttachmentPreviews, ATTACH_LABELS, type AttachKey } from "@/lib/questions/attachments";
import { earliestReply, questionStage, questionTiming } from "@/lib/questions/eta";
import { markAnswerRead } from "@/lib/actions/features";
import { fmtDateTime, requestTime } from "@/lib/utils";
import { EmergencyNotice, EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { AskForm } from "@/components/crew/ask-form";
import { QuestionTracker } from "@/components/crew/question-tracker";
import { ActionButton } from "@/components/action-ui";
import { MessageCircleQuestion } from "lucide-react";

export const metadata: Metadata = { title: "Ask the doctor" };

function mins(ms: number) {
  const m = Math.round(ms / 60_000);
  return m < 1 ? "under a minute" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

export default async function AskPage() {
  const { user, tz } = await crewContext();
  const settings = await getSettings();
  const [previews, questions] = await Promise.all([
    buildAttachmentPreviews(user.uid),
    user.missionId ? listMissionDocs(user.missionId, "questions", { where: [["crewUid", "==", user.uid]], orderBy: { field: "createdAt", dir: "desc" } }) : Promise.resolve([]),
  ]);
  const now = new Date(requestTime());
  const opts = { delaySeconds: settings.commDelaySeconds, windowEveryHours: settings.commWindowEveryHours };
  const t = questionTiming(now, opts);
  const leaves = Date.parse(t.sendAt) - now.getTime();
  const timing = `${leaves > 60_000 ? `Leaves at the next link in ${mins(leaves)}` : "Leaves right away"} · reaches Earth in ${mins(Date.parse(t.arriveAt) - now.getTime())} · earliest reply in ${mins(Date.parse(earliestReply(t.arriveAt, opts)) - now.getTime())}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Ask the doctor"
        description="Not urgent? Send a question any time. Messages take time to travel, so you'll always see exactly where yours is."
        crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Ask the doctor" }]}
        badges={settings.commDelaySeconds ? <Badge tone="info">Signal delay {mins(settings.commDelaySeconds * 1000)} each way</Badge> : undefined}
      />
      <EmergencyNotice compact />
      <Card>
        <CardBody>
          <AskForm previews={(Object.keys(ATTACH_LABELS) as AttachKey[]).map((k) => ({ key: k, label: ATTACH_LABELS[k], summary: previews[k] }))} timing={timing} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="My questions" />
        <CardBody className="space-y-3">
          {questions.length === 0 ? <EmptyState icon={<MessageCircleQuestion className="h-5 w-5" />} title="No questions yet" body="Anything you ask will show up here with its journey." /> : null}
          {questions.map((q) => {
            const stage = questionStage(q, now.getTime());
            return (
              <article key={q.id} className="pop-in space-y-3 rounded-2xl bg-surface-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{q.text}</p>
                  <span className="flex gap-1.5">
                    {q.priority === "soon" ? <Badge tone="warn">Soon please</Badge> : null}
                    {q.origin === "simulated" ? <DemoBadge label="Demo" /> : null}
                  </span>
                </div>
                <QuestionTracker q={q} />
                {q.attachments.length ? <p className="text-xs text-muted">Attached: {q.attachments.map((a) => `${a.label} — ${a.summary}`).join(" · ")}</p> : null}
                {q.answer && stage === "answered" ? (
                  <div className={`rounded-2xl border p-3 text-sm ${q.readAt ? "border-line bg-surface" : "border-primary/30 bg-primary-soft"}`}>
                    <p className="whitespace-pre-line">{q.answer.text}</p>
                    <p className="mt-1 text-xs text-muted">
                      {q.answer.byName} · arrived {fmtDateTime(q.answer.arriveAt, tz)}
                    </p>
                    {!q.readAt ? (
                      <div className="mt-2">
                        <ActionButton action={markAnswerRead.bind(null, q.id)} variant="secondary" successTitle="Thanks!">
                          Got it
                        </ActionButton>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <p className="text-[11px] text-muted">Asked {fmtDateTime(q.createdAt, tz)}</p>
              </article>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
