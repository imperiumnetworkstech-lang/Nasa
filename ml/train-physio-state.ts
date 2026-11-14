/**
 * Trains Antariksha's EXPERIMENTAL physiological-state model from an open dataset.
 *
 * Dataset: Birjandtalab J, Cogan D, Pouyan MB, Nourani M. "Non-EEG Dataset for Assessment of
 * Neurological Status" (v1.0.0), PhysioNet. https://doi.org/10.13026/C2J01F
 * Licence: Open Data Commons Attribution License v1.0.
 * 20 healthy adult volunteers on Earth, wrist-worn sensors: heart rate, SpO2, electrodermal
 * activity (EDA, a sweat-gland activity signal), skin temperature, 3-axis acceleration.
 * Stage labels: Relax, PhysicalStress, CognitiveStress, EmotionalStress.
 *
 * Model: multinomial logistic regression on 30 s windows, features expressed relative to each
 * person's own Relax baseline (matching the app's personal-baseline philosophy).
 * Evaluation: leave-one-subject-out cross-validation (the subject being scored is never seen in
 * training), then a final fit on all subjects.
 *
 * Limitations (also surfaced in the UI): small lab cohort, Earth gravity, scripted stressors.
 * NOT validated for astronauts, microgravity, diagnosis, or fitness-for-duty decisions.
 *
 * Run: npm run ml:train   (expects data in ml/data/noneeg — see ml/README.md)
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "ml", "data", "noneeg", "non-eeg-dataset-for-assessment-of-neurological-status-1.0.0");
const OUT_MODEL = path.join(process.cwd(), "src", "lib", "ml", "physio-state-model.json");
const OUT_SAMPLES = path.join(process.cwd(), "src", "lib", "ml", "physio-holdout-samples.json");

export const CLASSES = ["Relax", "PhysicalStress", "CognitiveStress", "EmotionalStress"] as const;
export const FEATURES = [
  "hr_delta", // bpm vs personal relax baseline
  "spo2_delta", // % vs baseline
  "eda_delta_z", // EDA level vs baseline, in baseline SDs
  "eda_slope", // EDA change across window, baseline SDs per minute
  "temp_delta", // °C vs baseline
  "temp_slope", // °C per minute
  "motion_mean", // mean |acc| deviation from baseline (g-normalised)
  "motion_sd", // variability of |acc|
] as const;

type Header = { fs: number; nSamples: number; signals: { name: string; gain: number; baseline: number; units: string }[] };

function readHeader(file: string): Header {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
  const [, nsig, fs_, nSamples] = lines[0].split(/\s+/);
  const signals = lines.slice(1, 1 + Number(nsig)).map((l) => {
    const parts = l.split(/\s+/);
    const m = /^([\d.]+)(?:\((-?\d+)\))?\/?(.*)$/.exec(parts[2])!;
    return { gain: Number(m[1]), baseline: Number(m[2] ?? 0), units: m[3], name: parts[parts.length - 1] };
  });
  return { fs: Number(fs_), nSamples: Number(nSamples), signals };
}

/** WFDB format 16: little-endian int16, channels interleaved. physical = (raw - baseline) / gain. */
function readSignals(base: string): { fs: number; data: Record<string, Float64Array> } {
  const h = readHeader(base + ".hea");
  const buf = fs.readFileSync(base + ".dat");
  const n = Math.min(h.nSamples, Math.floor(buf.length / 2 / h.signals.length));
  const data: Record<string, Float64Array> = {};
  h.signals.forEach((s, ci) => {
    const arr = new Float64Array(n);
    for (let i = 0; i < n; i++) arr[i] = (buf.readInt16LE((i * h.signals.length + ci) * 2) - s.baseline) / s.gain;
    data[s.name] = arr;
  });
  return { fs: h.fs, data };
}

