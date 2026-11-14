import Link from "next/link";
import { ChevronRight, Info, ShieldAlert, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn, requestTime } from "@/lib/utils";
import { IconTile, type TileTone } from "./card";

export function PageHeader({ title, description, crumbs, actions, badges }: { title: string; description?: ReactNode; crumbs?: { label: string; href?: string }[]; actions?: ReactNode; badges?: ReactNode }) {
  return (
    <header className="mb-6 space-y-2">
      {crumbs?.length ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {c.href ? (
                  <Link href={c.href} className="hover:text-fg hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page">{c.label}</span>
                )}
                {i < crumbs.length - 1 ? <ChevronRight aria-hidden className="h-3 w-3" /> : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[1.7rem]">{title}</h1>
            {badges}
          </div>
          {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      {icon ? <div className="mb-3 rounded-2xl bg-tile-violet p-3 text-primary">{icon}</div> : null}
      <p className="font-medium text-fg">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Callout({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "danger"; title?: ReactNode; children: ReactNode; className?: string }) {
  const Icon = tone === "danger" ? ShieldAlert : tone === "warn" ? TriangleAlert : Info;
  const styles = {
    info: "border-primary/20 bg-primary-soft text-fg",
    warn: "border-warn/30 bg-warn-soft text-fg",
    danger: "border-danger/30 bg-danger-soft text-fg",
  }[tone];
  const iconColor = { info: "text-primary", warn: "text-warn", danger: "text-danger" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={cn("flex gap-3 rounded-2xl border p-4 text-sm", styles, className)}>
      <Icon aria-hidden className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor)} />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="text-fg/85">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, unit, hint, icon, tone = "violet" }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode; icon?: ReactNode; tone?: TileTone }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line/60 bg-surface p-4 shadow-[var(--shadow-card)]">
      {icon ? <IconTile tone={tone}>{icon}</IconTile> : null}
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums text-fg">{value}</span>
          {unit ? <span className="text-xs text-muted">{unit}</span> : null}
        </div>
        {hint ? <div className="truncate text-[11px] text-muted">{hint}</div> : null}
      </div>
    </div>
  );
}

export function EmergencyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <Callout tone="danger" title="Antariksha is not an emergency service">
      {compact ? (
        <>In an emergency, follow your mission&apos;s approved emergency and medical communication procedures immediately. Never delay emergency contact to complete a form.</>
      ) : (
        <>
          In a real mission, follow the mission&apos;s approved emergency and medical communication procedures. Never delay emergency contact to complete a form in this app. Messages here may be delayed or queued and are not monitored continuously.
        </>
      )}
    </Callout>
  );
}

export function DataFreshness({ iso, label = "Last updated" }: { iso: string | null | undefined; label?: string }) {
  if (!iso) return <span className="text-xs text-muted">{label}: no data</span>;
  const hours = (requestTime() - Date.parse(iso)) / 3_600_000;
  const stale = hours > 36;
  return (
    <span className={cn("text-xs", stale ? "text-warn" : "text-muted")}>
      {label}: {hours < 1 ? "within the hour" : hours < 48 ? `${Math.round(hours)} h ago` : `${Math.round(hours / 24)} d ago`}
      {stale ? " (stale)" : ""}
    </span>
  );
}
