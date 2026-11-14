"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button, type ButtonVariant, type ButtonSize } from "./button";

/** Button that asks for confirmation in an accessible native <dialog> before running an action. */
export function ConfirmButton({
  children,
  title,
  body,
  confirmLabel = "Confirm",
  onConfirm,
  variant = "danger",
  size = "sm",
}: {
  children: ReactNode;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => ref.current?.showModal()}>
        {children}
      </Button>
      <dialog ref={ref} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-navy/50">
        <div className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-sm text-muted">{body}</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => ref.current?.close()} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={variant}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                  ref.current?.close();
                }
              }}
            >
              {busy ? "Working…" : confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
