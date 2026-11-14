/**
 * What to do for each condition the vitals model can detect.
 * - "precautions" go straight to the crew member as early, safe self-care steps.
 * - "remedy" is the care plan suggestion for the base-station doctor and commander.
 * - "medicines" name the exact kit medicine recommended for the condition. They are shown to
 *   everyone straight away; the base-station doctor can add more. Doses follow the kit label;
 *   emergency injectables and prescription-only drugs are marked as such.
 * Content is general first-aid knowledge for demonstration, not mission-approved procedures.
 */
export type Condition =
  | "normal"
  | "bradycardia"
  | "tachycardia"
  | "hypoxemia"
  | "dehydration"
  | "fever"
  | "hypertension"
  | "hypotension"
  | "tachypnea";

export const CONDITIONS: Condition[] = ["normal", "bradycardia", "tachycardia", "hypoxemia", "dehydration", "fever", "hypertension", "hypotension", "tachypnea"];

export interface Guide {
  label: string;
  emoji: string;
  severity: "normal" | "attention" | "urgent";
  explain: string;
  precautions: string[];
  remedy: string[];
  medicines: { name: string; purpose: string }[];
}

export const GUIDE: Record<Condition, Guide> = {
  normal: {
    label: "All normal",
    emoji: "✅",
    severity: "normal",
    explain: "Every reading is within the normal range.",
    precautions: ["Keep up your usual routine, water and rest."],
    remedy: ["No action needed. Continue routine monitoring."],
    medicines: [],
  },
  bradycardia: {
    label: "Low heart rate",
    emoji: "💓",
    severity: "attention",
    explain: "Heart rate is below the normal resting range.",
    precautions: ["Stop what you're doing and rest in a secure position.", "Avoid sudden movements.", "Tell a crewmate if you feel dizzy, faint or short of breath."],
    remedy: ["Rest and repeat the reading in 5 minutes.", "Check for dizziness, fainting or chest discomfort.", "Hold any EVA or heavy task until reviewed.", "Doctor to review rhythm with an ECG if it stays low."],
    medicines: [
      { name: "No tablet — rest first", purpose: "Low heart rate is not treated with a tablet on your own." },
      { name: "Atropine sulfate injection (emergency kit)", purpose: "Medical officer only, if you feel faint or dizzy." },
    ],
  },
  tachycardia: {
    label: "High heart rate",
    emoji: "💗",
    severity: "attention",
    explain: "Resting heart rate is above the normal range.",
    precautions: ["Stop and rest.", "Breathe slowly: in for 4, out for 6.", "Drink some water. Avoid caffeine for now."],
    remedy: ["Rest 10 minutes and repeat the reading.", "Check hydration, temperature and stress.", "Doctor to review if it stays above 100 at rest."],
    medicines: [
      { name: "No tablet needed at rest", purpose: "Rest, slow breathing and water usually bring it down." },
      { name: "Oral Rehydration Salts (WHO-ORS)", purpose: "Only if you've been sweating or not drinking enough." },
    ],
  },
  hypoxemia: {
    label: "Low oxygen",
    emoji: "🫁",
    severity: "urgent",
    explain: "Blood oxygen (SpO₂) is below the normal range.",
    precautions: ["Stop all exertion now.", "Put on the oxygen mask from the nearest station.", "Tell the commander — check the cabin air alarm."],
    remedy: ["Start supplemental oxygen.", "Re-check SpO₂ with a second sensor.", "Check cabin oxygen and CO₂ readings.", "Doctor to assess breathing and lungs."],
    medicines: [
      { name: "Medical oxygen (O₂) via mask", purpose: "From the onboard oxygen supply, until SpO₂ is back above 95%." },
    ],
  },
  dehydration: {
    label: "Heavy sweating / dehydration risk",
    emoji: "💦",
    severity: "attention",
    explain: "Sweat level is well above normal, often with raised skin temperature and heart rate.",
    precautions: ["Stop exercising and cool down.", "Towel off sweat — in microgravity it clings to your skin.", "Drink water slowly."],
    remedy: ["Cool down and rest 15 minutes.", "Replace fluids and salts.", "Re-check readings after cooling.", "Review exercise intensity and cabin temperature."],
    medicines: [
      { name: "Oral Rehydration Salts (WHO-ORS sachet)", purpose: "Mix one sachet in water and sip slowly." },
      { name: "Sodium chloride (salt) tablets", purpose: "With water, to replace salt lost in sweat." },
    ],
  },
  fever: {
    label: "High temperature",
    emoji: "🌡️",
    severity: "attention",
    explain: "Body temperature is above the fever line (set higher in space, where resting temperature runs ~1 °C warmer).",
    precautions: ["Rest and drink fluids.", "Note any cough, pain or other symptoms.", "Keep distance from crewmates until checked."],
    remedy: ["Re-check temperature in 30 minutes.", "Look for a cause (infection, heat, exercise).", "Doctor to review symptoms."],
    medicines: [
      { name: "Paracetamol (Acetaminophen) tablets", purpose: "Lowers temperature and eases aches. Follow the kit label." },
      { name: "Ibuprofen tablets", purpose: "Second option if paracetamol isn't enough — take with food." },
    ],
  },
  hypertension: {
    label: "High blood pressure",
    emoji: "🩸",
    severity: "attention",
    explain: "Blood pressure is above the normal range (which runs lower in orbit).",
    precautions: ["Sit quietly for 5 minutes.", "Slow breathing.", "Avoid caffeine and salty snacks for now."],
    remedy: ["Repeat the reading after 5 minutes of rest.", "Check for headache or vision changes.", "Doctor to review trend over the next days."],
    medicines: [
      { name: "No tablet on your own", purpose: "Rest and repeat the reading first." },
      { name: "Amlodipine tablets", purpose: "Only if your doctor prescribes it after repeated high readings." },
    ],
  },
  hypotension: {
    label: "Low blood pressure / dizziness risk",
    emoji: "🌀",
    severity: "attention",
    explain: "Blood pressure is below normal — common with fluid shifts in space.",
    precautions: ["Hold on and keep still.", "Drink water.", "Change position slowly."],
    remedy: ["Fluid loading with water and salt.", "Use compression garment if available.", "Repeat the reading in 10 minutes."],
    medicines: [
      { name: "Sodium chloride (salt) tablets + water", purpose: "Fluid loading — the NASA countermeasure for low blood pressure from fluid shifts." },
      { name: "Oral Rehydration Salts (WHO-ORS)", purpose: "Helps restore fluid volume." },
      { name: "Midodrine tablets", purpose: "Only if your doctor prescribes it (studied by NASA for dizziness on standing)." },
    ],
  },
  tachypnea: {
    label: "Fast breathing",
    emoji: "🌬️",
    severity: "attention",
    explain: "Breathing rate is above normal at rest.",
    precautions: ["Stop activity.", "Breathe slowly: in for 4, out for 6.", "Check how you feel — tell the doctor about chest pain or anxiety."],
    remedy: ["Check SpO₂ and cabin CO₂ levels.", "Paced breathing for 5 minutes, then re-check.", "Doctor to review if it continues."],
    medicines: [
      { name: "No tablet needed", purpose: "Paced breathing first." },
      { name: "Medical oxygen (O₂) via mask", purpose: "Only if SpO₂ is below 95%." },
    ],
  },
};
