import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { medicalContext } from "@/lib/medical/context";
import { listMissionDocs } from "@/lib/data/repo";
import { questionStage } from "@/lib/questions/eta";
import { answerForm } from "@/lib/actions/forms";
import { fmtDateTime, relativeTime, requestTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-ui";
import { Textarea } from "@/components/ui/form";
import { QuestionTracker } from "@/components/crew/question-tracker";

export const metadata: Metadata = { title: "Crew questions" };

const TOPIC: Record<string, string> = { symptom: "🤒 How they feel", sleep: "🌙 Sleep", exercise: "🏋️ Exercise", food: "🍽️ Food", medication: "💊 Medicine", mood: "🙂 Mood", other: "💬 Other" };

export default async function QuestionsInbox({ searchParams }: PageProps<"/app/medical/questions">) {
  const { mission, tz } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const sp = await searchParams;
  const show = sp.show === "answered" ? "answered" : "open";
  const now = requestTime();
  const all = await listMissionDocs(mission.id, "questions", { orderBy: { field: "createdAt", dir: "desc" } });
  const open = all.filter((q) => !q.answer).sort((a, b) => (a.priority === b.priority ? a.createdAt.localeCompare(b.createdAt) : a.priority === "soon" ? -1 : 1));
  const shown = show === "open" ? open : all.filter((q) => q.answer);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Crew questions" description="Store-and-forward questions from crew. Questions only become readable once they have physically reached Earth." crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Questions" }]} />
      <nav aria-label="Filter" className="flex gap-2">
        {(["open", "answered"] as const).map((k) => (
          <Link key={k} href={`?show=${k}`} className={`rounded-full px-4 py-1.5 text-sm ${show === k ? "hero-gradient font-semibold text-white" : "bg-surface text-muted shadow-[var(--shadow-card)]"}`}>
            {k === "open" ? `Waiting for you (${open.length})` : "Answered"}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? <EmptyState icon={<MessageCircleQuestion className="h-5 w-5" />} title="Nothing here" body="New crew questions will appear here." /> : null}
      {shown.map((q) => {
        const stage = questionStage(q, now);
        const arrived = stage !== "waiting-window" && stage !== "travelling";
        return (
          <Card key={q.id}>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <Link href={`/app/medical/crew/${q.crewUid}`} className="font-semibold text-primary hover:underline">
                    {q.crewLabel}
                  </Link>{" "}
                  · {TOPIC[q.topic]} · asked {relativeTime(q.createdAt, now)}
                </p>
                <span className="flex gap-1.5">
                  {q.priority === "soon" ? <Badge tone="warn">Soon please</Badge> : <Badge>When you can</Badge>}
                  {q.origin === "simulated" ? <DemoBadge label="Demo" /> : null}
                </span>
              </div>
              {arrived ? (
                <>
                  <p className="rounded-2xl bg-surface-2 p-3 font-medium">{q.text}</p>
                  {q.attachments.length ? (
                    <ul className="grid gap-2 text-xs sm:grid-cols-2">
                      {q.attachments.map((a) => (
                        <li key={a.label} className="rounded-xl border border-line px-3 py-2">
                          <span className="block font-semibold">{a.label}</span>
                          {a.summary}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p className="rounded-2xl bg-surface-2 p-3 text-sm italic text-muted">Still travelling from the habitat — you can read it once it arrives.</p>
              )}
              <QuestionTracker q={q} />
              {q.answer ? (
                <div className="rounded-2xl border border-line p-3 text-sm">
                  <p className="whitespace-pre-line">{q.answer.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    {q.answer.byName} · {fmtDateTime(q.answer.at, tz)} {q.readAt ? "· read by crew" : ""}
                  </p>
                </div>
              ) : arrived ? (
                <ActionForm action={answerForm.bind(null, q.id)} submitLabel="Send answer">
                  <label htmlFor={`ans-${q.id}`} className="sr-only">
                    Answer to {q.crewLabel}
                  </label>
                  <Textarea id={`ans-${q.id}`} name="text" required placeholder="Write a clear, friendly answer…" className="min-h-20" />
                </ActionForm>
              ) : null}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
