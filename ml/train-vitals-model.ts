/**
 * Trains Antariksha's vitals condition model.
 *
 * There is no public astronaut suit-sensor dataset with labelled conditions, so this script
 * builds a labelled SYNTHETIC dataset from the published reference ranges in
 * src/lib/ml/vitals-reference.ts (spaceflight-adjusted where research exists), including
 * borderline and mixed cases, then trains a multinomial logistic regression with
 * deviation features and evaluates it on a held-out split.
 *
 * When real suit data with doctor-confirmed labels becomes available, pass it with
 *   npm run ml:vitals -- --csv path/to/labelled.csv   (columns: hr,spo2,sbp,dbp,temp,skinTemp,rr,eda,label)
 *
 * Output: src/lib/ml/vitals-model.json
 */
import fs from "node:fs";
import path from "node:path";
import { RANGES, VITAL_KEYS, type Readings } from "../src/lib/ml/vitals-reference";
import { CONDITIONS, type Condition } from "../src/lib/ml/condition-guide";
import { featurize } from "../src/lib/ml/vitals-features";

let seed = 20261114;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const gauss = (m: number, s: number) => m + s * Math.sqrt(-2 * Math.log(Math.max(rnd(), 1e-9))) * Math.cos(2 * Math.PI * rnd());
const uni = (a: number, b: number) => a + (b - a) * rnd();
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** A healthy resting astronaut (spaceflight-adjusted typical values). */
function normal(): Readings {
  return {
    hr: clamp(gauss(66, 7), 52, 96),
    spo2: clamp(gauss(97.8, 0.9), 95.2, 100),
    sbp: clamp(gauss(112, 8), 94, 132),
    dbp: clamp(gauss(70, 6), 57, 86),
    temp: clamp(gauss(37.4, 0.3), 36.4, 38.1),
    skinTemp: clamp(gauss(33, 0.8), 31, 35),
    rr: clamp(gauss(15, 1.8), 11, 20.5),
    eda: clamp(gauss(4, 1.8), 0.8, 10.5),
  };
}

/**
 * One astronaut's PERSONAL usual values (their baseline / "digital twin").
 * People differ: a fit astronaut may rest at 55 bpm, another at 75.
 */
function person(): Readings {
  return normal();
}

/**
 * Sample one example of a condition for a given person: start at THEIR usual values, then
 * shift the defining signals. `early` marks early-warning examples: a big change from the
 * person's own usual that is still inside the general normal range (only personal features
 * can catch these).
 */
function sample(c: Condition, base: Readings): { r: Readings; early: boolean } {
  const r = { ...base };
  for (const k of VITAL_KEYS) r[k] += gauss(0, (RANGES[k].high - RANGES[k].low) * 0.03); // normal day-to-day wobble
  let early = false;
  switch (c) {
    case "normal":
      break;
    case "bradycardia":
      if (rnd() < 0.3 && base.hr >= 72) {
        early = true; // e.g. usual 78 → 51: still "in range" but a big drop for this person
        r.hr = uni(50, base.hr - 22);
      } else r.hr = uni(30, 49);
      r.sbp -= uni(0, 10);
      break;
    case "tachycardia":
      if (rnd() < 0.3 && base.hr <= 66) {
        early = true; // e.g. usual 58 → 95: still under 100, but +60% for this person
        r.hr = uni(base.hr + 30, 99);
      } else r.hr = uni(102, 150);
      r.rr += uni(0, 3);
      break;
    case "hypoxemia":
      r.spo2 = uni(78, 94);
      r.hr += uni(5, 25);
      r.rr += uni(2, 8);
      break;
    case "dehydration":
      r.eda = uni(12.5, 30);
      r.skinTemp = uni(34.5, 37);
      r.hr += uni(8, 28);
      r.sbp -= uni(0, 12);
      break;
    case "fever":
      if (rnd() < 0.3 && base.temp + 0.9 < 38.25) {
        early = true; // usual 37.0 → 38.1: under the 38.3 line, but +1.1 °C for this person
        r.temp = uni(base.temp + 0.9, 38.25);
      } else r.temp = uni(38.4, 40.5);
      r.hr += uni(8, 25);
      r.skinTemp += uni(0.5, 1.5);
      break;
    case "hypertension":
      r.sbp = uni(137, 180);
      r.dbp = uni(86, 112);
      break;
    case "hypotension":
      r.sbp = uni(70, 89);
      r.dbp = uni(40, 56);
      r.hr += uni(5, 30);
      break;
    case "tachypnea":
      r.rr = uni(23, 36);
      r.hr += uni(0, 15);
      break;
  }
  // Sensor noise.
  for (const k of VITAL_KEYS) r[k] += gauss(0, (RANGES[k].high - RANGES[k].low) * 0.01);
  return { r, early };
}

function softmax(z: number[]) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function train(X: number[][], Y: number[], K: number, epochs = 900, lr = 0.6, l2 = 1e-4) {
  const D = X[0].length;
  const W = Array.from({ length: K }, () => Array(D).fill(0));
  const b = Array(K).fill(0);
  for (let ep = 0; ep < epochs; ep++) {
    const gW = Array.from({ length: K }, () => Array(D).fill(0));
    const gb = Array(K).fill(0);
    for (let i = 0; i < X.length; i++) {
      const p = softmax(W.map((w, k) => b[k] + w.reduce((s, v, j) => s + v * X[i][j], 0)));
      for (let k = 0; k < K; k++) {
        const g = p[k] - (Y[i] === k ? 1 : 0);
        gb[k] += g;
        for (let j = 0; j < D; j++) gW[k][j] += g * X[i][j];
      }
    }
    for (let k = 0; k < K; k++) {
      b[k] -= (lr * gb[k]) / X.length;
      for (let j = 0; j < D; j++) W[k][j] -= lr * (gW[k][j] / X.length + l2 * W[k][j]);
    }
  }
  return { W, b };
}

