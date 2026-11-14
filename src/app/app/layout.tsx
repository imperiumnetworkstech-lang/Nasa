import { AppShell } from "@/components/shell/app-shell";
import type { SearchItem } from "@/components/shell/command-palette";
import { requireUser } from "@/lib/auth/current-user";
import { ARTICLES } from "@/lib/content/library";
import { HELP } from "@/lib/content/help";
import { getMission, getSettings, listCrew, listNotifications } from "@/lib/data/repo";
import { navForRole } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/types";

export default async function AuthedLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const [mission, notifications, settings] = await Promise.all([
    user.missionId ? getMission(user.missionId) : null,
    listNotifications(user.uid),
    getSettings(),
  ]);
  const groups = navForRole(user.role);
  const search: SearchItem[] = [
    ...groups.flatMap((g) => g.items.map((i) => ({ label: i.label, href: i.href, group: g.label, keywords: i.description }))),
    ...HELP.map((h) => ({ label: h.q, href: `/app/help#${h.id}`, group: "Help" })),
    ...ARTICLES.map((a) => ({ label: a.title, href: `/app/library#${a.slug}`, group: "Library", keywords: a.topic })),
  ];
  // Authorised records: medical officers can jump to their assigned crew.
  if (user.role === "medical" && user.missionId) {
    for (const c of await listCrew(user.missionId)) search.push({ label: `${c.callSign} — ${c.displayName}`, href: `/app/medical/crew/${c.uid}`, group: "Assigned crew" });
  }
  return (
    <AppShell
      user={{
        displayName: user.displayName,
        callSign: user.callSign,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role],
        isDemo: user.isDemo,
        missionName: mission ? `${mission.missionCode} · ${mission.isDemo ? "Demo mission" : mission.name}` : null,
        unread: notifications.filter((n) => !n.readAt).length,
      }}
      groups={groups}
      search={search}
      commDelaySeconds={settings.commDelaySeconds}
    >
      {children}
    </AppShell>
  );
}
