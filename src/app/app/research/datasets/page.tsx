import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireSection } from "@/lib/auth/current-user";
import { FILTER_FIELDS, searchStudies } from "@/lib/nasa/osdr";
import { fmtDateTime } from "@/lib/utils";
import { Callout, EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProvenanceNote } from "@/components/research/provenance";

export const metadata: Metadata = { title: "NASA OSDR datasets" };

const ORGANISMS = ["Homo sapiens", "Mus musculus", "Rattus norvegicus", "Arabidopsis thaliana", "Drosophila melanogaster", "Caenorhabditis elegans", "Escherichia coli"];
const PROJECT_TYPES = ["Spaceflight Study", "Ground Study", "Spaceflight Study, Ground Study"];

export default async function Datasets({ searchParams }: PageProps<"/app/research/datasets">) {
  await requireSection("research");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "space";
  const page = Math.max(1, Math.min(100, Number(sp.page) || 1));
  const field = typeof sp.field === "string" && sp.field in FILTER_FIELDS ? (sp.field as keyof typeof FILTER_FIELDS) : undefined;
  const value = typeof sp.value === "string" ? sp.value.slice(0, 80) : undefined;
  const size = 10;
  const res = await searchStudies({ term: q, page, size, filterField: field, filterValue: value });
  const pages = Math.max(1, Math.ceil(res.total / size));
  const qs = (p: number) => `?${new URLSearchParams({ q, page: String(p), ...(field && value ? { field, value } : {}) })}`;
  return (
    <div className="space-y-6">
      <PageHeader title="NASA OSDR datasets" description="Search public studies, inspect metadata first, then open files on the official site." crumbs={[{ label: "Research", href: "/app/research" }, { label: "Datasets" }]} />
      <Card>
        <CardBody>
          <form className="grid gap-3 md:grid-cols-[1fr_14rem_auto]" role="search">
            <label htmlFor="q" className="sr-only">
              Keyword
            </label>
            <div className="relative">
              <Search aria-hidden className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input id="q" name="q" defaultValue={q} placeholder="e.g. heart, bone, sleep, radiation" className="h-11 w-full rounded-full border border-line bg-surface-2/60 pl-10 pr-4 text-sm" />
            </div>
            <label htmlFor="filter" className="sr-only">
              Filter
            </label>
            <select id="filter" name="value" defaultValue={value ?? ""} className="h-11 rounded-full border border-line bg-surface-2/60 px-4 text-sm">
              <option value="">All organisms & study types</option>
              <optgroup label="Organism">
                {ORGANISMS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Study type">
                {PROJECT_TYPES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
            </select>
            <input type="hidden" name="field" value={value && PROJECT_TYPES.includes(value) ? "projectType" : "organism"} />
            <Button type="submit">Search</Button>
          </form>
        </CardBody>
      </Card>
      {res.error ? (
        <Callout tone="warn" title="Live NASA OSDR request failed">
          {res.error} Showing a small, clearly-labelled local sample of real OSDR metadata instead.
        </Callout>
      ) : null}
      <ProvenanceNote p={res.provenance} />
      <p className="text-sm text-muted">
        {res.total.toLocaleString()} studies{field && value ? ` · ${value}` : ""} · page {page} of {pages}
      </p>
      {res.studies.length === 0 ? <EmptyState title="No studies found" body="Try a broader keyword or remove the filter." /> : null}
      <div className="space-y-3">
        {res.studies.map((s) => (
          <Link key={s.accession} href={`/app/research/datasets/${s.accession}`} className="lift block rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] hover:bg-primary-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="info">{s.accession}</Badge>
                  <Badge tone={s.organism === "Homo sapiens" ? "warn" : "neutral"}>Organism: {s.organism}</Badge>
                  {s.projectType ? <Badge>{s.projectType}</Badge> : null}
                  {s.assayType ? <Badge>{s.assayType}</Badge> : null}
                </div>
                <h2 className="font-semibold leading-snug">{s.title}</h2>
                <p className="line-clamp-2 text-sm text-muted">{s.description}</p>
                <p className="text-xs text-muted">
                  {s.mission ? `Mission ${s.mission} · ` : ""}
                  {s.flightProgram ? `${s.flightProgram} · ` : ""}
                  {s.releaseDate ? `Released ${fmtDateTime(s.releaseDate, "UTC", { dateStyle: "medium", timeStyle: undefined })}` : ""}
                </p>
              </div>
              <ChevronRight aria-hidden className="mt-1 h-5 w-5 shrink-0 text-muted" />
            </div>
          </Link>
        ))}
      </div>
      {!res.error && pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          {page > 1 ? <ButtonLink href={qs(page - 1)} variant="outline">Previous</ButtonLink> : <span />}
          {page < pages ? <ButtonLink href={qs(page + 1)} variant="outline">Next</ButtonLink> : null}
        </nav>
      ) : null}
    </div>
  );
}
