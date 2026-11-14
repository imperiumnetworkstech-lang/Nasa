/**
 * Personal Countermeasure Library — configurable educational content.
 * General education is clearly separated from mission-approved procedures. Content here is
 * general wellbeing information written for this demo; it is not medical advice and has not
 * been approved by any space agency. Medical procedures must be supplied by the mission's
 * authorised medical team.
 */
export type ApprovalStatus = "general-education" | "mission-approved" | "draft";

export interface Article {
  slug: string;
  title: string;
  topic: "Sleep" | "Exercise & mobility" | "Hydration" | "Stress" | "Ergonomics" | "Connection" | "Medical procedure";
  summary: string;
  body: string[];
  author: string;
  source: string;
  version: string;
  reviewDate: string;
  approval: ApprovalStatus;
  /** Offline-available reference material for comm-delay mode. */
  offline: boolean;
}

export const ARTICLES: Article[] = [
  {
    slug: "sleep-hygiene-basics",
    title: "Sleep hygiene in a confined habitat",
    topic: "Sleep",
    summary: "Practical habits that support a consistent sleep window when schedules shift.",
    body: [
      "Keep a consistent sleep window where the mission schedule allows, and protect it from non-essential tasks.",
      "Dim and warm the lighting in the hour before sleep; avoid bright screens close to the sleep window.",
      "Use eye masks and ear protection if the sleep station is noisy or bright.",
      "After a schedule shift, give yourself a few nights to adjust and log how you feel — patterns are easier to discuss with data.",
    ],
    author: "Antariksha content team (demo)",
    source: "General sleep-hygiene education; not mission-specific",
    version: "1.2",
    reviewDate: "2026-09-01",
    approval: "general-education",
    offline: true,
  },
  {
    slug: "mobility-breaks",
    title: "Short mobility breaks during long work blocks",
    topic: "Exercise & mobility",
    summary: "Two-to-five minute routines to break up prolonged static postures.",
    body: [
      "Every 60–90 minutes of static work, take a short break to move gently through comfortable ranges of motion.",
      "Focus on neck, shoulders, upper and lower back, hips and ankles.",
      "Stop any movement that causes sharp pain and report persistent discomfort to your medical officer.",
    ],
    author: "Antariksha content team (demo)",
    source: "General ergonomics education",
    version: "1.0",
    reviewDate: "2026-08-15",
    approval: "general-education",
    offline: true,
  },
  {
    slug: "hydration-habits",
    title: "Building hydration habits",
    topic: "Hydration",
    summary: "Habit cues for regular drinking. Targets are set by you or your medical team.",
    body: [
      "Link drinking to existing routines (after each check-in, before each procedure block).",
      "Keep a container visible at your workstation.",
      "Antariksha never prescribes a fluid target — use the target configured by you or your medical team.",
    ],
    author: "Antariksha content team (demo)",
    source: "General habit-formation education",
    version: "1.1",
    reviewDate: "2026-07-20",
    approval: "general-education",
    offline: true,
  },
  {
    slug: "box-breathing",
    title: "Paced breathing and grounding",
    topic: "Stress",
    summary: "A simple paced-breathing exercise and a 5-4-3-2-1 grounding technique.",
    body: [
      "Paced breathing: inhale gently for 4 seconds, hold 4, exhale 4, hold 4. Repeat for a few minutes. Stop at any time if you feel uncomfortable.",
      "Grounding: notice 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell and 1 you can taste.",
      "If stress feels persistent or overwhelming, you can request a private support conversation from the Mood page.",
    ],
    author: "Antariksha content team (demo)",
    source: "General stress-management education",
    version: "1.0",
    reviewDate: "2026-09-10",
    approval: "general-education",
    offline: true,
  },
  {
    slug: "workstation-ergonomics",
    title: "Workstation ergonomics",
    topic: "Ergonomics",
    summary: "Adjusting restraints, screens and tools to reduce strain.",
    body: [
      "Position displays at or slightly below eye level and within comfortable reach.",
      "Alternate tasks that load the same muscle groups.",
      "Report recurring discomfort early — small adjustments are easier than recovery.",
    ],
    author: "Antariksha content team (demo)",
    source: "General ergonomics education",
    version: "1.0",
    reviewDate: "2026-06-30",
    approval: "general-education",
    offline: false,
  },
  {
    slug: "staying-connected",
    title: "Staying connected during communication delays",
    topic: "Connection",
    summary: "Ideas for meaningful contact with family and the crew when replies take longer.",
    body: [
      "Record longer, story-like messages rather than expecting back-and-forth conversation.",
      "Schedule shared crew meals or activities to maintain social connection.",
      "It is normal to find delays frustrating; talking about it with crewmates or the care team can help.",
    ],
    author: "Antariksha content team (demo)",
    source: "General psychosocial education",
    version: "1.0",
    reviewDate: "2026-09-05",
    approval: "general-education",
    offline: true,
  },
  {
    slug: "procedure-placeholder-vitals",
    title: "Repeat vital-sign measurement (procedure placeholder)",
    topic: "Medical procedure",
    summary: "Placeholder showing where a mission-approved procedure would live. Not a real procedure.",
    body: [
      "This slot is reserved for a procedure supplied and approved by the mission's medical team.",
      "Demo deployments intentionally ship without real medical procedures.",
    ],
    author: "Mission medical team (to be supplied)",
    source: "Awaiting mission medical approval",
    version: "0.1",
    reviewDate: "2026-11-01",
    approval: "draft",
    offline: false,
  },
];
