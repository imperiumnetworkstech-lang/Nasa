import "server-only";
import { ARTICLES } from "@/lib/content/library";
import { HELP } from "@/lib/content/help";
import { listPersonal } from "@/lib/data/repo";
import { navForRole } from "@/lib/nav";
import { average } from "@/lib/health/baseline";
import type { UserProfile } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";

/**
 * Antariksha Guide — deterministic local responder (the default). It never diagnoses, prescribes
 * or makes fitness-for-duty decisions; record-based answers cite exact records and timestamps and
 * only use the current user's own authorised data.
 */
export interface GuideAnswer {
  text: string;
  links: { label: string; href: string }[];
  sources: { label: string; at?: string }[];
  kind: "emergency" | "refusal" | "trend" | "navigation" | "library" | "consultation" | "research" | "fallback";
}

const URGENT = /(chest pain|can'?t breathe|cannot breathe|short(ness)? of breath|unconscious|faint|severe bleeding|seizure|stroke|suicid|kill myself|overdose|anaphyla|emergency|collapsed)/i;
const MEDICAL_DECISION = /(diagnos|what (illness|disease)|prescri|dose|dosage|how much .*(take|mg)|stop taking|start taking|should i take|fit for duty|fitness for duty|cleared to|can i do (the )?eva|ignore (this|my) symptom)/i;

export async function localGuide(user: UserProfile, question: string): Promise<GuideAnswer> {
  const q = question.trim();
  if (URGENT.test(q)) {
    return {
      kind: "emergency",
      text: "This sounds like it could be urgent. Follow your mission's approved emergency and medical communication procedure now — do not wait for this app or complete a form first. Antariksha is not an emergency service and messages here may be delayed.",
      links: [{ label: "Emergency limitations", href: "/app/help#emergency" }],
      sources: [],
    };
  }
  if (MEDICAL_DECISION.test(q)) {
    return {
      kind: "refusal",
      text: "I can't diagnose, recommend medications or doses, or make fitness-for-duty decisions. Your medical team makes those decisions. I can help you prepare questions for a consultation or show your own recorded trends.",
      links: user.role === "astronaut" ? [{ label: "Request a consultation", href: "/app/crew/my-plan#consult" }, { label: "Report a symptom", href: "/app/crew/symptoms" }] : [],
      sources: [],
    };
  }
  const lower = q.toLowerCase();

  if (user.role === "astronaut" && /(trend|how am i|sleep|heart|hydrat|stress|summar|doing)/.test(lower)) {
    return trendAnswer(user);
  }
  if (/(consult|prepare|questions? for)/.test(lower)) {
    return {
      kind: "consultation",
      text: "Questions you might bring to a consultation:\n• What changed recently (sleep, workload, exercise, symptoms)?\n• When did it start, and what makes it better or worse?\n• Which of my logged records would be useful to review together?\n• What should I watch for, and when should I get back in touch?",
      links: user.role === "astronaut" ? [{ label: "Request a consultation", href: "/app/crew/my-plan#consult" }, { label: "Review my history", href: "/app/crew/history" }] : [],
      sources: [],
    };
  }
  if (user.role !== "astronaut" && /(nasa|osdr|dataset|research|study|genelab|physionet|model)/.test(lower)) {
    return {
      kind: "research",
      text: "NASA's Open Science Data Repository (OSDR) holds public space life-science research data (many studies use mice, plants, cells or microbes; some are human). It is research data — not a live feed of astronaut health — and it is not suitable for individual diagnosis. Antariksha's physiological-state model was trained on the open PhysioNet Non-EEG dataset from 20 healthy volunteers on Earth and is experimental.",
      links: [
        { label: "Research Explorer", href: "/app/research/datasets" },
        { label: "Model & methodology", href: "/app/research/methodology" },
      ],
      sources: [{ label: "osdr.nasa.gov" }, { label: "physionet.org/content/noneeg/1.0.0" }],
    };
  }
  const articles = ARTICLES.filter((a) => `${a.title} ${a.topic} ${a.summary}`.toLowerCase().split(/\W+/).some((w) => w.length > 3 && lower.includes(w)));
  if (articles.length) {
    return {
      kind: "library",
      text: `I found ${articles.length} library article(s). Articles marked "General education" are not mission-approved procedures.`,
      links: articles.slice(0, 4).map((a) => ({ label: a.title, href: `/app/library#${a.slug}` })),
      sources: articles.slice(0, 4).map((a) => ({ label: `${a.title} v${a.version} (${a.approval})`, at: a.reviewDate })),
    };
  }
  const nav = navForRole(user.role).flatMap((g) => g.items);
  const navHits = nav.filter((i) => lower.split(/\W+/).some((w) => w.length > 3 && `${i.label} ${i.description ?? ""}`.toLowerCase().includes(w)));
  if (navHits.length) {
    return { kind: "navigation", text: "These pages look relevant:", links: navHits.slice(0, 5).map((i) => ({ label: i.label, href: i.href })), sources: [] };
  }
  const help = HELP.find((h) => lower.split(/\W+/).some((w) => w.length > 4 && h.q.toLowerCase().includes(w)));
  if (help) return { kind: "navigation", text: help.a, links: [{ label: "Help & FAQ", href: `/app/help#${help.id}` }], sources: [] };
  return {
    kind: "fallback",
    text: "I can explain your own recorded trends, find library articles, help you navigate, prepare consultation questions, or explain NASA research data and its limits. Try: “How has my sleep been this week?”",
    links: [{ label: "Help & FAQ", href: "/app/help" }],
    sources: [],
  };
}

async function trendAnswer(user: UserProfile): Promise<GuideAnswer> {
  const [sleep, vitals, checkIns, hydration] = await Promise.all([
    listPersonal(user.uid, "sleepLogs", { sinceDays: 14 }),
    listPersonal(user.uid, "vitals", { sinceDays: 14 }),
    listPersonal(user.uid, "checkIns", { sinceDays: 14 }),
    listPersonal(user.uid, "hydrationLogs", { sinceDays: 7 }),
  ]);
  const split = <T,>(arr: T[], at: (x: T) => string) => {
    const cut = Date.now() - 7 * 86_400_000;
    return [arr.filter((x) => Date.parse(at(x)) >= cut), arr.filter((x) => Date.parse(at(x)) < cut)] as const;
  };
  const lines: string[] = [];
  const sources: GuideAnswer["sources"] = [];
  const tz = user.preferences.timezone;
  const [s7, sPrev] = split(sleep, (s) => s.end);
  const a7 = average(s7.map((s) => s.durationMin / 60));
  const aP = average(sPrev.map((s) => s.durationMin / 60));
  if (a7 !== null) {
    lines.push(`Sleep: ${a7.toFixed(1)} h average over ${s7.length} logged nights this week${aP !== null ? ` (previous week ${aP.toFixed(1)} h)` : ""}.`);
    sources.push({ label: `${s7.length} sleep logs`, at: s7[0]?.end });
  } else lines.push("Sleep: no sleep logged this week.");
  const hr = vitals.filter((v) => v.kind === "heart_rate" && v.quality === "valid");
  const [h7, hPrev] = split(hr, (v) => v.measuredAt);
  const hrA = average(h7.map((v) => v.value));
  const hrP = average(hPrev.map((v) => v.value));
  if (hrA !== null) {
    lines.push(`Resting heart rate: ${hrA.toFixed(0)} bpm average this week${hrP !== null ? ` (previous week ${hrP.toFixed(0)} bpm)` : ""}.`);
    sources.push({ label: `${h7.length} heart-rate observations (valid quality only)`, at: h7[0]?.measuredAt });
  }
  const [c7] = split(checkIns, (c) => c.at);
  const st = average(c7.map((c) => c.stress).filter((x): x is NonNullable<typeof x> => x !== null));
  if (st !== null) {
    lines.push(`Self-reported stress: ${st.toFixed(1)}/5 average across ${c7.length} check-ins.`);
    sources.push({ label: `${c7.length} check-ins`, at: c7[0]?.at });
  }
  const total = hydration.reduce((s, h) => s + h.amountMl, 0);
  if (hydration.length) {
    lines.push(`Hydration: ${(total / 7 / 1000).toFixed(1)} L/day average logged over 7 days${user.preferences.hydrationTargetMl ? ` (your target ${user.preferences.hydrationTargetMl / 1000} L)` : ""}.`);
    sources.push({ label: `${hydration.length} hydration entries`, at: hydration[0]?.at });
  }
  lines.push("These are descriptions of your own records, not a medical assessment.");
  return {
    kind: "trend",
    text: lines.join("\n"),
    links: [
      { label: "Sleep trends", href: "/app/crew/sleep" },
      { label: "Vitals & sensors", href: "/app/crew/health" },
    ],
    sources: sources.map((s) => ({ ...s, label: `${s.label}${s.at ? `, latest ${fmtDateTime(s.at, tz)}` : ""}` })),
  };
}
