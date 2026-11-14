import { Database } from "lucide-react";
import type { Provenance } from "@/lib/nasa/osdr";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/utils";

export function ProvenanceNote({ p }: { p: Provenance }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 px-4 py-2.5 text-xs text-muted">
      <Database aria-hidden className="h-4 w-4 text-primary" />
      <span>
        Source: <strong className="text-fg">{p.source}</strong> · retrieved {fmtDateTime(p.retrievedAt)} ·{" "}
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          request URL
        </a>
      </span>
      <Badge tone={p.access === "public" ? "ok" : p.access === "fixture" ? "warn" : "neutral"}>{p.access === "fixture" ? "Cached fixture" : p.access}</Badge>
      {p.note ? <span>{p.note}</span> : null}
    </div>
  );
}
