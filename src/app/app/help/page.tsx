import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { HELP } from "@/lib/content/help";
import { ROLE_LABELS } from "@/lib/types";
import { EmergencyNotice, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Help & safety" };

const ONBOARDING: Record<string, string[]> = {
  astronaut: ["Do your daily check-in from Home (about a minute).", "Log sleep, water and exercise — or let your wearable windows feed Vitals & sensors.", "Use Symptoms & support for anything health-related, and My plan for tasks from your care team.", "Your journal is private. Mood entries are private unless you tick “share”."],
  medical: ["Start at the dashboard: your crew and anything needing review.", "Open the Alert centre to acknowledge, assign, escalate or resolve — every action is audited.", "Crew detail shows trends, baselines, symptoms, care plans and append-only notes.", "Generate a handover summary for shift changes (print / PDF)."],
  commander: ["The dashboard shows check-in completion and operational items only.", "Use the Workload planner to spot recovery gaps and sleep-window conflicts.", "Medical details stay with the medical team by design."],
  researcher: ["Search NASA OSDR in Research → datasets; check organism and study type first.", "Insights shows de-identified aggregates and the model evaluation.", "Identifiable crew records are not accessible to researchers."],
  admin: ["Manage users, roles and invitation codes in Users & invites.", "Configure thresholds, privacy group size and communication delay in Settings.", "You cannot open identifiable health records, and you cannot change your own role."],
};

export default async function HelpPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Help & safety" description="How to use Antariksha, and what it must never be used for." />
      <EmergencyNotice />
      <Card>
        <CardHeader title={`Getting started · ${ROLE_LABELS[user.role]}`} />
        <CardBody>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {ONBOARDING[user.role].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Frequently asked questions" />
        <CardBody className="space-y-2">
          {HELP.map((h) => (
            <details key={h.id} id={h.id} className="rounded-2xl bg-surface-2 p-4 open:bg-primary-soft">
              <summary className="cursor-pointer font-semibold">{h.q}</summary>
              <p className="mt-2 text-sm text-fg/85">{h.a}</p>
            </details>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Keyboard" />
        <CardBody className="text-sm">
          <p>
            <kbd className="rounded border border-line px-1.5">Ctrl</kbd> + <kbd className="rounded border border-line px-1.5">K</kbd> opens search from anywhere. Every action is reachable with <kbd className="rounded border border-line px-1.5">Tab</kbd> and <kbd className="rounded border border-line px-1.5">Enter</kbd>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
