"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, ScaleInput, Select, Textarea, fromLocalInput, toLocalInput } from "@/components/ui/form";
import { VITAL_META } from "@/lib/health/vitals";
import { VITAL_KINDS, type VitalKind } from "@/lib/types";
import { useRecordSubmit } from "./use-submit";

const now = () => toLocalInput(new Date());

export function CheckInForm() {
  const { submit, busy, state, fieldErrors } = useRecordSubmit("checkIns");
  const [v, setV] = useState<{ overall?: number | null; fatigue?: number | null; stress?: number | null; pain?: number | null }>({});
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const missing = (["overall", "fatigue", "stress", "pain"] as const).filter((k) => v[k] === undefined);
  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (missing.length) return;
        const r = await submit({ ...v, note: note || undefined, wantsFollowUp: followUp }, "Check-in saved. Thank you!");
        if (r.status !== "error") {
          setV({});
          setNote("");
          setFollowUp(false);
        }
      }}
    >
      <ScaleInput name="overall" legend="Overall, how do you feel?" kind="overall" value={v.overall} onChange={(x) => setV({ ...v, overall: x })} />
      <ScaleInput name="fatigue" legend="Fatigue" kind="fatigue" value={v.fatigue} onChange={(x) => setV({ ...v, fatigue: x })} />
      <ScaleInput name="stress" legend="Stress" kind="stress" value={v.stress} onChange={(x) => setV({ ...v, stress: x })} />
      <ScaleInput name="pain" legend="Pain or discomfort" kind="pain" value={v.pain} onChange={(x) => setV({ ...v, pain: x })} />
      <Field label="Anything else?" optional htmlFor="ci-note" error={fieldErrors.note} help="Visible to you and your assigned medical officer.">
        <Textarea id="ci-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Checkbox label="I'd like medical follow-up" help="Your flight surgeon will be notified to get in touch." checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || missing.length > 0}>
        {busy ? "Saving…" : missing.length ? `Answer ${missing.length} more` : "Save check-in"}
      </Button>
    </form>
  );
}

export function VitalForm() {
  const { submit, busy, state, fieldErrors } = useRecordSubmit("vitals");
  const [kind, setKind] = useState<VitalKind>("heart_rate");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [at, setAt] = useState(now);
  const [source, setSource] = useState<"manual" | "device" | "imported">("manual");
  const [device, setDevice] = useState("");
  const meta = VITAL_META[kind];
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await submit(
          { kind, value: Number(value), value2: kind === "blood_pressure" ? Number(value2) : undefined, measuredAt: fromLocalInput(at), source, device: device || undefined },
          `${meta.label} saved.`,
        );
        if (r.status === "saved") {
          setValue("");
          setValue2("");
        }
      }}
    >
      <Field label="Measurement" htmlFor="v-kind" help={meta.help}>
        <Select id="v-kind" value={kind} onChange={(e) => setKind(e.target.value as VitalKind)}>
          {VITAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {VITAL_META[k].label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={kind === "blood_pressure" ? `Systolic (${meta.unit})` : `Value (${meta.unit})`} htmlFor="v-val" error={fieldErrors.value}>
          <Input id="v-val" type="number" inputMode="decimal" step={meta.step} required value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!fieldErrors.value} />
        </Field>
        {kind === "blood_pressure" ? (
          <Field label="Diastolic (mmHg)" htmlFor="v-val2" error={fieldErrors.value2}>
            <Input id="v-val2" type="number" inputMode="numeric" required value={value2} onChange={(e) => setValue2(e.target.value)} />
          </Field>
        ) : (
          <Field label="Measured at" htmlFor="v-at" error={fieldErrors.measuredAt}>
            <Input id="v-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          </Field>
        )}
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted">More options</summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="Source" htmlFor="v-src">
          <Select id="v-src" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
            <option value="manual">Manual entry</option>
            <option value="device">Device reading</option>
            <option value="imported">Imported</option>
          </Select>
        </Field>
        <Field label="Device" optional htmlFor="v-dev">
          <Input id="v-dev" value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. wrist sensor" />
        </Field>
      </div>
      </details>
      <FormMessage state={state} />
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save reading"}
      </Button>
    </form>
  );
}

