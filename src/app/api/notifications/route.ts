import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listNotifications, markNotificationsRead } from "@/lib/data/repo";

/** Unread count + newest unread item, polled by the bell. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 });
  const unread = (await listNotifications(user.uid)).filter((n) => !n.readAt);
  const latest = unread[0];
  return NextResponse.json(
    { count: unread.length, latest: latest ? { id: latest.id, title: latest.title, body: latest.body, emergency: latest.priority === "emergency" } : null },
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
