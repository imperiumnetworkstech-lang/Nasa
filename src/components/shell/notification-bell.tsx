"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

import { installAudioUnlock, playChime } from "./sound";
export { playAlarm, playChime, setSoundEnabled, soundEnabled, stopAlarm, unlockAudio } from "./sound";

/**
 * Bell with a red count badge. Checks for new notifications every 5 s; when the count goes up
 * it plays a chime (or the emergency alarm for abnormal suit readings) and shows a toast. Clicking clears the badge and opens the notification list.
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const last = useRef(initialCount);
  const router = useRouter();
  const pathname = usePathname();

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { count: number; latest: { title: string; body: string; emergency?: boolean } | null };
      if (j.count > last.current && j.latest) {
        if (j.latest.emergency) {
          // The emergency siren itself is played by the case watcher on staff portals.
          toast({ tone: "error", title: j.latest.title, body: j.latest.body, durationMs: 10000 });
        } else {
          playChime();
          toast({ tone: "info", title: j.latest.title, body: j.latest.body });
        }
      }
      last.current = j.count;
      setCount(j.count);
    } catch {
      /* offline — try again next tick */
    }
  }, []);

  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    // Check often so emergencies reach the doctor and commander within seconds.
    const t = setInterval(check, 3_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  // Being on the notifications page counts as having seen them.
  useEffect(() => {
    if (pathname === "/app/notifications" && last.current > 0) {
      last.current = 0;
      const t = setTimeout(() => setCount(0), 0);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <button
      onClick={() => {
        setCount(0);
        last.current = 0;
        void fetch("/api/notifications", { method: "POST" });
        router.push("/app/notifications");
      }}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-fg shadow-[var(--shadow-card)] transition-transform hover:text-primary active:scale-95"
      aria-label={count ? `Notifications, ${count} new` : "Notifications"}
    >
      <Bell aria-hidden className={cn("h-5 w-5", count > 0 && "animate-[wiggle_1s_ease-in-out_2]")} />
      {count > 0 ? (
        <span className="pop-in absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e5484d] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-surface">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}
