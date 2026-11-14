"use client";

import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const SOUND_KEY = "ak-notify-sound";

export function soundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

/** Soft two-note chime made with Web Audio (no sound file needed). */
export function playChime() {
  if (!soundEnabled()) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = [880, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* audio not available */
  }
}

/**
 * Emergency alarm: a loud alternating two-tone buzz (~2 s), like a medical monitor alarm.
 * Used when an abnormal suit reading comes in.
 */
export function playAlarm(durationMs = 2200) {
  if (!soundEnabled()) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "square";
    const steps = Math.floor(durationMs / 220);
    for (let i = 0; i < steps; i++) osc.frequency.setValueAtTime(i % 2 ? 660 : 990, ctx.currentTime + i * 0.22);
    gain.gain.setValueAtTime(0.16, ctx.currentTime + durationMs / 1000 - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    if ("vibrate" in navigator) navigator.vibrate?.([300, 150, 300, 150, 300]);
    setTimeout(() => void ctx.close(), durationMs + 300);
  } catch {
    /* audio not available */
  }
}

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
          playAlarm();
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

  useEffect(() => {
    // Check often so emergencies reach the doctor and commander within seconds.
    const t = setInterval(check, 5_000);
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
