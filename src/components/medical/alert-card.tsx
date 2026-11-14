"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpCircle, Check, CheckCheck, ChevronDown, MessageSquarePlus, RotateCcw, UserCheck } from "lucide-react";
import { alertAction } from "@/lib/actions/medical";
import type { Alert, AlertStatus } from "@/lib/types";
import { Badge, OriginBadge, SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Action = "acknowledge" | "assign" | "escalate" | "resolve" | "reopen";
const NEXT: Record<Action, AlertStatus> = { acknowledge: "acknowledged", assign: "assigned", escalate: "escalated", resolve: "resolved", reopen: "open" };
const LABEL: Record<Action, string> = { acknowledge: "Acknowledged", assign: "Assigned to you", escalate: "Escalated", resolve: "Resolved", reopen: "Reopened" };

const BAR = { urgent: "bg-coral", attention: "bg-amber", info: "bg-primary" } as const;

/**
 * Interactive alert card: one-tap responses with optimistic status, spinner, toast and Undo.
 * Every action still goes through the audited server action.
 */
export function AlertCard({
  alert,
  tz,
  ruleDescription,
  assigneeName,
  observedAtLabel,
  history,
}: {
  alert: Pick<Alert, "id" | "crewUid" | "crewLabel" | "title" | "observed" | "source" | "reason" | "dataState" | "recommendedAction" | "severity" | "status" | "operational" | "ruleId" | "ruleVersion" | "origin">;
  tz: string;
  ruleDescription: string;
  assigneeName: string | null;
  observedAtLabel: string;
  history: { when: string; action: string; by: string; note?: string }[];
}) {
  const [status, setStatus] = useState<AlertStatus>(alert.status);
  const [busy, setBusy] = useState<Action | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  void tz;

  async function act(action: Action, opts: { silent?: boolean } = {}) {
    const before = status;
    setBusy(action);
    setStatus(NEXT[action]); // optimistic
    try {
      const r = await alertAction({ alertId: alert.id, action, note: note.trim() || undefined });
      if (!r.ok) throw new Error(r.message);
      setNote("");
      setNoteOpen(false);
      if (opts.silent) toast({ tone: "info", title: "Undone", body: alert.title });
      else {
        const undoAction = (Object.entries(NEXT).find(([, v]) => v === before)?.[0] as Action | undefined) ?? "reopen";
        toast({
          tone: "success",
          title: `${LABEL[action]} · ${alert.crewLabel}`,
          body: alert.title,
          action: {
            label: "Undo",
            onClick: async () => {
              const r = await alertAction({ alertId: alert.id, action: before === "open" ? "reopen" : undoAction, note: "Undo" });
              toast(r.ok ? { tone: "info", title: "Undone", body: alert.title } : { tone: "error", title: "Couldn't undo", body: r.message });
              router.refresh();
            },
          },
        });
      }
      start(() => router.refresh());
    } catch (e) {
      setStatus(before);
      toast({ tone: "error", title: "Couldn't update the alert", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  const resolved = status === "resolved";
  const actions: { a: Action; label: string; icon: typeof Check; variant: "primary" | "secondary" | "outline" }[] = resolved
    ? [{ a: "reopen", label: "Reopen", icon: RotateCcw, variant: "outline" }]
    : [
        ...(status === "open" ? [{ a: "acknowledge" as const, label: "Acknowledge", icon: Check, variant: "primary" as const }] : []),
        ...(status !== "assigned" ? [{ a: "assign" as const, label: "Assign to me", icon: UserCheck, variant: "secondary" as const }] : []),
        ...(status !== "escalated" ? [{ a: "escalate" as const, label: "Escalate", icon: ArrowUpCircle, variant: "outline" as const }] : []),
        { a: "resolve", label: "Resolve", icon: CheckCheck, variant: status === "open" ? "outline" : "primary" },
      ];

  return (
    <section
      id={alert.id}
      className={cn(
        "pop-in relative overflow-hidden rounded-[var(--radius-card)] border border-line/60 bg-surface shadow-[var(--shadow-card)] transition-opacity",
        resolved && "opacity-70",
        alert.severity === "urgent" && status === "open" && "attention-pulse",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", BAR[alert.severity])} />
      <div className="space-y-3 p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              <Link href={`/app/medical/crew/${alert.crewUid}`} className="font-semibold text-primary hover:underline">
                {alert.crewLabel}
              </Link>{" "}
              · {observedAtLabel}
            </p>
            <h2 className="text-base font-semibold leading-snug">{alert.title}</h2>
            <p className="text-sm text-muted">
              {alert.observed} · {alert.source}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <SeverityBadge severity={alert.severity} />
            <StatusBadge status={status} />
            <OriginBadge origin={alert.origin} />
          </div>
        </div>

        <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
          <span className="font-medium">Next step: </span>
          {alert.recommendedAction}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {actions.map(({ a, label, icon: Icon, variant }) => (
            <Button key={a} size="sm" variant={variant} loading={busy === a} disabled={busy !== null} onClick={() => act(a)}>
              {busy === a ? null : <Icon aria-hidden className="h-4 w-4" />}
              {label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setNoteOpen((o) => !o)} aria-expanded={noteOpen}>
            <MessageSquarePlus aria-hidden className="h-4 w-4" /> Note
          </Button>
        </div>

        {noteOpen ? (
          <div className="pop-in">
            <label htmlFor={`note-${alert.id}`} className="sr-only">
              Note for {alert.title}
            </label>
            <input
              id={`note-${alert.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Optional note — saved with your next action"
              className="h-10 w-full rounded-full border border-line bg-surface-2/60 px-4 text-sm"
            />
          </div>
        ) : null}

        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-1 text-sm font-semibold text-primary">
          Why was this flagged?
          <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        {open ? (
          <div className="pop-in space-y-3 text-sm">
            <p>{alert.reason}</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge tone={alert.dataState === "fresh" ? "ok" : "warn"}>
                {alert.dataState === "fresh" ? "Fresh data" : alert.dataState === "stale" ? "Stale data — consider repeating" : alert.dataState === "missing" ? "Missing data" : "Sparse data"}
              </Badge>
              <Badge tone={alert.operational ? "info" : "neutral"}>{alert.operational ? "Commander sees “medical review in progress”" : "Medical team only"}</Badge>
              {assigneeName ? <Badge>Assigned: {assigneeName}</Badge> : null}
            </div>
            <p className="text-xs text-muted">
              Rule <code>{alert.ruleId}</code> v{alert.ruleVersion}: {ruleDescription}
            </p>
            <ol className="space-y-1 border-l-2 border-line pl-3 text-xs text-muted">
              {history.map((h, i) => (
                <li key={i}>
                  {h.when} · <strong className="text-fg">{h.action}</strong> — {h.by}
                  {h.note ? `: ${h.note}` : ""}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
