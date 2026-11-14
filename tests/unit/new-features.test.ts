import { describe, expect, it } from "vitest";
import { analyseFood } from "@/lib/food/fatigue";
import { freeSlots, weeklyBalance } from "@/lib/exercise/balance";
import { deckState, skillState } from "@/lib/skills/schedule";
import { earliestReply, nextWindow, questionStage, questionTiming } from "@/lib/questions/eta";
import type { ActivityLog, FoodRating, MissionEvent, SkillCard, SkillReview } from "@/lib/types";

const now = new Date("2026-11-14T12:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const base = { uid: "u", missionId: "m", origin: "user" as const, createdAt: ago(0), enteredBy: "u" };

describe("Menu Fatigue Radar", () => {
  const r = (d: number, item: string, rating: FoodRating["rating"], ate: FoodRating["ate"] = "all"): FoodRating => ({ ...base, id: `${item}${d}`, at: ago(d), item, rating, ate });

  it("flags an item whose ratings dropped from the person's own starting point", () => {
    const ratings = [r(20, "Stew", 5), r(16, "Stew", 5), r(12, "Stew", 4), r(8, "Stew", 3), r(4, "Stew", 2), r(1, "Stew", 2, "none")];
    const rep = analyseFood(ratings, ["Stew", "Dal"], now);
    expect(rep.fatigued.map((f) => f.item)).toEqual(["Stew"]);
    expect(rep.rest[0].why).toMatch(/Down from/);
  });

  it("does not flag with too few ratings or stable ratings", () => {
    expect(analyseFood([r(3, "Stew", 5), r(1, "Stew", 2)], [], now).fatigued).toHaveLength(0);
    expect(analyseFood([r(9, "Rice", 4), r(6, "Rice", 4), r(3, "Rice", 4), r(1, "Rice", 4)], [], now).fatigued).toHaveLength(0);
  });

  it("suggests favourites not eaten lately and untried pantry items", () => {
    const rep = analyseFood([r(12, "Curry", 5), r(9, "Curry", 5)], ["Curry", "Dal"], now);
    expect(rep.suggestions.map((s) => s.item)).toEqual(["Curry", "Dal"]);
  });

  it("detects a drop in finished meals week over week", () => {
    const before = [8, 9, 10, 11, 12].map((d) => r(d, `A${d}`, 4, "all"));
    const recent = [1, 2, 3, 4, 5].map((d) => r(d, `B${d}`, 3, d % 2 ? "some" : "none"));
    expect(analyseFood([...before, ...recent], [], now).appetiteDropping).toBe(true);
  });
});

describe("Exercise Balance", () => {
  const a = (d: number, category: ActivityLog["category"], durationMin: number): ActivityLog => ({ ...base, id: `${category}${d}`, at: ago(d), category, name: category, durationMin, intensity: "moderate", soreness: null, recovery: null });
  const plan = { resistanceMinPerWeek: 300, aerobicMinPerWeek: 150, mobilityMinPerWeek: 60 };

  it("computes weekly debt per category from the last 7 days only", () => {
    const b = weeklyBalance([a(1, "resistance", 200), a(2, "aerobic", 150), a(10, "mobility", 60)], plan, now);
    expect(b.find((x) => x.category === "resistance")).toMatchObject({ doneMin: 200, debtMin: 100 });
    expect(b.find((x) => x.category === "aerobic")).toMatchObject({ debtMin: 0, pct: 100 });
    expect(b.find((x) => x.category === "mobility")).toMatchObject({ doneMin: 0, debtMin: 60 });
  });

  it("finds free daytime slots that avoid the crew member's planned events", () => {
    const busy: MissionEvent = { id: "e", missionId: "m", type: "eva", title: "EVA", start: "2026-11-14T13:00:00Z", end: "2026-11-14T19:00:00Z", workload: "high", crewUids: ["u"], createdBy: "c", createdAt: "", origin: "user" };
    const slots = freeSlots([busy], "u", now);
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      const h = new Date(s.start).getUTCHours();
      expect(h).toBeGreaterThanOrEqual(8);
      expect(h).toBeLessThanOrEqual(19);
      expect(Date.parse(s.start) >= Date.parse(busy.end!) || Date.parse(s.end) <= Date.parse(busy.start)).toBe(true);
    }
  });
});

describe("Skill Keeper", () => {
  const card: SkillCard = { id: "c1", missionId: "m", title: "Kit", prompt: "?", answer: "!", category: "kit", halfLifeDays: 14, authoredBy: "doc", createdAt: ago(30), origin: "user" };
  const rev = (d: number, result: SkillReview["result"]): SkillReview => ({ ...base, id: `r${d}`, at: ago(d), cardId: "c1", result });

  it("is due when never practised", () => {
    expect(skillState(card, [], now)).toMatchObject({ freshness: 0, due: true });
  });

  it("decays with time and halves at the half-life", () => {
    expect(skillState(card, [rev(14, "hard")], now).freshness).toBeGreaterThan(50);
    const s = skillState({ ...card, halfLifeDays: 10 }, [], now);
    expect(s.due).toBe(true);
  });

  it("successful spaced practice lengthens retention; forgetting resets it", () => {
    const good = skillState(card, [rev(40, "ok"), rev(20, "easy")], now);
    expect(good.effectiveHalfLifeDays).toBeGreaterThan(card.halfLifeDays);
    const reset = skillState(card, [rev(40, "easy"), rev(1, "forgot")], now);
    expect(reset.effectiveHalfLifeDays).toBe(card.halfLifeDays);
    expect(reset.due).toBe(true);
  });

  it("deck lists least-fresh skills first", () => {
    const other = { ...card, id: "c2" };
    const d = deckState([card, other], [{ ...rev(1, "easy"), cardId: "c2" }], now);
    expect(d.states[0].card.id).toBe("c1");
    expect(d.due.map((s) => s.card.id)).toEqual(["c1"]);
  });
});

describe("Ask the Doctor timing", () => {
  it("sends immediately with a continuous link and adds the light delay", () => {
    const t = questionTiming(now, { delaySeconds: 600, windowEveryHours: 0 });
    expect(t.sendAt).toBe(now.toISOString());
    expect(Date.parse(t.arriveAt) - Date.parse(t.sendAt)).toBe(600_000);
  });

  it("waits for the next communication window", () => {
    expect(nextWindow(new Date("2026-11-14T13:10:00Z"), 4).toISOString()).toBe("2026-11-14T16:00:00.000Z");
  });

  it("never shows an answer before it could physically arrive", () => {
    const q = { sendAt: ago(0), arriveAt: new Date(now.getTime() + 60_000).toISOString(), answer: null };
    expect(questionStage(q, now.getTime())).toBe("travelling");
    const answered = { ...q, arriveAt: ago(1), answer: { arriveAt: new Date(now.getTime() + 60_000).toISOString() } };
    expect(questionStage(answered, now.getTime())).toBe("reply-travelling");
    expect(Date.parse(earliestReply(now.toISOString(), { delaySeconds: 600, windowEveryHours: 0 })) - now.getTime()).toBe(600_000);
  });
});
