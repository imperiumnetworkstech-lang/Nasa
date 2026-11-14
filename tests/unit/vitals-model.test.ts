import { describe, expect, it } from "vitest";
import { analyzeVitals, vitalsModel } from "@/lib/ml/vitals-model";
import { GUIDE } from "@/lib/ml/condition-guide";
import { SCENARIOS } from "@/lib/scenarios";
import { RANGES, deviationPct, statusOf } from "@/lib/ml/vitals-reference";

const EXPECTED: Record<string, string> = {
  "all-normal": "normal",
  "low-heart-rate": "bradycardia",
  "low-oxygen": "hypoxemia",
  "heavy-sweating": "dehydration",
  "high-heart-rate": "tachycardia",
  fever: "fever",
  "high-bp": "hypertension",
  "low-bp": "hypotension",
  "fast-breathing": "tachypnea",
};

describe("vitals condition model", () => {
  it("was trained and evaluated on a held-out split", () => {
    expect(vitalsModel.evaluation.testSize).toBeGreaterThan(500);
    expect(vitalsModel.evaluation.accuracy).toBeGreaterThan(0.9);
    expect(vitalsModel.data.note).toMatch(/No public labelled astronaut/);
  });

  for (const s of SCENARIOS) {
    it(`recognises the "${s.title}" scenario`, () => {
      const a = analyzeVitals(s.readings, "Vega");
      expect(a.condition).toBe(EXPECTED[s.id]);
      const sum = a.probabilities.reduce((t, p) => t + p.pct, 0);
      expect(sum).toBeGreaterThan(99);
      expect(sum).toBeLessThan(101);
    });
  }

  it("gives a personalised message with the astronaut's name and % outside range", () => {
    const a = analyzeVitals(SCENARIOS.find((s) => s.id === "low-heart-rate")!.readings, "Mateo Ruiz (Orion)");
    expect(a.message).toMatch(/^Mateo Ruiz \(Orion\): low heart rate/);
    expect(a.message).toMatch(/% below/);
    const hr = a.params.find((p) => p.key === "hr")!;
    expect(hr.status).toBe("low");
    expect(hr.deviationPct).toBeLessThan(0);
  });

  it("says the astronaut is normal when everything is in range", () => {
    const a = analyzeVitals(SCENARIOS[0].readings, "Vega");
    expect(a.severity).toBe("normal");
    expect(a.message).toMatch(/Vega is normal/);
    expect(a.params.every((p) => p.status === "normal")).toBe(true);
  });

  it("never treats a high SpO2 as a problem", () => {
    expect(statusOf("spo2", 100)).toBe("normal");
    expect(deviationPct("hr", 40)).toBe(-20);
    expect(RANGES.temp.high).toBeGreaterThan(38); // spaceflight-adjusted fever line
  });

  it("escalates clearly dangerous values to urgent", () => {
    expect(analyzeVitals({ ...SCENARIOS[0].readings, spo2: 85 }, "X").severity).toBe("urgent");
  });

  it("every condition has precautions, a remedy, and medicine guidance that needs the doctor", () => {
    for (const [k, g] of Object.entries(GUIDE)) {
      expect(g.precautions.length, k).toBeGreaterThan(0);
      expect(g.remedy.length, k).toBeGreaterThan(0);
      for (const m of g.medicines) expect(m.purpose).not.toMatch(/\d+\s?mg/); // no doses from the system
    }
  });
});
