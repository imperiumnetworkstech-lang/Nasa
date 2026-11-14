"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";

type Result = { ok: boolean; message: string };

/** Button that runs a server action and shows its result. */
export function ActionButton({ action, children, variant = "secondary", size = "sm", showResult = true }: { action: () => Promise<Result>; children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; showResult?: boolean }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await action();
              setRes(r);
              router.refresh();
            } catch {
              setRes({ ok: false, message: "Action failed — you may not have permission or be offline." });
            }
          })
        }
      >
        {pending ? "Working…" : children}
      </Button>
      {showResult && res && !res.ok ? <span className="text-xs text-danger">{res.message}</span> : null}
    </span>
  );
}

/**
 * Form wrapper for server actions. Sends the raw field values (multi-value fields as arrays)
 * plus the browser timezone offset (__tz); a server-side adapter converts and validates them.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  resetOnSuccess = true,
  className,
}: {
  action: (raw: Record<string, string | string[]>) => Promise<Result>;
  children: ReactNode;
  submitLabel: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  const router = useRouter();
  return (
    <form
      className={className ?? "space-y-4"}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const raw: Record<string, string | string[]> = { __tz: String(new Date().getTimezoneOffset()) };
        for (const key of new Set(fd.keys())) {
          const vals = fd.getAll(key).filter((v): v is string => typeof v === "string");
          raw[key] = vals.length > 1 ? vals : (vals[0] ?? "");
        }
        start(async () => {
          try {
            const r = await action(raw);
            setRes(r);
            if (r.ok) {
              if (resetOnSuccess) form.reset();
              router.refresh();
            }
          } catch {
            setRes({ ok: false, message: navigator.onLine ? "Something went wrong. Nothing was saved." : "You are offline. This was NOT sent." });
          }
        });
      }}
    >
      {children}
      <FormMessage state={res} />
      <Button type="submit" disabled={pending}>
        {pending ? "Working…" : submitLabel}
      </Button>
    </form>
  );
}
