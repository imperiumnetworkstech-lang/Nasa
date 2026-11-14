import type { VitalKind } from "@/lib/types";

/**
 * Vital-sign metadata. `plausible` ranges only reject obvious data-entry/sensor errors — they are
 * NOT clinical normal ranges and are never shaded on charts as "normal".
 */
export const VITAL_META: Record<
  VitalKind,
  { label: string; short: string; unit: string; plausible: [number, number]; step: number; help: string }
> = {
  heart_rate: { label: "Heart rate", short: "Heart rate", unit: "bpm", plausible: [25, 230], step: 1, help: "Resting value, ideally at the same time each day." },
  blood_pressure: { label: "Blood pressure", short: "Blood pressure", unit: "mmHg", plausible: [50, 260], step: 1, help: "Systolic / diastolic." },
  temperature: { label: "Body temperature", short: "Body temp", unit: "°C", plausible: [30, 44], step: 0.1, help: "Core/oral temperature." },
  spo2: { label: "Oxygen level", short: "Oxygen", unit: "%", plausible: [50, 100], step: 1, help: "Pulse oximeter reading." },
  resp_rate: { label: "Breathing rate", short: "Breathing", unit: "breaths/min", plausible: [4, 60], step: 1, help: "Breaths counted over one minute." },
  eda: { label: "Sweat level", short: "Sweat", unit: "µS", plausible: [0, 100], step: 0.01, help: "From your wrist sensor (skin conductance)." },
  skin_temp: { label: "Skin temperature", short: "Skin temp", unit: "°C", plausible: [20, 42], step: 0.1, help: "Wrist/skin sensor temperature (differs from core temperature)." },
  hrv: { label: "Heart rhythm variation", short: "HRV", unit: "ms", plausible: [3, 300], step: 1, help: "From a chest strap or validated wearable." },
};

export function cToF(c: number) {
  return (c * 9) / 5 + 32;
}
export function mlToOz(ml: number) {
  return ml / 29.5735;
}
