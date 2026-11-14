import { CheckCircle2, CircleDashed } from "lucide-react";
import type { HealthCase, MissionMember } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { reviewCase, resolveCase } from "@/lib/actions/cases";
import { ActionButton, ActionForm } from "@/components/action-ui";
import { Field, Textarea } from "@/components/ui/form";
import { MedicineList, ParamTable, ProbabilityBars, SeverityPill } from "./case-view";

/** One tile per astronaut: green "Normal" or the condition from their latest suit reading. */
export function CrewStatusBoard({ crew, latest, now }: { crew: MissionMember[]; latest: Map<string, HealthCase>; now: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {crew.map((m) => {
        const c = latest.get(m.uid);
        const state = !c ? "none" : c.status === "active" ? c.analysis.severity : "normal";
        const cls = state === "urgent" ? "bg-danger-soft border-danger/30" : state === "attention" ? "bg-warn-soft border-warn/30" : state === "normal" ? "bg-ok-soft border-ok/20" : "bg-surface border-line";
        return (
          <div key={m.uid} className={`pop-in rounded-[var(--radius-card)] border p-4 ${cls}`}>
            <div className="flex items-center gap-3">
              <span className="hero-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" aria-hidden>
                {m.callSign.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.displayName}</p>
                <p className="text-xs text-muted">{m.callSign}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-bold">
              {state === "none" ? (
                <>
                  <CircleDashed aria-hidden className="h-4 w-4 text-muted" /> No suit reading yet
                </>
              ) : state === "normal" ? (
                <>
                  <CheckCircle2 aria-hidden className="h-4 w-4 text-ok" /> <span className="text-ok">Normal</span>
                </>
              ) : (
                <>
                  <span aria-hidden>{c!.analysis.emoji}</span> {c!.analysis.label}
                </>
              )}
            </p>
            {c ? <p className="text-[11px] text-muted">{relativeTime(c.status === "resolved" ? (c.resolvedAt ?? c.createdAt) : c.createdAt, now)}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Active case card for the base-station doctor (editable) or the commander (read-only). */
export function CaseCard({ c, now, editable }: { c: HealthCase; now: number; editable: boolean }) {
  return (
    <article className={`pop-in space-y-4 rounded-[var(--radius-card)] border-l-[6px] bg-surface p-5 shadow-[var(--shadow-card)] ${c.analysis.severity === "urgent" ? "attention-pulse border-l-[#d64545]" : "border-l-amber"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-bold">{c.crewName}</p>
          <p className="flex items-center gap-2 text-sm">
            <span aria-hidden>{c.analysis.emoji}</span>
            <span className="font-semibold">{c.analysis.label}</span>
            <span className="text-xs text-muted">· {relativeTime(c.createdAt, now)}</span>
          </p>
        </div>
        <SeverityPill severity={c.analysis.severity} />
      </div>
      <p className="text-sm text-muted">{c.analysis.message}</p>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      {c.doctorNote ? <p className="rounded-2xl bg-primary-soft px-3 py-2 text-sm">🩺 {c.doctorNote}</p> : null}

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-primary">See readings & model %</summary>
        <div className="mt-3 space-y-4">
          <ParamTable params={c.analysis.params} />
          <ProbabilityBars probs={c.analysis.probabilities} />
        </div>
      </details>

      {editable ? (
        <div className="flex flex-wrap items-start gap-2 border-t border-line pt-4">
          <details className="min-w-0 flex-1">
            <summary className="inline-flex cursor-pointer list-none items-center rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary">+ Add medicine or advice</summary>
            <ActionForm action={reviewCase} submitLabel="Add & send to crew" className="mt-3 space-y-3">
              <input type="hidden" name="caseId" value={c.id} />
              <Field label="Extra medicine (one per line, “name — how to take”)" optional htmlFor={`med-${c.id}`}>
                <Textarea id={`med-${c.id}`} name="medicines" className="min-h-16" placeholder="e.g. Electrolyte drink — 1 pouch now" />
              </Field>
              <Field label="Extra steps (one per line)" optional htmlFor={`rem-${c.id}`}>
                <Textarea id={`rem-${c.id}`} name="remedy" className="min-h-16" />
              </Field>
              <Field label="Note to the astronaut" optional htmlFor={`note-${c.id}`}>
                <Textarea id={`note-${c.id}`} name="note" className="min-h-14" />
              </Field>
            </ActionForm>
          </details>
          <ActionButton action={resolveCase.bind(null, c.id)} variant="outline" size="md" successTitle="Case closed">
            Mark resolved
          </ActionButton>
        </div>
      ) : null}
    </article>
  );
}