/** MIT annotation format: 16-bit words, top 6 bits = code, low 10 bits = interval/length. */
function readStageAnnotations(file: string): { sample: number; label: string }[] {
  const b = fs.readFileSync(file);
  const out: { sample: number; label: string }[] = [];
  let t = 0;
  let i = 0;
  while (i + 1 < b.length) {
    const w = b.readUInt16LE(i);
    i += 2;
    const code = w >> 10;
    const val = w & 0x3ff;
    if (code === 0 && val === 0) break;
    if (code === 59) {
      // SKIP: next 4 bytes are a PDP-11 long (high word first).
      t += (b.readUInt16LE(i) << 16) + b.readUInt16LE(i + 2);
      i += 4;
    } else if (code === 63) {
      const label = b.subarray(i, i + val).toString("ascii").replace(/\0/g, "");
      i += val + (val % 2);
      const last = out[out.length - 1];
      if (last && last.label === "") last.label = label;
    } else if (code === 59 || code === 60 || code === 61 || code === 62) {
      // NUM/SUB/CHN: no time advance
    } else {
      t += val;
      out.push({ sample: t, label: "" });
    }
  }
  return out.filter((a) => a.label);
}

const mean = (a: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : 0;
};
const sd = (a: ArrayLike<number>) => {
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return a.length > 1 ? Math.sqrt(s / (a.length - 1)) : 0;
};
const slopePerMin = (a: ArrayLike<number>, fs: number) => {
  const n = a.length;
  if (n < 2) return 0;
  const xm = (n - 1) / 2;
  const ym = mean(a);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (a[i] - ym);
    den += (i - xm) ** 2;
  }
  return (num / den) * fs * 60;
};

type Window = { subject: number; label: (typeof CLASSES)[number]; x: number[]; raw: Record<string, number> };

function windowsForSubject(subject: number): Window[] {
  const acc = readSignals(path.join(DATA_DIR, `Subject${subject}_AccTempEDA`));
  const vit = readSignals(path.join(DATA_DIR, `Subject${subject}_SpO2HR`));
  const ann = readStageAnnotations(path.join(DATA_DIR, `Subject${subject}_AccTempEDA.atr`));
  const fsA = acc.fs; // 8 Hz
  const fsV = vit.fs; // 1 Hz
  const nA = acc.data.temp.length;
  const mag = new Float64Array(nA);
  for (let i = 0; i < nA; i++) mag[i] = Math.hypot(acc.data.ax[i], acc.data.ay[i], acc.data.az[i]);

  const segments = ann.map((a, k) => ({ label: a.label, start: a.sample, end: k + 1 < ann.length ? ann[k + 1].sample : nA }));
  const relax = segments.filter((s) => s.label === "Relax");
  const firstRelax = relax[0];
  // Personal baseline = first Relax stage.
  const sliceA = (name: string, s: number, e: number) => acc.data[name].subarray(s, e);
  const sliceV = (name: string, sA: number, eA: number) =>
    vit.data[name].subarray(Math.floor(sA / fsA * fsV), Math.floor(eA / fsA * fsV));
  const base = {
    hr: mean(sliceV("hr", firstRelax.start, firstRelax.end)),
    spo2: mean(sliceV("SpO2", firstRelax.start, firstRelax.end)),
    eda: mean(sliceA("EDA", firstRelax.start, firstRelax.end)),
    edaSd: Math.max(sd(sliceA("EDA", firstRelax.start, firstRelax.end)), 0.05),
    temp: mean(sliceA("temp", firstRelax.start, firstRelax.end)),
    mag: mean(mag.subarray(firstRelax.start, firstRelax.end)),
    magSd: Math.max(sd(mag.subarray(firstRelax.start, firstRelax.end)), 0.01),
  };

  const out: Window[] = [];
  const W = 30 * fsA; // 30 s windows, 15 s hop
  const hop = 15 * fsA;
  for (const seg of segments) {
    const label = seg.label as (typeof CLASSES)[number];
    if (!CLASSES.includes(label)) continue;
    for (let s = seg.start; s + W <= seg.end; s += hop) {
      const e = s + W;
      const hr = mean(sliceV("hr", s, e));
      const spo2 = mean(sliceV("SpO2", s, e));
      const eda = sliceA("EDA", s, e);
      const temp = sliceA("temp", s, e);
      const m = mag.subarray(s, e);
      const raw = {
        hr,
        spo2,
        edaMean: mean(eda),
        tempMean: mean(temp),
        motionMean: mean(m),
      };
      out.push({
        subject,
        label,
        raw,
        x: [
          hr - base.hr,
          spo2 - base.spo2,
          (mean(eda) - base.eda) / base.edaSd,
          slopePerMin(eda, fsA) / base.edaSd,
          mean(temp) - base.temp,
          slopePerMin(temp, fsA),
          (mean(m) - base.mag) / base.magSd,
          sd(m) / base.magSd,
        ],
      });
    }
  }
  return out;
}

