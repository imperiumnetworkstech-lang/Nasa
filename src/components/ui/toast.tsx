"use client";

import { CheckCircle2, CloudUpload, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight toast notifications for instant feedback after any action.
 * Call `toast({...})` from anywhere on the client; <Toaster /> (in the root layout) renders them.
 */
export type ToastTone = "success" | "error" | "info" | "queued";
export interface ToastInput {
  title: string;
  body?: string;
  tone?: ToastTone;
  durationMs?: number;
  /** Optional inline action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
}
interface ToastItem extends Required<Pick<ToastInput, "title" | "tone">> {
  id: number;
  body?: string;
  durationMs: number;
  action?: ToastInput["action"];
}

const EVT = "ak-toast";
let seq = 0;

export function toast(t: ToastInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastItem>(EVT, { detail: { id: ++seq, title: t.title, body: t.body, tone: t.tone ?? "success", action: t.action, durationMs: t.durationMs ?? (t.action ? 8000 : t.tone === "error" ? 7000 : 4000) } }));
}

const STYLE: Record<ToastTone, { icon: typeof Info; cls: string; iconCls: string }> = {
  success: { icon: CheckCircle2, cls: "border-ok/30", iconCls: "bg-ok-soft text-ok" },
  error: { icon: TriangleAlert, cls: "border-danger/40", iconCls: "bg-danger-soft text-danger" },
  info: { icon: Info, cls: "border-primary/30", iconCls: "bg-primary-soft text-primary" },
  queued: { icon: CloudUpload, cls: "border-warn/40", iconCls: "bg-warn-soft text-warn" },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<ToastItem>).detail;
      setItems((xs) => [...xs.slice(-3), t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.durationMs);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return (
    <div aria-live="polite" aria-atomic="false" className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-auto lg:left-auto lg:right-6 lg:top-6 lg:items-end">
      {items.map((t) => {
        const s = STYLE[t.tone];
        return (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={cn("toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-surface p-3 pr-2 shadow-[var(--shadow-pop)]", s.cls)}>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", s.iconCls)}>
              <s.icon aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="text-sm font-semibold text-fg">{t.title}</p>
              {t.body ? <p className="text-xs text-muted">{t.body}</p> : null}
            </div>
            {t.action ? (
              <button
                onClick={() => {
                  t.action!.onClick();
                  setItems((xs) => xs.filter((x) => x.id !== t.id));
                }}
                className="shrink-0 self-center rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary hover:brightness-95"
              >
                {t.action.label}
              </button>
            ) : null}
            <button onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Dismiss">
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
