import type { Metadata } from "next";
import { PublicPage } from "@/components/public-chrome";
import { Callout } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Privacy & safety" };

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "What Antariksha is — and is not",
    p: [
      "Antariksha is research and simulation software for crew wellbeing. It is not a medical device, is not flight-certified, and is not an emergency service. It is not affiliated with or endorsed by NASA or any space agency.",
      "Summaries, alerts and the experimental physiological-state model are decision-support indicators. They never diagnose, prescribe, change doses or decide fitness for duty.",
    ],
  },
  {
    h: "Who can see what",
    p: [
      "Crew members see all of their own records. Their private journal is visible only to them.",
      "Flight surgeons can see health records of crew on the mission they are assigned to — and mood entries only when the crew member chose to share them. They cannot edit a crew member's submitted record; clinical notes and corrections are appended and attributed.",
      "Mission commanders see operational, privacy-thresholded summaries (for example check-in completion and operational alerts). They never see mood details, journals or detailed medical records. Aggregates over fewer than the configured minimum group size are suppressed.",
      "Researchers see public research data and de-identified aggregates only. Administrators manage users, missions and settings but cannot open identifiable health records.",
      "These rules are enforced on the server and mirrored in Firestore security rules — not merely hidden in the interface.",
    ],
  },
  {
    h: "Audit trail",
    p: ["Viewing crew detail, exporting handover summaries, changing alert status, updating symptom reports and changing roles are recorded in an audit log. Audit entries record who did what to which record — never the health content itself."],
  },
  {
    h: "Data storage",
    p: [
      "In production, data is stored in Google Cloud Firestore under your organisation's Firebase project, protected by authentication and security rules. In local/demo mode, data is stored in a local file on the server and should never contain real health data.",
      "Health content is not written to server logs. The optional AI assistant provider is disabled by default; when enabled, health records are never sent to it.",
    ],
  },
  {
    h: "Offline and delayed communication",
    p: [
      "Non-emergency entries can be queued on your device while offline and are visibly marked as not sent until confirmed. Symptom reports and messages are never queued, so the app never implies something was delivered when it was not.",
    ],
  },
  {
    h: "Simulated and public data",
    p: [
      "All demo people and records are fictional and labelled.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicPage>
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy, safety & limitations</h1>
          <p className="mt-2 text-muted">How Antariksha handles health data, and what it must never be used for.</p>
        </header>
        <Callout tone="danger" title="Emergencies">
          In a real mission, follow the mission&apos;s approved emergency and medical communication procedures. Never delay emergency contact to complete a form.
        </Callout>
        {SECTIONS.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="text-xl font-semibold">{s.h}</h2>
            {s.p.map((t, i) => (
              <p key={i} className="text-fg/85">
                {t}
              </p>
            ))}
          </section>
        ))}
      </article>
    </PublicPage>
  );
}
