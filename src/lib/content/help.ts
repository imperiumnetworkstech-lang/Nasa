export interface HelpArticle {
  id: string;
  q: string;
  a: string;
  roles?: string[];
}

export const HELP: HelpArticle[] = [
  { id: "emergency", q: "Is Antariksha an emergency channel?", a: "No. In an emergency follow the mission's approved emergency and medical communication procedures immediately. Never delay emergency contact to complete a form. Messages here may be queued or delayed." },
  { id: "diagnosis", q: "Does Antariksha diagnose me?", a: "No. Summaries, alerts and the experimental physiological-state model are decision-support indicators only. They never diagnose, prescribe, or decide fitness for duty. Medical decisions are made by your medical team." },
  { id: "who-sees", q: "Who can see my health data?", a: "You can see all of your own records. Flight surgeons assigned to your mission can see your health records, and your mood entries only when you choose to share them. Your private journal is visible only to you. Commanders see operational, privacy-thresholded summaries — never your mood, journal, or detailed medical records. Researchers and administrators cannot open identifiable health records." },
  { id: "offline", q: "What happens when I'm offline?", a: "Non-emergency entries (check-ins, sleep, hydration, mood, exercise, meals) are queued on this device and clearly marked 'Queued — not sent' until the server confirms them. Symptom reports and messages are never queued, so the app never implies something was delivered when it wasn't." },
  { id: "baseline", q: "What is a personal baseline?", a: "Your recent history (by default 21 days, at least 7 observations) for a measure such as resting heart rate. Antariksha compares new values with your own pattern rather than a population norm, shows how many observations it used, and suppresses conclusions when data is sparse." },
  { id: "model", q: "What is the physiological-state model?", a: "An experimental model trained on an open PhysioNet dataset (20 healthy volunteers on Earth) using heart rate, SpO₂, electrodermal activity (sweat response), skin temperature and motion. It shows which lab condition — relaxed, physical exertion, cognitive load or emotional arousal — a 30-second window most resembles, with the factors behind it. It is not validated for astronauts or microgravity." },
  { id: "thresholds", q: "Where do alert thresholds come from?", a: "The defaults are illustrative values for this demo. Mission medical teams must configure their own mission-specific thresholds in Admin → Settings. Thresholds are versioned with the rule set." },
  { id: "demo", q: "What is demo data?", a: "All seeded people, records, alerts and environment readings are synthetic and labelled 'Demo data' or 'Simulated'. No real astronaut data is used. NASA public datasets are research data, not a live feed of astronaut health." },
  { id: "comm-delay", q: "What is communication-delay mode?", a: "Administrators can simulate a one-way communication delay. Messages show queued, sent, received and acknowledged states so nobody assumes a message was seen before it could have arrived." },
  { id: "shortcuts", q: "Are there keyboard shortcuts?", a: "Press Ctrl+K (or ⌘K) anywhere in the app to open search. Press ? in search for help. All actions are reachable by keyboard using Tab and Enter." },
];