// ---- Multinomial logistic regression (softmax) with L2, full-batch gradient descent ----
type Model = { W: number[][]; b: number[]; mu: number[]; sigma: number[] };

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function standardise(rows: number[][]): { mu: number[]; sigma: number[] } {
  const d = rows[0].length;
  const mu = Array.from({ length: d }, (_, j) => mean(rows.map((r) => r[j])));
  const sigma = Array.from({ length: d }, (_, j) => Math.max(sd(rows.map((r) => r[j])), 1e-6));
  return { mu, sigma };
}

function clip(v: number) {
  return Math.max(-6, Math.min(6, v));
}

function train(data: Window[], { epochs = 1500, lr = 0.3, l2 = 1e-3 } = {}): Model {
  const { mu, sigma } = standardise(data.map((w) => w.x));
  const X = data.map((w) => w.x.map((v, j) => clip((v - mu[j]) / sigma[j])));
  const Y = data.map((w) => CLASSES.indexOf(w.label));
  const K = CLASSES.length;
  const D = FEATURES.length;
  // Class weights counter the Relax-heavy class balance.
  const counts = Array(K).fill(0);
  Y.forEach((y) => counts[y]++);
  const cw = counts.map((c) => (c ? data.length / (K * c) : 0));
  const W = Array.from({ length: K }, () => Array(D).fill(0));
  const b = Array(K).fill(0);
  for (let ep = 0; ep < epochs; ep++) {
    const gW = Array.from({ length: K }, () => Array(D).fill(0));
    const gb = Array(K).fill(0);
    let wsum = 0;
    for (let i = 0; i < X.length; i++) {
      const p = softmax(W.map((wk, k) => b[k] + wk.reduce((s, v, j) => s + v * X[i][j], 0)));
      const w = cw[Y[i]];
      wsum += w;
      for (let k = 0; k < K; k++) {
        const g = w * (p[k] - (Y[i] === k ? 1 : 0));
        gb[k] += g;
        for (let j = 0; j < D; j++) gW[k][j] += g * X[i][j];
      }
    }
    for (let k = 0; k < K; k++) {
      b[k] -= (lr * gb[k]) / wsum;
      for (let j = 0; j < D; j++) W[k][j] -= lr * (gW[k][j] / wsum + l2 * W[k][j]);
    }
  }
  return { W, b, mu, sigma };
}

