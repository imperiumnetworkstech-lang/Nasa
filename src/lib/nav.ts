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
}

// Astronaut menu: few items, plain words. No research, datasets or technical tools.
const crew: NavGroup[] = [
  {
    label: "Me",
    items: [
      { href: "/app/crew/dashboard", label: "Home", icon: "LayoutDashboard", description: "How am I doing today?" },
      { href: "/app/crew/check-in", label: "Check-in", icon: "ClipboardCheck", description: "Daily one-minute check-in" },
      { href: "/app/crew/health", label: "My body", icon: "HeartPulse", description: "Heart, oxygen, sweat, temperature" },
      { href: "/app/crew/sleep", label: "Sleep", icon: "Moon" },
      { href: "/app/crew/hydration", label: "Water & food", icon: "GlassWater" },
      { href: "/app/crew/activity", label: "Exercise", icon: "Dumbbell" },
      { href: "/app/crew/mood", label: "Mood", icon: "Smile" },
      { href: "/app/crew/cognitive-readiness", label: "Focus check", icon: "Brain" },
    ],
  },
  {
    label: "Care",
    items: [
      { href: "/app/crew/symptoms", label: "Get help", icon: "Stethoscope", description: "Tell the doctor how you feel" },
      { href: "/app/crew/medications", label: "Medicines", icon: "Pill" },
      { href: "/app/crew/my-plan", label: "Plan & messages", icon: "ListChecks" },
    ],
  },
];

const medical: NavGroup[] = [
  {
    label: "Medical operations",
    items: [
      { href: "/app/medical/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/app/medical/crew", label: "Assigned crew", icon: "Users" },
      { href: "/app/medical/alerts", label: "Alert centre", icon: "BellRing" },
      { href: "/app/medical/care-plans", label: "Care plans", icon: "ListChecks" },
      { href: "/app/medical/consultations", label: "Consultations", icon: "MessagesSquare" },
      { href: "/app/medical/mission-timeline", label: "Mission context", icon: "CalendarRange" },
      { href: "/app/medical/audit-log", label: "Audit log", icon: "ScrollText" },
    ],
  },
];

const commander: NavGroup[] = [
  {
    label: "Mission",
    items: [
      { href: "/app/mission/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/app/mission/crew-readiness", label: "Crew readiness", icon: "ShieldCheck" },
      { href: "/app/mission/timeline", label: "Timeline", icon: "CalendarRange" },
      { href: "/app/mission/operations", label: "Workload planner", icon: "GanttChart" },
    ],
  },
];

const research: NavGroup = {
  label: "Research",
  items: [
    { href: "/app/research", label: "Research overview", icon: "Telescope" },
    { href: "/app/research/datasets", label: "NASA OSDR datasets", icon: "Database" },
    { href: "/app/research/insights", label: "Insights & model", icon: "LineChart" },
    { href: "/app/research/methodology", label: "Methodology", icon: "BookOpen" },
  ],
};

// Admin menu: three plain items. The access-rules page is linked from People.
const admin: NavGroup[] = [
  {
    label: "Admin",
    items: [
      { href: "/app/admin/users", label: "People", icon: "Users", description: "Roles, missions and invites" },
      { href: "/app/admin/missions", label: "Missions", icon: "Rocket" },
      { href: "/app/admin/settings", label: "Settings", icon: "Settings" },
    ],
  },
];

const shared: NavGroup = {
  label: "Shared",
  items: [
    { href: "/app/knowledge", label: "Crew knowledge", icon: "Lightbulb" },
    { href: "/app/library", label: "Countermeasure library", icon: "Library" },
    { href: "/app/notifications", label: "Notifications", icon: "Bell" },
    { href: "/app/profile", label: "Profile & preferences", icon: "UserRound" },
    { href: "/app/help", label: "Help & safety", icon: "LifeBuoy" },
  ],
};

const crewShared: NavGroup = {
  label: "More",
  items: [
    { href: "/app/library", label: "Self-care tips", icon: "Library" },
    { href: "/app/notifications", label: "Notifications", icon: "Bell" },
    { href: "/app/profile", label: "Profile", icon: "UserRound" },
    { href: "/app/help", label: "Help", icon: "LifeBuoy" },
  ],
};

const adminShared: NavGroup = {
  label: "More",
  items: [
    { href: "/app/notifications", label: "Notifications", icon: "Bell" },
    { href: "/app/profile", label: "Profile", icon: "UserRound" },
    { href: "/app/help", label: "Help", icon: "LifeBuoy" },
  ],
};

export function navForRole(role: Role): NavGroup[] {
  // Crew members never see research/data tooling — that stays with staff roles.
  if (role === "astronaut") return [...crew, crewShared];
  if (role === "admin") return [...admin, adminShared];
  const main = role === "medical" ? medical : role === "commander" ? commander : [];
  return [...main, research, shared];
}
