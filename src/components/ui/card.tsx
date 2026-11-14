import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-[var(--radius-card)] border border-line/60 bg-surface shadow-[var(--shadow-card)]", className)} {...props} />;
}

export function CardHeader({ title, description, action, icon, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0 rounded-xl bg-tile-violet p-2 text-primary">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-fg">{title}</h2>
          {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

/** Purple "View all" style link used in card headers. */
export function ViewAll({ href, children = "View all" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="text-xs font-semibold text-primary hover:underline">
      {children}
    </Link>
  );
}

export const TILE_TONES = {
  violet: "bg-tile-violet text-primary",
  pink: "bg-tile-pink text-coral",
  green: "bg-tile-green text-ok",
  amber: "bg-tile-amber text-warn",
  blue: "bg-tile-blue text-[#3b6fd8] dark:text-[#8fb2ff]",
  teal: "bg-tile-teal text-teal",
} as const;
export type TileTone = keyof typeof TILE_TONES;

/** Pastel rounded icon tile (reference-style). */
export function IconTile({ tone = "violet", children, size = "md", className }: { tone?: TileTone; children: ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = size === "lg" ? "h-14 w-14 rounded-2xl" : size === "sm" ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl";
  return <span className={cn("inline-flex shrink-0 items-center justify-center", s, TILE_TONES[tone], className)}>{children}</span>;
}

/** Thin rounded progress bar. */
export function Progress({ value, tone = "violet", label }: { value: number; tone?: "violet" | "teal" | "amber" | "coral"; label?: string }) {
  const color = { violet: "hero-gradient", teal: "bg-teal", amber: "bg-amber", coral: "bg-coral" }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full", color)} style={{ width: `${v}%` }} />
    </div>
  );
}
