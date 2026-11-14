"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn, SCALE_LABELS } from "@/lib/utils";

const control =
  "w-full rounded-2xl border border-line bg-surface-2/60 px-4 text-sm text-fg placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 aria-[invalid=true]:border-danger";

export function Field({ label, help, error, children, htmlFor, optional }: { label: ReactNode; help?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : help ? (
        <p className="text-xs text-muted">{help}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 pr-8", className)} {...props} />;
}

export function Checkbox({ label, help, ...props }: ComponentProps<"input"> & { label: ReactNode; help?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-1 h-5 w-5 shrink-0 rounded border-line accent-[var(--primary)]" {...props} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-fg">{label}</span>
        {help ? <span className="block text-xs text-muted">{help}</span> : null}
      </label>
    </div>
  );
}

/**
 * Labelled 1–5 scale with an explicit "Prefer not to answer" option.
 * Large touch targets for tablet use; works with keyboard via native radio inputs.
 */
export function ScaleInput({
  name,
  legend,
  kind,
  value,
  onChange,
  allowSkip = true,
  help,
}: {
  name: string;
  legend: string;
  kind: keyof typeof SCALE_LABELS;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  allowSkip?: boolean;
  help?: string;
}) {
  const labels = SCALE_LABELS[kind];
  const opts: { v: number | null; label: string }[] = labels.map((l, i) => ({ v: i + 1, label: l }));
  if (allowSkip) opts.push({ v: null, label: "Prefer not to answer" });
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-fg">{legend}</legend>
      {help ? <p className="text-xs text-muted">{help}</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {opts.map((o) => {
          const checked = value === o.v;
          return (
            <label
              key={String(o.v)}
              className={cn(
                "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                checked ? "border-transparent hero-gradient text-white font-semibold shadow-[var(--shadow-pop)]" : "border-line bg-surface hover:bg-primary-soft",
                o.v === null && "text-muted",
              )}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(o.v)} />
              {o.v !== null ? <span className="text-base font-semibold">{o.v}</span> : null}
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FormMessage({ state }: { state: { ok?: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return (
    <p role="status" aria-live="polite" className={cn("rounded-2xl border px-4 py-2.5 text-sm", state.ok ? "border-ok/30 bg-ok-soft text-ok" : "border-danger/30 bg-danger-soft text-danger")}>
      {state.message}
    </p>
  );
}

/** datetime-local helpers (local browser time ⇄ ISO UTC). */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}
