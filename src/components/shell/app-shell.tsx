"use client";

import { ChevronDown, HelpCircle, LogOut, Menu, Moon, Sun, UserRound, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { DemoBadge } from "@/components/ui/badge";
import { GuidePanel } from "@/components/guide/guide-panel";
import type { NavGroup, NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { CommandPalette, type SearchItem } from "./command-palette";
import { NavIcon } from "./icons";
import { NotificationBell, playChime, setSoundEnabled, soundEnabled } from "./notification-bell";
import { SyncStatus } from "./sync-status";
import { applyTheme } from "./theme-toggle";

export interface ShellUser {
  displayName: string;
  callSign?: string;
  roleLabel: string;
  role: string;
  isDemo: boolean;
  missionName: string | null;
  unread: number;
}

function isActive(pathname: string, href: string) {
  const roots = ["/app/research", "/app/crew/dashboard", "/app/medical/dashboard", "/app/mission/dashboard"];
  return pathname === href || (!roots.includes(href) && pathname.startsWith(href + "/"));
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
        active ? "hero-gradient font-semibold text-white shadow-[var(--shadow-pop)]" : "text-fg/80 hover:bg-primary-soft hover:text-primary",
      )}
    >
      <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}

function NavList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-3">
      {groups.map((g) =>
        g.collapsed ? (
          <details key={g.label} open={g.items.some((i) => isActive(pathname, i.href)) || undefined} className="group">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-2xl px-3 text-sm font-medium text-muted hover:bg-surface-2">
              {g.label}
              <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-1 space-y-0.5">
              {g.items.map((i) => (
                <li key={i.href}>
                  <NavLink item={i} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <ul key={g.label} className="space-y-1">
            {g.items.map((i) => (
              <li key={i.href}>
                <NavLink item={i} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        ),
      )}
    </nav>
  );
}

/** Mobile bottom tab bar: the role's main items (max 4) + Profile. */
function BottomTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((i) => {
          const active = isActive(pathname, i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "font-semibold text-primary" : "text-muted")}>
                <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary-soft")}>
                  <NavIcon name={i.icon} className="h-5 w-5" />
                </span>
                <span className="max-w-[4.5rem] truncate">{i.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** One avatar button holding everything personal: profile, theme, sound, help, sign out. */
function AccountMenu({ user }: { user: ShellUser }) {
  const [dark, setDark] = useState(false);
  const [sound, setSound] = useState(true);
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  useEffect(() => {
    const t = setTimeout(() => {
      setDark(document.documentElement.classList.contains("dark"));
      setSound(soundEnabled());
    }, 0);
    return () => clearTimeout(t);
  }, [open]);
  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2";
  return (
    <div className="relative">
      <button onClick={() => setOpenOn(open ? null : pathname)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-2 shadow-[var(--shadow-card)] active:scale-95" aria-label="Account menu">
        <span className="hero-gradient flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" aria-hidden>
          {(user.callSign ?? user.displayName).slice(0, 2).toUpperCase()}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 text-muted" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpenOn(null)} aria-hidden />
          <div role="menu" className="pop-in absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
            <div className="px-3 py-2">
              <p className="truncate font-semibold">{user.displayName}</p>
              <p className="truncate text-xs text-muted">{user.roleLabel}</p>
              {user.missionName ? <p className="truncate text-xs text-muted">{user.missionName}</p> : null}
              {user.isDemo ? <DemoBadge label="Demo account" className="mt-1" /> : null}
            </div>
            <div className="my-1 h-px bg-line" />
            <Link role="menuitem" href="/app/profile" className={item} onClick={() => setOpenOn(null)}>
              <UserRound aria-hidden className="h-4 w-4" /> My profile
            </Link>
            <button
              role="menuitem"
              className={item}
              onClick={() => {
                applyTheme(dark ? "light" : "dark");
                setDark(!dark);
              }}
            >
              {dark ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />} {dark ? "Light mode" : "Dark mode"}
            </button>
            <button
              role="menuitem"
              className={item}
              onClick={() => {
                setSoundEnabled(!sound);
                setSound(!sound);
                if (!sound) playChime();
              }}
            >
              {sound ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />} Notification sound: {sound ? "on" : "off"}
            </button>
            <Link role="menuitem" href="/app/help" className={item} onClick={() => setOpenOn(null)}>
              <HelpCircle aria-hidden className="h-4 w-4" /> Help
            </Link>
            <div className="my-1 h-px bg-line" />
            <form action="/api/auth/logout" method="post">
              <button role="menuitem" type="submit" className={cn(item, "text-danger")}>
                <LogOut aria-hidden className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function AppShell({ user, groups, search, commDelaySeconds, children }: { user: ShellUser; groups: NavGroup[]; search: SearchItem[]; commDelaySeconds: number; children: ReactNode }) {
  const pathname = usePathname();
  // Drawer is tied to the path it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const mobileOpen = openOn === pathname;
  const setMobileOpen = (open: boolean) => setOpenOn(open ? pathname : null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const main = groups.find((g) => !g.collapsed)?.items ?? [];
  const tabs: NavItem[] = [...main.slice(0, 4), { href: "/app/profile", label: "Me", icon: "UserRound" }];

  const sidebar = (
    <div className="flex h-full flex-col border-r border-line bg-surface px-3 py-5">
      <div className="mb-6 px-2">
        <Wordmark href="/app" />
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        <NavList groups={groups} onNavigate={() => setMobileOpen(false)} />
      </div>
      <p className="mt-4 px-2 text-[11px] leading-snug text-muted">{user.missionName ?? "No mission"} · Not a medical device.</p>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-screen lg:block">{sidebar}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[min(86vw,18rem)]">
            {sidebar}
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Close navigation">
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-20 bg-bg/85 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-fg hover:bg-surface lg:hidden" aria-label="Open navigation">
              <Menu aria-hidden className="h-5 w-5" />
            </button>
            <CommandPalette items={search} />
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <SyncStatus commDelaySeconds={commDelaySeconds} />
              <NotificationBell initialCount={user.unread} />
              <AccountMenu user={user} />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>
      <BottomTabs items={tabs} />
      <GuidePanel role={user.role} />
    </div>
  );
}
