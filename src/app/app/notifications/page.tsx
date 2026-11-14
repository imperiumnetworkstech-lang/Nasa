import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BellRing, CalendarClock, ClipboardCheck, ListChecks, Pill, Stethoscope } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listNotifications } from "@/lib/data/repo";
import { markAllRead, markRead } from "@/lib/actions/shared";
import { fmtDateTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, IconTile, type TileTone } from "@/components/ui/card";
import { ActionButton } from "@/components/action-ui";

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
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Notifications" description="In-app only. Email/push are optional adapters and are never shown as delivered unless configured." actions={unread ? <ActionButton action={markAllRead}>Mark all read</ActionButton> : undefined} />
      {items.length === 0 ? <EmptyState icon={<Bell className="h-5 w-5" />} title="No notifications" body="Reminders and updates will show up here." /> : null}
      <Card>
        <CardBody className="space-y-2">
          {items.map((n) => {
            const k = KIND[n.kind] ?? KIND.system;
            return (
              <div key={n.id} className={`flex items-start gap-3 rounded-2xl p-3 ${n.readAt ? "" : "bg-primary-soft"}`}>
                <IconTile tone={k.tone} size="sm">
                  <k.icon aria-hidden className="h-4 w-4" />
                </IconTile>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    {n.title} {!n.readAt ? <span className="sr-only">(unread)</span> : null}
                  </p>
                  <p className="text-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{fmtDateTime(n.createdAt, user.preferences.timezone)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {n.href ? (
                    <Link href={n.href} className="text-xs font-semibold text-primary hover:underline">
                      Open
                    </Link>
                  ) : null}
                  {!n.readAt ? (
                    <ActionButton action={markRead.bind(null, n.id)} variant="ghost">
                      Mark read
                    </ActionButton>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
