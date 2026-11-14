import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listLessons } from "@/lib/data/repo";
import { lessonForm } from "@/lib/actions/forms";
import { reviewLesson } from "@/lib/actions/medical";
import { fmtDateTime } from "@/lib/utils";
import { Callout, EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, OriginBadge, StatusBadge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/action-ui";
import { Field, Input, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Crew knowledge" };

export default async function KnowledgePage({ searchParams }: PageProps<"/app/knowledge">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase().slice(0, 80) : "";
  const all = await listLessons();
  const isMedical = user.role === "medical";
  const published = all.filter((l) => l.status === "published" && (!q || `${l.title} ${l.body} ${l.tags.join(" ")} ${l.module} ${l.phase}`.toLowerCase().includes(q)));
  const pending = isMedical ? all.filter((l) => l.status === "submitted") : [];
  return (
    <div className="space-y-6">
      <PageHeader title="Crew knowledge" description="Lessons learned — operational and de-identified. Personal medical records never belong here." />
      <form role="search" className="max-w-md">
        <label htmlFor="kq" className="sr-only">
          Search lessons
        </label>
        <input id="kq" name="q" defaultValue={q} placeholder="Search lessons, tags, modules…" className="h-11 w-full rounded-full border border-line bg-surface px-4 text-sm shadow-[var(--shadow-card)]" />
      </form>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {published.length === 0 ? <EmptyState icon={<Lightbulb className="h-5 w-5" />} title="No published lessons" body="Submitted lessons appear here once a medical officer approves them." /> : null}
          {published.map((l) => (
            <Card key={l.id}>
              <CardHeader title={l.title} description={`${l.module} · ${l.phase} · approved by ${l.approvedBy}`} action={<OriginBadge origin={l.origin} />} />
              <CardBody className="space-y-2 text-sm">
                <p>{l.body}</p>
                <p className="flex flex-wrap gap-1.5">
                  {l.tags.map((t) => (
                    <Badge key={t} tone="info">
                      #{t}
                    </Badge>
                  ))}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Share a lesson" description="Operational observations only — no personal health details." />
            <CardBody>
              <ActionForm action={lessonForm} submitLabel="Submit for review">
                <Field label="Title" htmlFor="ls-t">
                  <Input id="ls-t" name="title" required minLength={3} />
                </Field>
                <Field label="What did you learn?" htmlFor="ls-b">
                  <Textarea id="ls-b" name="body" required minLength={10} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Module" htmlFor="ls-m">
                    <Input id="ls-m" name="module" placeholder="e.g. Sleep" />
                  </Field>
                  <Field label="Mission phase" htmlFor="ls-p">
                    <Input id="ls-p" name="phase" placeholder="e.g. Mid mission" />
                  </Field>
                </div>
                <Field label="Tags (comma-separated)" htmlFor="ls-tags">
                  <Input id="ls-tags" name="tags" />
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
          {isMedical ? (
            <Card>
              <CardHeader title={`Awaiting review (${pending.length})`} />
              <CardBody className="space-y-3">
                {pending.map((l) => (
                  <div key={l.id} className="space-y-2 rounded-2xl bg-surface-2 p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <strong>{l.title}</strong>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-muted">{l.body}</p>
                    <p className="text-xs text-muted">{fmtDateTime(l.createdAt)}</p>
                    <div className="flex gap-2">
                      <ActionButton action={reviewLesson.bind(null, l.id, "published")}>Publish</ActionButton>
                      <ActionButton action={reviewLesson.bind(null, l.id, "rejected")} variant="outline">
                        Reject
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {pending.length === 0 ? <p className="text-sm text-muted">Nothing to review.</p> : null}
                <Callout tone="info">Check that lessons are de-identified before publishing.</Callout>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
