"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select, Textarea, fromLocalInput, toLocalInput } from "@/components/ui/form";
import { symptomSchema } from "@/lib/validation/schemas";
import { useRecordSubmit } from "./use-submit";

const AREAS = ["Head", "Eyes", "Ears / nose / throat", "Chest", "Abdomen", "Upper back", "Lower back", "Arms / hands", "Legs / feet", "Skin", "Whole body", "Other"];
const ASSOCIATED = ["Fatigue", "Nausea", "Dizziness", "Fever / chills", "Congestion", "Headache", "Poor sleep", "Reduced appetite"];

type Values = z.input<typeof symptomSchema>;

export function SymptomForm() {
  const { submit, busy, state } = useRecordSubmit("symptomReports");
  const { register, handleSubmit, control, formState, reset } = useForm<Values>({
    resolver: zodResolver(symptomSchema),
    defaultValues: { bodyArea: "", symptomType: "", description: "", severity: "mild", onset: new Date().toISOString(), duration: "", associated: [], requestReview: true },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        const r = await submit(v, v.requestReview ? "Report sent to your care team for review." : "Report saved.");
        if (r.status === "saved") reset();
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where?" htmlFor="sy-area" error={e.bodyArea?.message}>
          <Select id="sy-area" {...register("bodyArea")} aria-invalid={!!e.bodyArea}>
            <option value="">Choose body area…</option>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label="What kind of symptom?" htmlFor="sy-type" error={e.symptomType?.message} help="e.g. headache, rash, nausea, muscle soreness">
          <Input id="sy-type" {...register("symptomType")} aria-invalid={!!e.symptomType} />
        </Field>
      </div>
      <Field label="Describe it in your own words" htmlFor="sy-desc" error={e.description?.message}>
        <Textarea id="sy-desc" {...register("description")} aria-invalid={!!e.description} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="How bad is it?" htmlFor="sy-sev">
          <Select id="sy-sev" {...register("severity")}>
            <option value="mild">Mild — noticeable, not limiting</option>
            <option value="moderate">Moderate — affects some tasks</option>
            <option value="severe">Severe — hard to carry on</option>
            <option value="unsure">Not sure</option>
          </Select>
        </Field>
        <Controller
          control={control}
          name="onset"
          render={({ field }) => (
            <Field label="When did it start?" htmlFor="sy-onset" error={e.onset?.message}>
              <Input id="sy-onset" type="datetime-local" value={toLocalInput(new Date(field.value))} onChange={(ev) => ev.target.value && field.onChange(fromLocalInput(ev.target.value))} />
            </Field>
          )}
        />
        <Field label="How long has it lasted?" htmlFor="sy-dur" error={e.duration?.message}>
          <Input id="sy-dur" placeholder="e.g. 2 hours, since yesterday" {...register("duration")} />
        </Field>
      </div>
      <Controller
        control={control}
        name="associated"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Anything else alongside it?</legend>
            <div className="flex flex-wrap gap-2">
              {ASSOCIATED.map((a) => {
                const on = (field.value ?? []).includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    aria-pressed={on}
                    onClick={() => field.onChange(on ? field.value!.filter((x) => x !== a) : [...(field.value ?? []), a])}
                    className={`rounded-full px-3 py-1.5 text-sm ${on ? "hero-gradient text-white" : "bg-surface-2 text-fg hover:bg-primary-soft"}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      />
      <Controller
        control={control}
        name="requestReview"
        render={({ field }) => <Checkbox label="Request medical review" help="Your assigned flight surgeon will be notified." checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} />}
      />
      <p className="text-xs text-muted">Photo attachments are stored in Firebase Storage with strict access rules and are available once Storage is configured for this deployment.</p>
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Sending…" : "Submit report"}
      </Button>
    </form>
  );
}
