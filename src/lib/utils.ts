import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Timezone-aware formatting. All timestamps are stored in UTC ISO-8601. */
export function fmtDateTime(iso: string | null | undefined, tz = "UTC", opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: tz, ...opts }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  }
}

export function fmtDate(iso: string | null | undefined, tz = "UTC") {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: tz }).format(new Date(iso));
}

export function fmtTime(iso: string | null | undefined, tz = "UTC") {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}

export function relativeTime(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "never";
  const diff = (now - Date.parse(iso)) / 1000;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? "ago" : "from now";
  if (abs < 60) return diff >= 0 ? "just now" : "in under a minute";
  if (abs < 3600) return `${Math.round(abs / 60)} min ${suffix}`;
  if (abs < 86400) return `${Math.round(abs / 3600)} h ${suffix}`;
  return `${Math.round(abs / 86400)} d ${suffix}`;
}

export function dayKey(iso: string, tz = "UTC") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function missionDay(startAt: string, at = new Date()) {
  return Math.floor((at.getTime() - Date.parse(startAt)) / 86_400_000) + 1;
}

export function round(n: number, dp = 1) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export const SCALE_LABELS: Record<string, string[]> = {
  overall: ["Very poor", "Poor", "Okay", "Good", "Very good"],
  fatigue: ["None", "Slight", "Moderate", "High", "Exhausted"],
  stress: ["None", "Low", "Moderate", "High", "Very high"],
  pain: ["None", "Slight", "Moderate", "Strong", "Severe"],
  mood: ["Very low", "Low", "Neutral", "Good", "Very good"],
  quality: ["Very poor", "Poor", "Fair", "Good", "Excellent"],
  recovery: ["Not recovered", "Slightly", "Partly", "Mostly", "Fully"],
  focus: ["Very low", "Low", "Moderate", "Good", "Sharp"],
};

export function scaleLabel(kind: keyof typeof SCALE_LABELS | string, v: number | null | undefined) {
  if (v === null) return "Prefer not to answer";
  if (v === undefined) return "—";
  return SCALE_LABELS[kind]?.[v - 1] ?? String(v);
}

/**
 * Current time for request-time rendering (server components render once per request).
 * Wrapped so time-dependent logic has a single, explicit entry point.
 */
export function requestTime(): number {
  return Date.now();
}
