"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/shared";
import type { UserPreferences } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { applyTheme } from "@/components/shell/theme-toggle";

export function ProfileForm({ initial, isCrew }: { initial: { displayName: string; callSign: string; dietaryConstraints: string; allergies: string; preferences: UserPreferences }; isCrew: boolean }) {
  const [v, setV] = useState(initial);
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const p = v.preferences;
  const setP = (patch: Partial<UserPreferences>) => setV({ ...v, preferences: { ...p, ...patch } });
  const tzs = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateProfile({
            ...v,
            callSign: v.callSign || undefined,
            dietaryConstraints: v.dietaryConstraints || undefined,
            allergies: v.allergies || undefined,
          });
          setRes(r);
          if (r.ok) {
            applyTheme(p.theme);
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" htmlFor="pf-name">
          <Input id="pf-name" required value={v.displayName} onChange={(e) => setV({ ...v, displayName: e.target.value })} />
        </Field>
        <Field label="Call sign" optional htmlFor="pf-cs">
          <Input id="pf-cs" value={v.callSign} onChange={(e) => setV({ ...v, callSign: e.target.value })} />
        </Field>
      </div>
      {isCrew ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Food preferences / dietary constraints" optional htmlFor="pf-diet">
            <Textarea id="pf-diet" className="min-h-16" value={v.dietaryConstraints} onChange={(e) => setV({ ...v, dietaryConstraints: e.target.value })} />
          </Field>
          <Field label="Allergies (only if you choose to record them)" optional htmlFor="pf-all" help="Visible to you and your assigned medical officer.">
            <Textarea id="pf-all" className="min-h-16" value={v.allergies} onChange={(e) => setV({ ...v, allergies: e.target.value })} />
          </Field>
        </div>
      ) : null}
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold">Display</legend>
        <Field label="Theme" htmlFor="pf-theme">
          <Select id="pf-theme" value={p.theme} onChange={(e) => setP({ theme: e.target.value as UserPreferences["theme"] })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </Select>
        </Field>
        <Field label="Timezone" htmlFor="pf-tz">
          <Select id="pf-tz" value={p.timezone} onChange={(e) => setP({ timezone: e.target.value })}>
            {tzs.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Temperature" htmlFor="pf-t">
          <Select id="pf-t" value={p.temperatureUnit} onChange={(e) => setP({ temperatureUnit: e.target.value as "C" | "F" })}>
            <option value="C">°C</option>
            <option value="F">°F</option>
          </Select>
        </Field>
        <Field label="Volume" htmlFor="pf-v">
          <Select id="pf-v" value={p.volumeUnit} onChange={(e) => setP({ volumeUnit: e.target.value as "ml" | "oz" })}>
            <option value="ml">ml</option>
            <option value="oz">fl oz</option>
          </Select>
        </Field>
      </fieldset>
      {isCrew ? (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold">Goals & reminders</legend>
          <Field label="Daily hydration target (ml)" optional htmlFor="pf-h" help="Set by you or your medical team. Antariksha never prescribes targets.">
            <Input id="pf-h" type="number" min={250} max={6000} step={50} value={p.hydrationTargetMl ?? ""} onChange={(e) => setP({ hydrationTargetMl: e.target.value ? Number(e.target.value) : null })} className="max-w-xs" />
          </Field>
          <Checkbox label="Show wellbeing summary" checked={p.showReadinessSummary} onChange={(e) => setP({ showReadinessSummary: e.target.checked })} />
          {(
            [
              ["checkIn", "Daily check-in reminder"],
              ["hydration", "Hydration reminders"],
              ["medication", "Medication reminders"],
              ["mobilityBreaks", "Mobility-break reminders (non-clinical)"],
            ] as const
          ).map(([k, l]) => (
            <Checkbox key={k} label={l} checked={p.reminders[k]} onChange={(e) => setP({ reminders: { ...p.reminders, [k]: e.target.checked } })} />
          ))}
        </fieldset>
      ) : null}
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold">Notification channels</legend>
        <Checkbox label="In-app notifications" help="Always on." checked disabled readOnly />
        <Checkbox label="Email (optional adapter — not configured on this deployment, nothing will be sent)" checked={p.notificationChannels.email} onChange={(e) => setP({ notificationChannels: { ...p.notificationChannels, email: e.target.checked } })} />
        <Checkbox label="Push (optional adapter — not configured on this deployment, nothing will be sent)" checked={p.notificationChannels.push} onChange={(e) => setP({ notificationChannels: { ...p.notificationChannels, push: e.target.checked } })} />
      </fieldset>
      <FormMessage state={res} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