export function SleepForm() {
  const { submit, busy, state, fieldErrors } = useRecordSubmit("sleepLogs");
  const d = new Date();
  const [start, setStart] = useState(() => toLocalInput(new Date(d.getTime() - 8 * 3_600_000)));
  const [end, setEnd] = useState(now);
  const [quality, setQuality] = useState<number | null | undefined>();
  const [wakeUps, setWakeUps] = useState("0");
  const [shift, setShift] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        await submit({ start: fromLocalInput(start), end: fromLocalInput(end), quality: quality ?? null, restfulness: null, wakeUps: Number(wakeUps), shift: shift || undefined }, "Sleep saved.");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fell asleep" htmlFor="s-start" error={fieldErrors.start}>
          <Input id="s-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Woke up" htmlFor="s-end" error={fieldErrors.end}>
          <Input id="s-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <Field label="Times woken" htmlFor="s-wake">
          <Input id="s-wake" type="number" min={0} max={30} value={wakeUps} onChange={(e) => setWakeUps(e.target.value)} />
        </Field>
      </div>
      <ScaleInput name="quality" legend="Sleep quality" kind="quality" value={quality} onChange={setQuality} />
      <Field label="Schedule / shift context" optional htmlFor="s-shift">
        <Input id="s-shift" value={shift} onChange={(e) => setShift(e.target.value)} placeholder="e.g. Nominal, shifted for EVA" />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" disabled={busy || quality === undefined}>
        {busy ? "Saving…" : "Save sleep"}
      </Button>
    </form>
  );
}

export function HydrationQuickAdd({ unit }: { unit: "ml" | "oz" }) {
  const { submit, busy, state } = useRecordSubmit("hydrationLogs");
  const [custom, setCustom] = useState("");
  const amounts = [150, 250, 350, 500];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {amounts.map((a) => (
          <button key={a} disabled={busy} onClick={() => submit({ amountMl: a }, `+${a} ml logged.`)} className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-tile-teal text-teal hover:brightness-95 disabled:opacity-50">
            <span aria-hidden className="text-2xl">
              💧
            </span>
            <span className="text-sm font-semibold">+{unit === "oz" ? `${Math.round(a / 29.57)} oz` : `${a} ml`}</span>
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const ml = unit === "oz" ? Math.round(Number(custom) * 29.5735) : Number(custom);
          const r = await submit({ amountMl: ml }, `+${ml} ml logged.`);
          if (r.status !== "error") setCustom("");
        }}
      >
        <label htmlFor="h-custom" className="sr-only">
          Custom amount in {unit}
        </label>
        <Input id="h-custom" type="number" min={1} placeholder={`Custom amount (${unit})`} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={busy || !custom}>
          Add
        </Button>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

export function MealForm() {
  const { submit, busy, state } = useRecordSubmit("mealLogs");
  const [mealType, setType] = useState("lunch");
  const [note, setNote] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await submit({ mealType, note: note || undefined }, "Meal logged.");
        if (r.status !== "error") setNote("");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Meal" htmlFor="m-type">
          <Select id="m-type" value={mealType} onChange={(e) => setType(e.target.value)}>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </Select>
        </Field>
        <Field label="Notes" optional htmlFor="m-note">
          <Input id="m-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you ate, appetite…" />
        </Field>
      </div>
      <FormMessage state={state} />
      <Button type="submit" variant="secondary" disabled={busy}>
        Log meal
      </Button>
    </form>
  );
}

export function ActivityForm() {
  const { submit, busy, state, fieldErrors } = useRecordSubmit("activityLogs");
  const [f, setF] = useState({ category: "resistance", name: "", durationMin: "30", intensity: "moderate" });
  const [soreness, setSoreness] = useState<string>("");
  const [recovery, setRecovery] = useState<number | null | undefined>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await submit({ ...f, durationMin: Number(f.durationMin), soreness: soreness === "" ? null : Number(soreness), recovery: recovery ?? null }, "Exercise logged.");
        if (r.status !== "error") setF({ ...f, name: "" });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="a-cat">
          <Select id="a-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="resistance">Resistance</option>
            <option value="aerobic">Aerobic</option>
            <option value="mobility">Mobility</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Activity" htmlFor="a-name" error={fieldErrors.name}>
          <Input id="a-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Cycle ergometer" />
        </Field>
        <Field label="Duration (min)" htmlFor="a-dur">
          <Input id="a-dur" type="number" min={1} max={600} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} />
        </Field>
        <Field label="Intensity" htmlFor="a-int">
          <Select id="a-int" value={f.intensity} onChange={(e) => setF({ ...f, intensity: e.target.value })}>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="vigorous">Vigorous</option>
          </Select>
        </Field>
        <Field label="Soreness afterwards" optional htmlFor="a-sore">
          <Select id="a-sore" value={soreness} onChange={(e) => setSoreness(e.target.value)}>
            <option value="">Not recorded</option>
            <option value="0">None</option>
            <option value="1">Slight</option>
            <option value="2">Moderate</option>
            <option value="3">Strong</option>
            <option value="4">Severe</option>
          </Select>
        </Field>
      </div>
      <ScaleInput name="recovery" legend="How recovered do you feel?" kind="recovery" value={recovery} onChange={setRecovery} />
      <FormMessage state={state} />
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Log exercise"}
      </Button>
    </form>
  );
}

