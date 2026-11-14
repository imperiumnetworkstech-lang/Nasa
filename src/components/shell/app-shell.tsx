"use client";

import { Bell, LogOut, Menu, X } from "lucide-react";
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
import { SyncStatus } from "./sync-status";
import { ThemeToggle } from "./theme-toggle";

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
  return pathname === href || (href !== "/app/research" && pathname.startsWith(href + "/"));
}

function NavList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const active = isActive(pathname, i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
                      active ? "hero-gradient font-semibold text-white shadow-[var(--shadow-pop)]" : "text-muted hover:bg-primary-soft hover:text-primary",
                    )}
                  >
                    <NavIcon name={i.icon} className="h-[18px] w-[18px] shrink-0" />
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Mobile bottom tab bar (first four items of the role's main group + Profile). */
function BottomTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((i) => {
          const active = isActive(pathname, i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "font-semibold text-primary" : "text-muted")}>
                <span className={cn("flex h-8 w-12 items-center justify-center rounded-full", active && "bg-primary-soft")}>
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

  const mainItems = groups.flatMap((g) => g.items);
  const tabs: NavItem[] = [...mainItems.filter((i) => i.href !== "/app/profile").slice(0, 4), { href: "/app/profile", label: "Profile", icon: "UserRound" }];

  const sidebar = (
    <div className="flex h-full flex-col border-r border-line bg-surface px-3 py-5">
      <div className="mb-5 px-2">
        <Wordmark href="/app" />
      </div>
      <div className="hero-gradient mb-5 rounded-2xl px-4 py-3 text-xs text-white shadow-[var(--shadow-pop)]">
        <p className="font-semibold">{user.missionName ?? "No mission assigned"}</p>
        <p className="text-white/80">{user.roleLabel}</p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        <NavList groups={groups} onNavigate={() => setMobileOpen(false)} />
      </div>
      <p className="mt-4 px-2 text-[11px] leading-snug text-muted">Decision support only. Not a medical device. Not affiliated with NASA.</p>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17.5rem_1fr]">
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
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:block">
                <SyncStatus commDelaySeconds={commDelaySeconds} />
              </div>
              {user.isDemo ? <DemoBadge label="Demo account" className="hidden md:inline-flex" /> : null}
              <ThemeToggle />
              <Link href="/app/notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted shadow-[var(--shadow-card)] hover:text-primary" aria-label={`Notifications${user.unread ? `, ${user.unread} unread` : ""}`}>
                <Bell aria-hidden className="h-5 w-5" />
                {user.unread ? <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-coral px-1 text-center text-[10px] font-semibold leading-5 text-white">{user.unread}</span> : null}
              </Link>
              <Link href="/app/profile" className="hidden items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 shadow-[var(--shadow-card)] sm:flex">
                <span className="hero-gradient flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" aria-hidden>
                  {(user.callSign ?? user.displayName).slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-left text-xs leading-tight xl:block">
                  <span className="block font-semibold text-fg">{user.displayName}</span>
                  <span className="text-muted">{user.roleLabel}</span>
                </span>
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-fg" aria-label="Sign out">
                  <LogOut aria-hidden className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
          <div className="px-4 pb-2 sm:hidden">
            <SyncStatus commDelaySeconds={commDelaySeconds} />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>
      <BottomTabs items={tabs} />
      <GuidePanel role={user.role} />
    </div>
  );
}