function predict(m: { W: number[][]; b: number[] }, x: number[]) {
  return softmax(m.W.map((w, k) => m.b[k] + w.reduce((s, v, j) => s + v * x[j], 0)));
}

function loadCsv(file: string): { r: Readings; y: Condition }[] {
  const [head, ...rows] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const cols = head.split(",");
  return rows.map((line) => {
    const v = line.split(",");
    const r = Object.fromEntries(VITAL_KEYS.map((k) => [k, Number(v[cols.indexOf(k)])])) as Readings;
    return { r, y: v[cols.indexOf("label")] as Condition };
  });
}

type Example = { r: Readings; base: Readings; y: Condition; early: boolean };

function evaluate(model: { W: number[][]; b: number[] }, set: Example[], feats: (d: Example) => number[]) {
  const K = CONDITIONS.length;
  const confusion = Array.from({ length: K }, () => Array(K).fill(0));
  let earlyRight = 0;
  let earlyN = 0;
  for (const d of set) {
    const p = predict(model, feats(d));
    const guess = p.indexOf(Math.max(...p));
    confusion[CONDITIONS.indexOf(d.y)][guess]++;
    if (d.early) {
      earlyN++;
      if (CONDITIONS[guess] === d.y) earlyRight++;
    }
  }
  const correct = confusion.reduce((s, row, i) => s + row[i], 0);
  const recall = Object.fromEntries(CONDITIONS.map((c, i) => [c, +(confusion[i][i] / Math.max(1, confusion[i].reduce((a, b) => a + b, 0))).toFixed(3)]));
  return { accuracy: correct / set.length, recall, confusion, earlyWarning: { right: earlyRight, total: earlyN, accuracy: earlyN ? earlyRight / earlyN : null } };
}

function main() {
  const perClass = 600;
  let data: Example[] = [];
  for (const c of CONDITIONS)
    for (let i = 0; i < perClass; i++) {
      const base = person();
      const s = sample(c, base);
      data.push({ r: s.r, base, y: c, early: s.early });
    }
  const csvArg = process.argv.indexOf("--csv");
  const source =
    csvArg > 0
      ? `Synthetic (${perClass}/class) + ${process.argv[csvArg + 1]}`
      : `Synthetic from published reference ranges (${perClass} per condition, each example from a simulated astronaut with their own baseline)`;
  if (csvArg > 0) data = data.concat(loadCsv(process.argv[csvArg + 1]).map((d) => ({ ...d, base: d.r, early: false })));

  // Shuffle and split 80/20.
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  const cut = Math.floor(data.length * 0.8);
  const trainSet = data.slice(0, cut);
  const testSet = data.slice(cut);
  const K = CONDITIONS.length;

  // Full model: general-range features + personal-baseline features (32).
  const full = (d: Example) => featurize(d.r, d.base);
  const model = train(trainSet.map(full), trainSet.map((d) => CONDITIONS.indexOf(d.y)), K);
  const ev = evaluate(model, testSet, full);

  // Comparison: the same model WITHOUT personal features (general ranges only, 24).
  const generalOnly = (d: Example) => featurize(d.r, d.base).slice(0, VITAL_KEYS.length * 3);
  const plain = train(trainSet.map(generalOnly), trainSet.map((d) => CONDITIONS.indexOf(d.y)), K);
  const evPlain = evaluate(plain, testSet, generalOnly);

  console.log(`Held-out accuracy WITH personal baseline: ${(ev.accuracy * 100).toFixed(1)}% on ${testSet.length} examples`);
  console.log(`Held-out accuracy WITHOUT personal baseline: ${(evPlain.accuracy * 100).toFixed(1)}%`);
  console.log(`Early-warning cases (in range, but unusual for the person): with ${ev.earlyWarning.right}/${ev.earlyWarning.total}, without ${evPlain.earlyWarning.right}/${evPlain.earlyWarning.total}`);
  console.log("Recall per condition:", ev.recall);

  const out = {
    name: "Antariksha vitals condition model",
    version: "2.0.0",
    trainedAt: new Date().toISOString(),
    algorithm: "Multinomial logistic regression on 32 features: per vital, position in the general range + distance below/above it (24) and change from the astronaut's own baseline (8)",
    conditions: CONDITIONS,
    vitals: VITAL_KEYS,
    weights: model.W,
    bias: model.b,
    evaluation: {
      method: "Held-out 20% split",
      trainSize: trainSet.length,
      testSize: testSet.length,
      accuracy: ev.accuracy,
      recall: ev.recall,
      confusion: ev.confusion,
      earlyWarning: ev.earlyWarning,
      withoutPersonalBaseline: { accuracy: evPlain.accuracy, earlyWarning: evPlain.earlyWarning },
    },
    data: {
      source,
      note: "No public labelled astronaut suit dataset exists; examples are generated from clinical norms adjusted with spaceflight research (see vitals-reference.ts), around simulated personal baselines. Retrain with real, doctor-labelled suit data when available.",
    },
  };
  const file = path.join(process.cwd(), "src", "lib", "ml", "vitals-model.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(`Wrote ${path.relative(process.cwd(), file)}`);
}

main();
