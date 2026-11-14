import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDot, FlaskConical, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AlertSeverity, AlertStatus, SymptomStatus } from "@/lib/types";

const tones = {
  neutral: "bg-surface-2 text-muted border-line",
  info: "bg-primary-soft text-primary border-primary/20",
  ok: "bg-ok-soft text-ok border-ok/20",
  warn: "bg-warn-soft text-warn border-warn/25",
  danger: "bg-danger-soft text-danger border-danger/25",
};
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

/** Shown wherever synthetic/simulated data is displayed. */
export function DemoBadge({ label = "Demo data", className }: { label?: string; className?: string }) {
  return (
    <Badge tone="warn" icon={<FlaskConical aria-hidden className="h-3 w-3" />} className={className}>
      {label}
    </Badge>
  );
}

/** Severity always shown as icon + text, never colour alone. */
export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  if (severity === "urgent") return <Badge tone="danger" icon={<AlertOctagon aria-hidden className="h-3 w-3" />}>Urgent</Badge>;
  if (severity === "attention") return <Badge tone="warn" icon={<AlertTriangle aria-hidden className="h-3 w-3" />}>Needs attention</Badge>;
  return <Badge tone="info" icon={<Info aria-hidden className="h-3 w-3" />}>Info</Badge>;
}

const STATUS_TEXT: Record<AlertStatus | SymptomStatus | string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  escalated: "Escalated",
  resolved: "Resolved",
  submitted: "Submitted",
  in_review: "In review",
  follow_up_requested: "Follow-up requested",
  requested: "Requested",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  active: "Active",
  published: "Published",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = status === "resolved" || status === "completed" || status === "published" ? "ok" : status === "escalated" ? "danger" : status === "open" || status === "submitted" || status === "requested" ? "info" : "neutral";
  const Icon = status === "resolved" || status === "completed" ? CheckCircle2 : CircleDot;
  return (
    <Badge tone={tone} icon={<Icon aria-hidden className="h-3 w-3" />}>
      {STATUS_TEXT[status] ?? status}
    </Badge>
  );
}

export function OriginBadge({ origin }: { origin: string }) {
  if (origin === "simulated") return <DemoBadge label="Simulated" />;
  if (origin === "imported") return <Badge tone="info">Imported</Badge>;
  return <Badge tone="neutral">User-entered</Badge>;
}