function predict(m: Model, x: number[]): number[] {
  const xs = x.map((v, j) => clip((v - m.mu[j]) / m.sigma[j]));
  return softmax(m.W.map((wk, k) => m.b[k] + wk.reduce((s, v, j) => s + v * xs[j], 0)));
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Dataset not found at ${DATA_DIR}. See ml/README.md for the download step.`);
    process.exit(1);
  }
  const subjects = Array.from({ length: 20 }, (_, i) => i + 1);
  const all: Window[] = subjects.flatMap((s) => windowsForSubject(s));
  console.log(`Windows: ${all.length} from ${subjects.length} subjects`);
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, all.filter((w) => w.label === c).length]));
  console.log("Class counts:", byClass);

  // Leave-one-subject-out CV.
  const K = CLASSES.length;
  const confusion = Array.from({ length: K }, () => Array(K).fill(0));
  for (const s of subjects) {
    const m = train(all.filter((w) => w.subject !== s), { epochs: 600 });
    for (const w of all.filter((w) => w.subject === s)) {
      const p = predict(m, w.x);
      confusion[CLASSES.indexOf(w.label)][p.indexOf(Math.max(...p))]++;
    }
  }
  const total = confusion.flat().reduce((a, b) => a + b, 0);
  const correct = confusion.reduce((s, row, i) => s + row[i], 0);
  const recall = Object.fromEntries(CLASSES.map((c, i) => [c, confusion[i][i] / Math.max(1, confusion[i].reduce((a, b) => a + b, 0))]));
  const precision = Object.fromEntries(
    CLASSES.map((c, i) => [c, confusion[i][i] / Math.max(1, confusion.reduce((s, row) => s + row[i], 0))]),
  );
  const balancedAccuracy = Object.values(recall).reduce((a, b) => a + b, 0) / K;
  console.log(`LOSO accuracy ${(correct / total).toFixed(3)}, balanced accuracy ${balancedAccuracy.toFixed(3)}`);
  console.log("Recall:", recall);
  console.log("Confusion (rows=true, cols=pred):", confusion);

  const final = train(all);
  const model = {
    name: "Antariksha physiological-state indicator",
    version: "1.0.0",
    status: "experimental",
    trainedAt: new Date().toISOString(),
    algorithm: "Multinomial logistic regression (softmax, L2, class-weighted), 30 s windows, 15 s hop",
    classes: CLASSES,
    features: FEATURES,
    featureDescriptions: {
      hr_delta: "Heart rate minus personal relaxed baseline (bpm)",
      spo2_delta: "SpO₂ minus personal relaxed baseline (%)",
      eda_delta_z: "Electrodermal activity (sweat response) vs baseline, in baseline SDs",
      eda_slope: "Electrodermal activity trend within the window (baseline SDs / min)",
      temp_delta: "Skin temperature minus personal baseline (°C)",
      temp_slope: "Skin temperature trend within the window (°C / min)",
      motion_mean: "Mean movement intensity vs baseline (baseline SDs)",
      motion_sd: "Movement variability vs baseline (baseline SDs)",
    },
    standardisation: { mu: final.mu, sigma: final.sigma },
    weights: final.W,
    bias: final.b,
    evaluation: {
      method: "Leave-one-subject-out cross-validation",
      windows: all.length,
      subjects: subjects.length,
      classCounts: byClass,
      accuracy: correct / total,
      balancedAccuracy,
      recall,
      precision,
      confusion,
    },
    dataset: {
      name: "Non-EEG Dataset for Assessment of Neurological Status (v1.0.0)",
      authors: "Birjandtalab J, Cogan D, Pouyan MB, Nourani M",
      publisher: "PhysioNet",
      url: "https://physionet.org/content/noneeg/1.0.0/",
      doi: "https://doi.org/10.13026/C2J01F",
      licence: "Open Data Commons Attribution License v1.0",
      population: "20 healthy adult volunteers, laboratory protocol on Earth",
    },
    limitations: [
      "Trained on 20 healthy volunteers on Earth with scripted stressors — not astronauts, not microgravity.",
      "Indicates which lab stage the signal pattern most resembles; it does not measure stress, illness or performance.",
      "Not a medical device, not diagnostic, and must never be used for fitness-for-duty or mission decisions.",
      "Requires a personal relaxed baseline from the same sensor; outputs are unreliable without one.",
    ],
  };
  fs.mkdirSync(path.dirname(OUT_MODEL), { recursive: true });
  fs.writeFileSync(OUT_MODEL, JSON.stringify(model, null, 1));

  // A few real held-out windows (from a subject excluded from a LOSO fold) for the in-app demo.
  const holdSubject = 20;
  const holdModel = train(all.filter((w) => w.subject !== holdSubject), { epochs: 600 });
  const samples = CLASSES.flatMap((c) =>
    all
      .filter((w) => w.subject === holdSubject && w.label === c)
      .filter((_, i) => i % 3 === 0)
      .slice(0, 2)
      .map((w) => ({ trueLabel: w.label, features: w.x.map((v) => +v.toFixed(4)), raw: w.raw, looPrediction: predict(holdModel, w.x).map((p) => +p.toFixed(3)) })),
  );
  fs.writeFileSync(
    OUT_SAMPLES,
    JSON.stringify({ subject: `PhysioNet noneeg Subject${holdSubject} (excluded from training in this fold)`, samples }, null, 1),
  );
  console.log(`Wrote ${path.relative(process.cwd(), OUT_MODEL)} and ${path.relative(process.cwd(), OUT_SAMPLES)}`);
}

main();
