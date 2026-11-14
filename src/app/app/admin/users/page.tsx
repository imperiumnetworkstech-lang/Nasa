import type { Metadata } from "next";
import { requireSection } from "@/lib/auth/current-user";
import { listInvites, listMissions, listUsers } from "@/lib/data/repo";
import { inviteForm } from "@/lib/actions/forms";
import { fmtDateTime } from "@/lib/utils";
import { ROLES, ROLE_LABELS } from "@/lib/types";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRow } from "@/components/admin/user-row";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select } from "@/components/ui/form";

export const metadata: Metadata = { title: "Users & invites" };

export default async function AdminUsers() {
  const me = await requireSection("admin");
  const [users, missions, invites] = await Promise.all([listUsers(), listMissions(), listInvites()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Users & invites" description="Role and mission changes are enforced on the server and audited. Admins cannot change their own role." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={`Users (${users.length})`} />
          <CardBody>
            <ul className="space-y-2">
              {users.map((u) => (
                <UserRow key={u.uid} self={u.uid === me.uid} u={{ uid: u.uid, displayName: u.displayName, email: u.email, role: u.role, status: u.status, missionId: u.missionId, isDemo: u.isDemo }} missions={missions.map((m) => ({ id: m.id, missionCode: m.missionCode }))} />
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card className="self-start">
          <CardHeader title="Invitation codes" description="The only way (besides an admin) to grant a privileged role at sign-up." />
          <CardBody className="space-y-4">
            <ActionForm action={inviteForm} submitLabel="Create invite">
              <Field label="Role" htmlFor="iv-role">
                <Select id="iv-role" name="role" defaultValue="astronaut">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mission" htmlFor="iv-m">
                <Select id="iv-m" name="mission">
                  <option value="">None</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.missionCode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Uses" htmlFor="iv-u">
                <Input id="iv-u" name="uses" type="number" min={1} max={500} defaultValue={1} />
              </Field>
            </ActionForm>
            <ul className="space-y-2 text-sm">
              {invites.map((i) => (
                <li key={i.code} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2">
                  <code className="font-semibold">{i.code}</code>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <Badge>{i.role}</Badge> {i.usesLeft} left · {fmtDateTime(i.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
