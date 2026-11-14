import type { SkillCard, SkillReview } from "@/lib/types";

/**
 * Skill Keeper — spaced practice for rarely-used crew skills.
 * Freshness decays exponentially with a half-life; each successful practice lengthens the
 * effective half-life (skills stick better with spaced repetition), a "forgot" resets it.
 * The half-life defaults are configurable placeholders, not validated decay curves.
 */
export interface SkillState {
  card: SkillCard;
  freshness: number; // 0–100
  lastAt: string | null;
  effectiveHalfLifeDays: number;
  dueAt: string;
  due: boolean;
  reviews: number;
}

const MULT: Record<SkillReview["result"], number> = { forgot: 0, hard: 1.2, ok: 1.8, easy: 2.5 };
/** Practice is due when freshness would fall below this level. */
export const DUE_BELOW = 70;

export function skillState(card: SkillCard, reviews: SkillReview[], now: Date): SkillState {
  const mine = reviews.filter((r) => r.cardId === card.id).sort((a, b) => a.at.localeCompare(b.at));
  let hl = card.halfLifeDays;
  for (const r of mine) hl = r.result === "forgot" ? card.halfLifeDays : Math.min(hl * MULT[r.result], card.halfLifeDays * 30);
  const last = mine[mine.length - 1] ?? null;
  const lastResult = last?.result;
  const days = last ? (now.getTime() - Date.parse(last.at)) / 86_400_000 : Infinity;
  const start = lastResult === "forgot" ? 60 : 100;
  const freshness = last ? Math.max(0, start * Math.pow(0.5, days / hl)) : 0;
  // Time until freshness hits DUE_BELOW.
  const daysToDue = last ? Math.max(0, hl * Math.log2(start / DUE_BELOW)) : 0;
  const dueAt = last ? new Date(Date.parse(last.at) + daysToDue * 86_400_000).toISOString() : now.toISOString();
  return { card, freshness: Math.round(freshness), lastAt: last?.at ?? null, effectiveHalfLifeDays: hl, dueAt, due: freshness < DUE_BELOW, reviews: mine.length };
}

export function deckState(cards: SkillCard[], reviews: SkillReview[], now: Date) {
  const states = cards.map((c) => skillState(c, reviews, now)).sort((a, b) => a.freshness - b.freshness);
  const avg = states.length ? Math.round(states.reduce((s, x) => s + x.freshness, 0) / states.length) : 0;
  return { states, due: states.filter((s) => s.due), averageFreshness: avg };
}
