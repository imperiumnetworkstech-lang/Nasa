import type { Metadata } from "next";
import { ExternalLink, Database, LineChart, BookOpen, Search } from "lucide-react";
import { requireSection } from "@/lib/auth/current-user";
import { getApod } from "@/lib/nasa/apod";
import { Callout, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, IconTile } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { PlanetIllustration } from "@/components/illustrations";
import Link from "next/link";

export const metadata: Metadata = { title: "Research" };

const VISUALIZERS = [
  { name: "OSDR visualisation portal", url: "https://visualization.osdr.nasa.gov/", desc: "Official NASA visualisation tools hub." },
  { name: "GeneLab data visualisation", url: "https://visualization.osdr.nasa.gov/data/", desc: "Explore processed GeneLab omics results." },
  { name: "RadLab", url: "https://visualization.osdr.nasa.gov/radlab/", desc: "Radiation dosimetry data from spaceflight missions." },
  { name: "Environmental Data Application (EDA)", url: "https://visualization.osdr.nasa.gov/eda/", desc: "Spaceflight environmental telemetry." },
];

export default async function ResearchHome() {
  await requireSection("research");
  const apod = await getApod();
  return (
    <div className="space-y-6">
      <PageHeader title="Research explorer" description="Public space-biology studies, with sources on everything." />
      <section className="hero-gradient relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-pop)]">
        <div className="relative z-10 max-w-[65%] space-y-3">
          <p className="text-xs font-medium text-white/80">NASA Open Science Data Repository</p>
          <h2 className="text-2xl font-bold">Search spaceflight studies</h2>
          <p className="text-sm text-white/80">Omics, physiology, behaviour, imaging and environmental telemetry — mice, plants, microbes and humans. Always check the organism.</p>
          <ButtonLink href="/app/research/datasets" variant="light" size="sm">
            <Search aria-hidden className="h-4 w-4" /> Explore datasets
          </ButtonLink>
        </div>
        <PlanetIllustration className="absolute -right-4 -top-2 h-48 w-48 opacity-90" />
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/app/research/datasets", label: "OSDR datasets", icon: Database, tone: "violet" as const },
          { href: "/app/research/insights", label: "Insights & model", icon: LineChart, tone: "teal" as const },
          { href: "/app/research/methodology", label: "Methodology", icon: BookOpen, tone: "amber" as const },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="lift flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 font-semibold shadow-[var(--shadow-card)] hover:bg-primary-soft">
            <IconTile tone={x.tone}>
              <x.icon aria-hidden className="h-5 w-5" />
            </IconTile>
            {x.label}
          </Link>
        ))}
      </div>
      <details className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
          NASA tools & space picture of the day
          <span className="text-xs font-normal text-muted">optional</span>
        </summary>
        <div className="p-5 pt-0">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Official NASA visualisers" description="Linked, not recreated" />
          <CardBody className="space-y-2">
            {VISUALIZERS.map((v) => (
              <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm hover:bg-primary-soft">
                <span>
                  <strong>{v.name}</strong>
                  <span className="block text-xs text-muted">{v.desc}</span>
                </span>
                <ExternalLink aria-hidden className="h-4 w-4 shrink-0 text-primary" />
              </a>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Space science today" description="NASA Astronomy Picture of the Day · educational, not health data" />
          <CardBody>
            {apod ? (
              <div className="space-y-3">
                {apod.url && apod.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={apod.url} alt={apod.title} className="aspect-video w-full rounded-2xl object-cover" loading="lazy" />
                ) : null}
                <p className="font-semibold">{apod.title}</p>
                <p className="text-sm text-muted">{apod.explanation}…</p>
                <p className="text-xs text-muted">
                  {apod.date} · {apod.copyright ? `© ${apod.copyright}` : "NASA"} · via api.nasa.gov
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">The NASA APOD service is unavailable right now (or the DEMO_KEY rate limit was reached). Nothing else is affected.</p>
            )}
          </CardBody>
        </Card>
      </div>
        </div>
      </details>
      <Callout tone="warn">Some astronaut-derived sequence data in OSDR is controlled-access. Antariksha never requests or bypasses restricted data.</Callout>
    </div>
  );
}
