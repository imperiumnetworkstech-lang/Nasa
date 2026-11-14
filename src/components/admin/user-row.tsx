"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { assignMission, changeRole, setUserStatus } from "@/lib/actions/admin";
import { ROLES, ROLE_SHORT, type Role } from "@/lib/types";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";


const select = "h-10 w-full rounded-full border border-line bg-surface-2/60 px-3 text-sm text-fg disabled:opacity-60";

export function UserRow({ u, missions, self }: { u: { uid: string; displayName: string; email: string; role: Role; status: string; missionId: string | null; isDemo: boolean }; missions: { id: string; missionCode: string }[]; self: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message });
      router.refresh();
    });
  const suspended = u.status === "suspended";
  return (
    <li className={`rounded-2xl bg-surface-2 p-3 sm:p-4 ${suspended ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="hero-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" aria-hidden>
          {u.displayName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {u.displayName} {self ? <Badge tone="info">You</Badge> : null} {suspended ? <Badge tone="danger">Suspended</Badge> : null} {u.isDemo ? <DemoBadge label="Demo" /> : null}
          </p>
          <p className="truncate text-xs text-muted">{u.email}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[9rem_9rem_auto] sm:items-center">
          <label className="sr-only" htmlFor={`role-${u.uid}`}>
            Role for {u.displayName}
          </label>
          <select id={`role-${u.uid}`} disabled={self || pending} defaultValue={u.role} onChange={(e) => run(() => changeRole({ uid: u.uid, role: e.target.value }))} className={select} title={self ? "You can't change your own role" : "Role"}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_SHORT[r]}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`mission-${u.uid}`}>
            Mission for {u.displayName}
          </label>
          <select id={`mission-${u.uid}`} disabled={pending} defaultValue={u.missionId ?? ""} onChange={(e) => run(() => assignMission({ uid: u.uid, missionId: e.target.value || null }))} className={select} title="Mission">
            <option value="">No mission</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.missionCode}
              </option>
            ))}
          </select>
          {self ? (
            <span className="hidden sm:block" />
          ) : (
            <details className="relative col-span-2 sm:col-span-1">
              <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-full px-3 text-muted hover:bg-surface" aria-label={`More options for ${u.displayName}`}>
                <MoreHorizontal aria-hidden className="h-5 w-5" />
              </summary>
              <div className="mt-2 sm:absolute sm:right-0 sm:z-10 sm:w-48 sm:rounded-2xl sm:bg-surface sm:p-2 sm:shadow-[var(--shadow-pop)]">
                {suspended ? (
                  <ConfirmButton variant="secondary" title="Let them back in?" body={`${u.displayName} will be able to sign in again.`} confirmLabel="Reactivate" onConfirm={() => run(() => setUserStatus(u.uid, "active"))}>
                    Reactivate account
                  </ConfirmButton>
                ) : (
                  <ConfirmButton title="Suspend this account?" body={`${u.displayName} won't be able to sign in until you reactivate them. Their records are kept.`} confirmLabel="Suspend" onConfirm={() => run(() => setUserStatus(u.uid, "suspended"))}>
                    Suspend account
                  </ConfirmButton>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
      {msg ? (
        <p role="status" className={`mt-2 text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>
          {msg.text}
        </p>
      ) : null}
    </li>
  );
}
