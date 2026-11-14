import type { Metadata } from "next";
import { ExternalLink, Lock } from "lucide-react";
import { requireSection } from "@/lib/auth/current-user";
import { formatBytes, getStudy, getStudyFiles, OsdrError } from "@/lib/nasa/osdr";
import { Callout, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProvenanceNote } from "@/components/research/provenance";

export const metadata: Metadata = { title: "Study detail" };

export default async function StudyPage({ params }: PageProps<"/app/research/datasets/[id]">) {
  await requireSection("research");
  const { id } = await params;
  const crumbs = [{ label: "Research", href: "/app/research" }, { label: "Datasets", href: "/app/research/datasets" }, { label: id }];
  let study, files;
  try {
    [study, files] = await Promise.all([getStudy(id), getStudyFiles(id).catch(() => null)]);
  } catch (e) {
    return (
      <div className="space-y-6">
        <PageHeader title={id} crumbs={crumbs} />
        <Callout tone="warn" title={e instanceof OsdrError && e.status === 404 ? "Study not found" : "Could not load this study"}>
          {e instanceof Error ? e.message : "NASA OSDR is unavailable."} You can try the official page directly.
        </Callout>
        <ButtonLink href={`https://osdr.nasa.gov/bio/repo/data/studies/${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer" variant="outline">
          Open on osdr.nasa.gov <ExternalLink aria-hidden className="h-4 w-4" />
        </ButtonLink>
      </div>
    );
  }
  const official = `https://osdr.nasa.gov/bio/repo/data/studies/${study.accession}`;
  const grouped = new Map<string, NonNullable<typeof files>["files"]>();
  for (const f of files?.files ?? []) grouped.set(f.category || "Other", [...(grouped.get(f.category || "Other") ?? []), f]);
  return (
    <div className="space-y-6">
      <PageHeader
        title={study.title || study.accession}
        crumbs={crumbs}
        badges={<Badge tone="info">{study.accession}</Badge>}
        actions={
          <ButtonLink href={official} target="_blank" rel="noopener noreferrer" variant="secondary">
            Official study page <ExternalLink aria-hidden className="h-4 w-4" />
          </ButtonLink>
        }
      />
      <ProvenanceNote p={study.provenance} />
      {study.organisms.includes("Homo sapiens") ? (
        <Callout tone="warn">Human study. Data is de-identified research data and must not be used for individual diagnosis or crew monitoring. Some sequence data may be controlled-access.</Callout>
      ) : (
        <Callout tone="info">Organism: {study.organisms.join(", ") || "not specified"}. Results from non-human studies do not directly translate to people.</Callout>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Description" />
          <CardBody>
            <p className="whitespace-pre-line text-sm leading-relaxed">{study.description || "No description provided."}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Metadata summary" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                ["Organism(s)", study.organisms.join(", ") || "—"],
                ["Factors", study.factors.join(", ") || "—"],
                ["Assays", study.assays.map((a) => `${a.measurement} (${a.technology})`).join("; ") || "—"],
                ["Mission", study.comments["Mission Name"] ?? "—"],
                ["Project type", study.comments["Project Type"] ?? "—"],
                ["Flight program", study.comments["Flight Program"] ?? "—"],
                ["Managing center", study.comments["Managing NASA Center"] ?? "—"],
                ["Public release", study.publicReleaseDate || "—"],
                ["DOI", study.comments["DOI"] ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-surface-2 px-3 py-2">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
      {study.publications.length ? (
        <Card>
          <CardHeader title="Publications" />
          <CardBody className="space-y-2 text-sm">
            {study.publications.map((p) => (
              <p key={p.title}>
                {p.title}{" "}
                {p.doi ? (
                  <a className="text-primary hover:underline" href={`https://doi.org/${p.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}`} target="_blank" rel="noopener noreferrer">
                    doi
                  </a>
                ) : null}
              </p>
            ))}
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader title={`Files (${files?.files.length ?? 0})`} description="Links open on the official NASA site. Nothing is downloaded automatically." />
        <CardBody className="space-y-4">
          {files ? <ProvenanceNote p={files.provenance} /> : <p className="text-sm text-muted">File listing unavailable right now.</p>}
          {[...grouped.entries()].map(([cat, fs]) => (
            <details key={cat} className="rounded-2xl bg-surface-2 p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {cat} ({fs.length})
              </summary>
              <ul className="mt-2 space-y-1 text-sm">
                {fs.map((f) => (
                  <li key={f.name} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-1">
                    <span className="break-all">{f.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {formatBytes(f.sizeBytes)}
                      {f.restricted ? (
                        <Badge tone="warn" icon={<Lock className="h-3 w-3" />}>
                          Controlled access
                        </Badge>
                      ) : (
                        <a href={f.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">
                          Open on OSDR
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
