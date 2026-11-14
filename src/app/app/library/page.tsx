import type { Metadata } from "next";
import { CloudDownload } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { ARTICLES } from "@/lib/content/library";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata: Metadata = { title: "Countermeasure library" };

const APPROVAL = {
  "general-education": { label: "General education", tone: "info" as const },
  "mission-approved": { label: "Mission-approved procedure", tone: "ok" as const },
  draft: { label: "Draft — not approved", tone: "warn" as const },
};

export default async function LibraryPage({ searchParams }: PageProps<"/app/library">) {
  await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase().slice(0, 80) : "";
  const topic = typeof sp.topic === "string" ? sp.topic : "";
  const topics = [...new Set(ARTICLES.map((a) => a.topic))];
  const shown = ARTICLES.filter((a) => (!topic || a.topic === topic) && (!q || `${a.title} ${a.summary} ${a.body.join(" ")}`.toLowerCase().includes(q)));
  return (
    <div className="space-y-6">
      <PageHeader title="Countermeasure library" description="Educational content with author, source, version, review date and approval status. Articles marked Offline are cached for communication-delay periods." />
      <form role="search" className="flex flex-wrap gap-2">
        <label htmlFor="lq" className="sr-only">
          Search library
        </label>
        <input id="lq" name="q" defaultValue={q} placeholder="Search the library…" className="h-11 w-full max-w-md rounded-full border border-line bg-surface px-4 text-sm shadow-[var(--shadow-card)]" />
      </form>
      <nav aria-label="Topics" className="flex flex-wrap gap-2">
        <Link href="/app/library" className={`rounded-full px-4 py-1.5 text-sm ${!topic ? "hero-gradient text-white" : "bg-surface text-muted shadow-[var(--shadow-card)]"}`}>
          All
        </Link>
        {topics.map((t) => (
          <Link key={t} href={`/app/library?topic=${encodeURIComponent(t)}`} className={`rounded-full px-4 py-1.5 text-sm ${topic === t ? "hero-gradient text-white" : "bg-surface text-muted shadow-[var(--shadow-card)]"}`}>
            {t}
          </Link>
        ))}
      </nav>
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((a) => (
          <Card key={a.slug} id={a.slug}>
            <CardHeader
              title={a.title}
              description={a.summary}
              action={
                <span className="flex flex-col items-end gap-1">
                  <Badge tone={APPROVAL[a.approval].tone}>{APPROVAL[a.approval].label}</Badge>
                  {a.offline ? <Badge icon={<CloudDownload className="h-3 w-3" />}>Offline</Badge> : null}
                </span>
              }
            />
            <CardBody className="space-y-3 text-sm">
              <ul className="list-disc space-y-1 pl-5">
                {a.body.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                {a.author} · {a.source} · v{a.version} · reviewed {a.reviewDate}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