export function MoodForm() {
  const { submit, busy, state } = useRecordSubmit("moodLogs");
  const [mood, setMood] = useState<number | null | undefined>();
  const [stress, setStress] = useState<number | null | undefined>();
  const [reflection, setReflection] = useState("");
  const [share, setShare] = useState(false);
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await submit({ mood: mood ?? null, stress: stress ?? null, reflection: reflection || undefined, shareWithMedical: share }, "Mood saved.");
        if (r.status !== "error") {
          setMood(undefined);
          setStress(undefined);
          setReflection("");
        }
      }}
    >
      <ScaleInput name="mood" legend="Mood" kind="mood" value={mood} onChange={setMood} />
      <ScaleInput name="mstress" legend="Stress" kind="stress" value={stress} onChange={setStress} />
      <Field label="Short reflection" optional htmlFor="mo-ref">
        <Textarea id="mo-ref" maxLength={1000} value={reflection} onChange={(e) => setReflection(e.target.value)} />
      </Field>
      <Checkbox label="Share this entry with my flight surgeon" help="Off by default. Commanders never see mood entries." checked={share} onChange={(e) => setShare(e.target.checked)} />
      <FormMessage state={state} />
      <Button type="submit" disabled={busy || mood === undefined}>
        {busy ? "Saving…" : "Save mood"}
      </Button>
    </form>
  );
}

export function JournalForm() {
  const { submit, busy, state } = useRecordSubmit("journal");
  const [text, setText] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await submit({ text }, "Saved to your private journal.");
        if (r.status !== "error") setText("");
      }}
    >
      <Field label="Private journal" htmlFor="j-text" help="Only you can ever read this — not medical, not commanders, not admins.">
        <Textarea id="j-text" maxLength={4000} className="min-h-32" value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" variant="secondary" disabled={busy || !text.trim()}>
        Save entry
      </Button>
    </form>
  );
}

export function MedicationLogButtons({ medicationId }: { medicationId: string }) {
  const { submit, busy, state } = useRecordSubmit("medicationLogs");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => submit({ medicationId, status: "taken" }, "Marked as taken.")}>
          Taken
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => submit({ medicationId, status: "late" }, "Marked as taken late.")}>
          Taken late
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => submit({ medicationId, status: "skipped" }, "Marked as skipped.")}>
          Skipped
        </Button>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
