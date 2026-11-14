"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignMission, changeRole, setUserStatus } from "@/lib/actions/admin";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/types";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function UserRow({ u, missions, self }: { u: { uid: string; displayName: string; email: string; role: Role; status: string; missionId: string | null; isDemo: boolean }; missions: { id: string; missionCode: string }[]; self: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.message);
      router.refresh();
    });
  return (
    <li className="grid gap-3 rounded-2xl bg-surface-2 p-4 text-sm md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-semibold">
          {u.displayName} {self ? <Badge tone="info">You</Badge> : null} {u.isDemo ? <DemoBadge label="Demo" /> : null}
        </p>
        <p className="truncate text-xs text-muted">{u.email}</p>
        {msg ? <p className="text-xs text-primary" role="status">{msg}</p> : null}
      </div>
      <label className="text-xs text-muted">
        Role
        <select disabled={self || pending} defaultValue={u.role} onChange={(e) => run(() => changeRole({ uid: u.uid, role: e.target.value }))} className="mt-1 block h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg disabled:opacity-60">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-muted">
        Mission
        <select disabled={pending} defaultValue={u.missionId ?? ""} onChange={(e) => run(() => assignMission({ uid: u.uid, missionId: e.target.value || null }))} className="mt-1 block h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm text-fg">
          <option value="">Unassigned</option>
          {missions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.missionCode}
            </option>
          ))}
        </select>
      </label>
      <div>
        {self ? null : u.status === "suspended" ? (
          <ConfirmButton variant="secondary" title="Reactivate account?" body={`${u.displayName} will be able to sign in again.`} confirmLabel="Reactivate" onConfirm={() => run(() => setUserStatus(u.uid, "active"))}>
            Reactivate
          </ConfirmButton>
        ) : (
          <ConfirmButton title="Suspend account?" body={`${u.displayName} will be signed out and unable to access Antariksha until reactivated. Their records are kept.`} confirmLabel="Suspend" onConfirm={() => run(() => setUserStatus(u.uid, "suspended"))}>
            Suspend
          </ConfirmButton>
        )}
      </div>
    </li>
  );
}
