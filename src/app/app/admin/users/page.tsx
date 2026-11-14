import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShieldCheck, Stethoscope, UserRound, Users } from "lucide-react";
import { requireSection } from "@/lib/auth/current-user";
import { listInvites, listMissions, listUsers } from "@/lib/data/repo";
import { inviteForm } from "@/lib/actions/forms";
import { ROLES, ROLE_SHORT, type Role } from "@/lib/types";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, ViewAll } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRow } from "@/components/admin/user-row";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select } from "@/components/ui/form";

export const metadata: Metadata = { title: "People" };

export default async function AdminPeople({ searchParams }: PageProps<"/app/admin/users">) {
  const me = await requireSection("admin");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 80) : "";
  const roleFilter = typeof sp.role === "string" && (ROLES as readonly string[]).includes(sp.role) ? (sp.role as Role) : null;
  const [users, missions, invites] = await Promise.all([listUsers(), listMissions(), listInvites()]);
  const shown = users.filter((u) => (!roleFilter || u.role === roleFilter) && (!q || `${u.displayName} ${u.email}`.toLowerCase().includes(q)));
  const count = (r: Role) => users.filter((u) => u.role === r).length;
  const activeInvites = invites.filter((i) => i.usesLeft > 0);
  const filterHref = (r: Role | null) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(r ? { role: r } : {}) })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="People" description="Choose each person's role and mission. Changes take effect straight away and are logged." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" icon={<Users aria-hidden className="h-5 w-5" />} label="Everyone" value={users.length} />
        <Stat tone="teal" icon={<UserRound aria-hidden className="h-5 w-5" />} label="Crew" value={count("astronaut")} />
        <Stat tone="pink" icon={<Stethoscope aria-hidden className="h-5 w-5" />} label="Doctors" value={count("medical")} />
        <Stat tone="amber" icon={<ShieldCheck aria-hidden className="h-5 w-5" />} label="Suspended" value={users.filter((u) => u.status === "suspended").length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Everyone" action={<ViewAll href="/app/admin/roles">Who can see what?</ViewAll>} />
          <CardBody className="space-y-4">
            <form role="search" className="relative">
              <label htmlFor="pq" className="sr-only">
                Search people
              </label>
              <Search aria-hidden className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input id="pq" name="q" defaultValue={q} placeholder="Search by name or email" className="h-11 w-full rounded-full border border-line bg-surface-2/60 pl-10 pr-4 text-sm" />
              {roleFilter ? <input type="hidden" name="role" value={roleFilter} /> : null}
            </form>
            <nav aria-label="Filter by role" className="flex flex-wrap gap-2">
              {[null, ...ROLES].map((r) => (
                <Link key={r ?? "all"} href={filterHref(r)} aria-current={roleFilter === r ? "true" : undefined} className={`rounded-full px-3 py-1.5 text-sm ${roleFilter === r ? "hero-gradient font-semibold text-white" : "bg-surface-2 text-muted hover:text-primary"}`}>
                  {r ? ROLE_SHORT[r] : "All"}
                </Link>
              ))}
            </nav>
            <ul className="space-y-2">
              {shown.length === 0 ? <li className="py-6 text-center text-sm text-muted">Nobody matches.</li> : null}
              {shown.map((u) => (
                <UserRow key={u.uid} self={u.uid === me.uid} u={{ uid: u.uid, displayName: u.displayName, email: u.email, role: u.role, status: u.status, missionId: u.missionId, isDemo: u.isDemo }} missions={missions.map((m) => ({ id: m.id, missionCode: m.missionCode }))} />
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader title="Invite someone" description="Make a code and share it. They enter it when they sign up and get the role you pick." />
          <CardBody className="space-y-4">
            <ActionForm action={inviteForm} submitLabel="Create invite code">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Their role" htmlFor="iv-role">
                  <Select id="iv-role" name="role" defaultValue="astronaut">
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_SHORT[r]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Mission" htmlFor="iv-m">
                  <Select id="iv-m" name="mission">
                    <option value="">No mission yet</option>
                    {missions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.missionCode}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <details>
                <summary className="cursor-pointer text-sm text-muted">More options</summary>
                <div className="mt-3">
                  <Field label="How many people can use this code?" htmlFor="iv-u">
                    <Input id="iv-u" name="uses" type="number" min={1} max={500} defaultValue={1} />
                  </Field>
                </div>
              </details>
            </ActionForm>
            {activeInvites.length ? (
              <details className="rounded-2xl bg-surface-2 p-3">
                <summary className="cursor-pointer text-sm font-semibold">Open invite codes ({activeInvites.length})</summary>
                <ul className="mt-2 space-y-2 text-sm">
                  {activeInvites.map((i) => (
                    <li key={i.code} className="flex flex-wrap items-center justify-between gap-2">
                      <code className="font-semibold tracking-wide">{i.code}</code>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <Badge>{ROLE_SHORT[i.role]}</Badge> {i.usesLeft} use{i.usesLeft === 1 ? "" : "s"} left
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
