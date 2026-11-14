import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BellRing, CalendarClock, ChevronRight, ClipboardCheck, ListChecks, Pill, Stethoscope } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listNotifications, markNotificationsRead } from "@/lib/data/repo";
import { relativeTime, requestTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { IconTile, type TileTone } from "@/components/ui/card";

export const metadata: Metadata = { title: "Notifications" };

const KIND: Record<string, { icon: typeof Bell; tone: TileTone }> = {
  check_in: { icon: ClipboardCheck, tone: "violet" },
  medication: { icon: Pill, tone: "pink" },
  care_plan: { icon: ListChecks, tone: "green" },
  medical_review: { icon: Stethoscope, tone: "blue" },
  alert: { icon: BellRing, tone: "amber" },
  schedule: { icon: CalendarClock, tone: "teal" },
  system: { icon: Bell, tone: "violet" },
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.uid);
  // Opening this page counts as seeing them: clear the bell, but keep "New" labels for this visit.
  const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id);
  if (unreadIds.length) await markNotificationsRead(user.uid, unreadIds);
  const now = requestTime();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Notifications" />
      {items.length === 0 ? <EmptyState icon={<Bell className="h-5 w-5" />} title="You're all caught up" body="New updates will appear here with a sound." /> : null}
      <ul className="space-y-2">
        {items.map((n) => {
          const k = KIND[n.kind] ?? KIND.system;
          const isNew = unreadIds.includes(n.id);
          const body = (
            <>
              <IconTile tone={k.tone} size="sm">
                <k.icon aria-hidden className="h-4 w-4" />
              </IconTile>
              <span className="min-w-0 flex-1 text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  {n.title}
                  {isNew ? <span className="rounded-full bg-[#e5484d] px-1.5 py-0.5 text-[10px] font-bold text-white">New</span> : null}
                </span>
                <span className="block text-muted">{n.body}</span>
                <span className="block text-xs text-muted">{relativeTime(n.createdAt, now)}</span>
              </span>
              {n.href ? <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted" /> : null}
            </>
          );
          const cls = `pop-in flex items-center gap-3 rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)] ${isNew ? "bg-primary-soft" : "bg-surface"}`;
          return (
            <li key={n.id}>
              {n.href ? (
                <Link href={n.href} className={`lift ${cls}`}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
