import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getInbox, listNotifications, markNotificationsRead, rebuildInbox } from "@/lib/data/repo";

/** Unread count + newest unread item for the bell. Reads ONE small summary document. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 });
  const inbox = (await getInbox(user.uid)) ?? (await rebuildInbox(user.uid));
  return NextResponse.json(
    { count: inbox.unread, v: inbox.v, latest: inbox.unread && inbox.latest ? inbox.latest : null },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Opening the bell marks everything as seen. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const unread = (await listNotifications(user.uid)).filter((n) => !n.readAt).map((n) => n.id);
  await markNotificationsRead(user.uid, unread);
  return NextResponse.json({ ok: true, cleared: unread.length });
}
