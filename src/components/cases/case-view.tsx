import { ArrowDown, ArrowUp, Check, Pill, ShieldCheck } from "lucide-react";
import type { HealthCase } from "@/lib/types";
import { cn } from "@/lib/utils";

type CaseLike = Pick<HealthCase, "analysis" | "precautions" | "remedy" | "medicines" | "medicineStatus" | "reviewedBy" | "doctorNote">;

const SEV = {
  normal: "bg-ok-soft text-ok",
  attention: "bg-warn-soft text-warn",
  urgent: "bg-danger-soft text-danger",
} as const;

export function SeverityPill({ severity }: { severity: "normal" | "attention" | "urgent" }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", SEV[severity])}>{severity === "normal" ? "Normal" : severity === "urgent" ? "Urgent" : "Needs attention"}</span>;
}

/** Parameter table: value, normal range, status and % outside the range. */
export function ParamTable({ params }: { params: CaseLike["analysis"]["params"] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {params.map((p) => (
        <li key={p.key} className={cn("flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm", p.status !== "normal" ? "bg-danger-soft" : p.unusual ? "bg-warn-soft" : "bg-surface-2")}>
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.label}</span>
            <span className="block text-[11px] text-muted">
              Normal {p.low}–{p.high} {p.unit}
            </span>
            {p.usual !== undefined ? (
              <span className={cn("block text-[11px]", p.unusual ? "font-semibold text-warn" : "text-muted")}>
                Their usual {p.usual} · {p.pctFromUsual! > 0 ? "+" : ""}
                {p.pctFromUsual}%
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-bold tabular-nums">
              {p.value} <span className="text-xs font-normal text-muted">{p.unit}</span>
            </span>
            {p.status === "normal" && p.unusual ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-warn">Unusual for them</span>
            ) : p.status === "normal" ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ok">
                <Check aria-hidden className="h-3 w-3" /> Normal
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-danger">
                {p.status === "low" ? <ArrowDown aria-hidden className="h-3 w-3" /> : <ArrowUp aria-hidden className="h-3 w-3" />}
                {Math.abs(p.deviationPct)}% {p.status === "low" ? "below" : "above"}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Model output: % for each condition (top 4). */
export function ProbabilityBars({ probs }: { probs: CaseLike["analysis"]["probabilities"] }) {
  return (
    <ul className="space-y-1.5">
      {probs.slice(0, 4).map((p, i) => (
        <li key={p.condition} className="text-xs">
          <div className="flex justify-between">
            <span className={i === 0 ? "font-semibold" : "text-muted"}>{p.label}</span>
            <span className="tabular-nums">{p.pct}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full", i === 0 ? "hero-gradient" : "bg-line")} style={{ width: `${Math.max(1, p.pct)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MedicineList({ c }: { c: CaseLike }) {
  if (!c.medicines.length) return <p className="text-sm text-muted">No medicine needed.</p>;
  return (
    <div className="space-y-2">
      <p className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok">
        <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> Recommended by the health model{c.reviewedBy ? ` · more added by ${c.reviewedBy}` : ""}
      </p>
      <p className="text-[11px] text-muted">Use the dose on the kit label. In an emergency, follow your mission procedure.</p>
      <ul className="space-y-1.5">
        {c.medicines.map((m) => (
          <li key={m.name} className="flex items-start gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
            <Pill aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="block font-semibold">
                {m.name} {m.addedBy ? <span className="ml-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">Added by {m.addedBy}</span> : null}
              </span>
              <span className="text-xs text-muted">{m.purpose}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full case view used in the crew result pop-up and on staff dashboards. */
export function CaseView({ c, audience }: { c: CaseLike; audience: "crew" | "staff" }) {
  const a = c.analysis;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-4xl">
          {a.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{a.label}</h3>
            <SeverityPill severity={a.severity} />
          </div>
          <p className="text-sm text-muted">{a.message}</p>
          <p className="mt-1 text-xs text-muted">
            Model confidence {a.confidencePct}% · model v{a.modelVersion}
            {a.personalBaseline ? " · compared with their personal baseline" : ""}
          </p>
          {a.expected ? <p className="mt-2 rounded-2xl bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">🏃 {a.contextNote}</p> : null}
        </div>
      </div>

      {a.severity !== "normal" && audience === "crew" && !a.expected ? (
        <section className="rounded-2xl border border-danger/30 bg-danger-soft p-3">
          <p className="mb-1 text-sm font-bold text-danger">Do this now</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {c.precautions.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <p className="mb-2 text-sm font-semibold">Readings</p>
        <ParamTable params={a.params} />
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold">What the model thinks</p>
        <ProbabilityBars probs={a.probabilities} />
      </section>

      {a.severity !== "normal" ? (
        <>
          <section>
            <p className="mb-1 text-sm font-semibold">Remedy</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-sm">
              {c.remedy.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </section>
          <section>
            <p className="mb-1 text-sm font-semibold">Medicine</p>
            <MedicineList c={c} />
          </section>
          {c.doctorNote ? <p className="rounded-2xl bg-primary-soft px-3 py-2 text-sm">🩺 {c.doctorNote}</p> : null}
        </>
      ) : null}
    </div>
  );
}
