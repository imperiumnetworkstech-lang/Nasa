"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitRecord, type SubmitOutcome } from "@/lib/offline/queue";

/** Shared submit handling for crew record forms: saved / queued offline / error states. */
export function useRecordSubmit(kind: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [last, setLast] = useState<SubmitOutcome | null>(null);

  async function submit(data: unknown, successMessage = "Saved."): Promise<SubmitOutcome> {
    setBusy(true);
    setState(null);
    setFieldErrors({});
    const r = await submitRecord(kind, data);
    setBusy(false);
    setLast(r);
    if (r.status === "saved") {
      setState({ ok: true, message: successMessage + (r.newAlerts ? " Your care team has been notified of a related flag for review." : "") });
      router.refresh();
    } else if (r.status === "queued") {
      setState({ ok: true, message: "You're offline — saved on this device as “Queued — not sent”. It will send automatically when you reconnect." });
    } else {
      setState({ ok: false, message: r.error });
      setFieldErrors(r.fieldErrors ?? {});
    }
    return r;
  }
  return { submit, busy, state, fieldErrors, last, setState };
}
