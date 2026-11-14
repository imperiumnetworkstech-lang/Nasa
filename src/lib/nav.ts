import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in the client nav
  description?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
  /** Folded away under "More" so the main menu stays short. */
  collapsed?: boolean;
}

/**
 * Every role gets a short main menu (3–5 items) and one folded "More" section.
 * Notifications live on the bell; profile, theme and sign-out live in the avatar menu.
 */
const MENUS: Record<Role, { main: NavItem[]; more: NavItem[] }> = {
  // Crew never see research or data tooling.
  astronaut: {
    main: [
      { href: "/app/crew/dashboard", label: "Home", icon: "LayoutDashboard", description: "How am I doing today?" },
      { href: "/app/crew/health", label: "My body", icon: "HeartPulse", description: "Heart, oxygen, sweat, temperature" },
      { href: "/app/crew/symptoms", label: "Get help", icon: "Stethoscope", description: "Tell the doctor how you feel" },
      { href: "/app/crew/ask", label: "Ask the doctor", icon: "MessageCircleQuestion", description: "Send a question, see where it is" },
    ],
    more: [
      { href: "/app/crew/sleep", label: "Sleep", icon: "Moon" },
      { href: "/app/crew/hydration", label: "Water & food", icon: "GlassWater" },
      { href: "/app/crew/activity", label: "Exercise", icon: "Dumbbell" },
      { href: "/app/crew/mood", label: "Mood", icon: "Smile" },
      { href: "/app/crew/skills", label: "Skill practice", icon: "GraduationCap" },
      { href: "/app/crew/cognitive-readiness", label: "Focus check", icon: "Brain" },
      { href: "/app/crew/medications", label: "Medicines", icon: "Pill" },
      { href: "/app/crew/my-plan", label: "Plan & messages", icon: "ListChecks" },
      { href: "/app/crew/history", label: "History", icon: "History" },
      { href: "/app/library", label: "Self-care tips", icon: "Library" },
      { href: "/app/help", label: "Help", icon: "LifeBuoy" },
    ],
  },
  medical: {
    main: [
      { href: "/app/medical/dashboard", label: "Home", icon: "LayoutDashboard" },
      { href: "/app/medical/alerts", label: "Alerts", icon: "BellRing" },
      { href: "/app/medical/questions", label: "Questions", icon: "MessageCircleQuestion" },
      { href: "/app/medical/crew", label: "Crew", icon: "Users" },
    ],
    more: [
      { href: "/app/medical/care-plans", label: "Care plans", icon: "ListChecks" },
      { href: "/app/medical/consultations", label: "Calls & messages", icon: "MessagesSquare" },
      { href: "/app/medical/skills", label: "Skill Keeper", icon: "GraduationCap" },
      { href: "/app/medical/mission-timeline", label: "Mission timeline", icon: "CalendarRange" },
      { href: "/app/medical/audit-log", label: "Audit log", icon: "ScrollText" },
      { href: "/app/knowledge", label: "Crew lessons", icon: "Lightbulb" },
      { href: "/app/help", label: "Help", icon: "LifeBuoy" },
    ],
  },
  commander: {
    main: [
      { href: "/app/mission/dashboard", label: "Home", icon: "LayoutDashboard" },
      { href: "/app/mission/crew-readiness", label: "Crew", icon: "ShieldCheck" },
      { href: "/app/mission/operations", label: "Schedule", icon: "GanttChart" },
      { href: "/app/mission/timeline", label: "Timeline", icon: "CalendarRange" },
    ],
    more: [
      { href: "/app/knowledge", label: "Crew lessons", icon: "Lightbulb" },
      { href: "/app/help", label: "Help", icon: "LifeBuoy" },
    ],
  },
  researcher: {
    main: [
      { href: "/app/research", label: "Home", icon: "LayoutDashboard" },
      { href: "/app/research/datasets", label: "Datasets", icon: "Database" },
      { href: "/app/research/insights", label: "Insights", icon: "LineChart" },
    ],
    more: [
      { href: "/app/research/methodology", label: "Methodology", icon: "BookOpen" },
      { href: "/app/knowledge", label: "Crew lessons", icon: "Lightbulb" },
      { href: "/app/help", label: "Help", icon: "LifeBuoy" },
    ],
  },
  admin: {
    main: [
      { href: "/app/admin/users", label: "People", icon: "Users", description: "Roles, missions and invites" },
      { href: "/app/admin/missions", label: "Missions", icon: "Rocket" },
      { href: "/app/admin/settings", label: "Settings", icon: "Settings" },
    ],
    more: [
      { href: "/app/admin/roles", label: "Who can see what", icon: "KeyRound" },
      { href: "/app/help", label: "Help", icon: "LifeBuoy" },
    ],
  },
};

export function navForRole(role: Role): NavGroup[] {
  const m = MENUS[role];
  return [
    { label: "Menu", items: m.main },
    { label: "More", items: m.more, collapsed: true },
  ];
}

/** Every page a role can reach from the menu (used for search). */
export function allNavItems(role: Role): NavItem[] {
  return [...MENUS[role].main, ...MENUS[role].more, { href: "/app/notifications", label: "Notifications", icon: "Bell" }, { href: "/app/profile", label: "Profile", icon: "UserRound" }];
}
