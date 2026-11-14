import type { FoodRating } from "@/lib/types";

/**
 * Menu Fatigue Radar — pure logic.
 * Menu fatigue = an item someone used to enjoy is now rated lower or left uneaten.
 * Onset differs a lot between people, so every comparison is against the person's OWN earlier
 * ratings of the same item. Not a nutrition assessment.
 */
export interface ItemTrend {
  item: string;
  count: number;
  firstAvg: number;
  recentAvg: number;
  lastAt: string;
  fatigued: boolean;
  favourite: boolean;
}

export interface FatigueReport {
  items: ItemTrend[];
  fatigued: ItemTrend[];
  favourites: ItemTrend[];
  /** Share of meals finished in the last 7 days vs the 7 days before (null if too little data). */
  finishedRecent: number | null;
  finishedBefore: number | null;
  appetiteDropping: boolean;
  /** Items to try next: favourites not eaten recently, then untried pantry items. */
  suggestions: { item: string; why: string }[];
  /** Items to rest for a while. */
  rest: { item: string; why: string }[];
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function analyseFood(ratings: FoodRating[], pantry: string[], now: Date): FatigueReport {
  const byItem = new Map<string, FoodRating[]>();
  for (const r of [...ratings].sort((a, b) => a.at.localeCompare(b.at))) {
    byItem.set(r.item, [...(byItem.get(r.item) ?? []), r]);
  }
  const items: ItemTrend[] = [...byItem.entries()].map(([item, rs]) => {
    const scores = rs.map((r) => (r.ate === "none" ? Math.min(r.rating, 2) : r.rating));
    const k = Math.min(3, Math.floor(scores.length / 2) || 1);
    const firstAvg = avg(scores.slice(0, k));
    const recentAvg = avg(scores.slice(-k));
    return {
      item,
      count: rs.length,
      firstAvg,
      recentAvg,
      lastAt: rs[rs.length - 1].at,
      // Needs at least 4 ratings, and a clear drop from the person's own starting point.
      fatigued: rs.length >= 4 && firstAvg - recentAvg >= 1.5,
      favourite: rs.length >= 2 && recentAvg >= 4,
    };
  });

  const day = 86_400_000;
  const inWindow = (r: FoodRating, from: number, to: number) => {
    const t = now.getTime() - Date.parse(r.at);
    return t >= from * day && t < to * day;
  };
  const share = (rs: FoodRating[]) => (rs.length >= 5 ? rs.filter((r) => r.ate === "all").length / rs.length : null);
  const finishedRecent = share(ratings.filter((r) => inWindow(r, 0, 7)));
  const finishedBefore = share(ratings.filter((r) => inWindow(r, 7, 14)));
  const appetiteDropping = finishedRecent !== null && finishedBefore !== null && finishedBefore - finishedRecent >= 0.25;

  const fatigued = items.filter((i) => i.fatigued).sort((a, b) => a.recentAvg - a.firstAvg - (b.recentAvg - b.firstAvg));
  const favourites = items.filter((i) => i.favourite && !i.fatigued).sort((a, b) => b.recentAvg - a.recentAvg);
  const daysSince = (iso: string) => (now.getTime() - Date.parse(iso)) / day;

  const suggestions: FatigueReport["suggestions"] = [];
  for (const f of favourites) {
    if (daysSince(f.lastAt) >= 5) suggestions.push({ item: f.item, why: `You rated it ${f.recentAvg.toFixed(1)}/5 and haven't had it for ${Math.floor(daysSince(f.lastAt))} days` });
  }
  for (const p of pantry) {
    if (!byItem.has(p)) suggestions.push({ item: p, why: "You haven't tried this yet" });
  }

  return {
    items,
    fatigued,
    favourites,
    finishedRecent,
    finishedBefore,
    appetiteDropping,
    suggestions: suggestions.slice(0, 5),
    rest: fatigued.map((f) => ({ item: f.item, why: `Down from ${f.firstAvg.toFixed(1)} to ${f.recentAvg.toFixed(1)} out of 5` })),
  };
}
