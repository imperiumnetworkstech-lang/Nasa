"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";

type Result = { ok: boolean; message: string };

const FAILED = () => (navigator.onLine ? "Something went wrong. Nothing was saved." : "You are offline. This was NOT sent.");

/** Button that runs a server action, shows a spinner, and confirms with a toast. */
export function ActionButton({
  action,
  children,
  variant = "secondary",
  size = "sm",
  successTitle,
  className,
}: {
  action: () => Promise<Result>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  showResult?: boolean;
  successTitle?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      className={className}
      onClick={() =>
        start(async () => {
          try {
            const r = await action();
            toast({ tone: r.ok ? "success" : "error", title: r.ok ? (successTitle ?? r.message) : "Couldn't do that", body: r.ok && successTitle ? r.message : r.ok ? undefined : r.message });
            router.refresh();
          } catch {
            toast({ tone: "error", title: "Couldn't do that", body: FAILED() });
          }
        })
      }
    >
      {children}
    </Button>
  );
}

/**
 * Form wrapper for server actions. Sends the raw field values (multi-value fields as arrays)
 * plus the browser timezone offset (__tz); a server-side adapter converts and validates them.
 * Success shows a toast; errors stay next to the form so they're easy to fix.
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
        setRes(null);
        start(async () => {
          try {
            const r = await action(raw);
            if (r.ok) {
              toast({ tone: "success", title: r.message });
              // Keep success visible inline too when it carries something to copy (e.g. invite codes).
              setRes(r.message.includes(":") ? r : null);
              if (resetOnSuccess) form.reset();
              router.refresh();
            } else setRes(r);
          } catch {
            setRes({ ok: false, message: FAILED() });
          }
        });
      }}
    >
      {children}
      <FormMessage state={res} />
      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
