import type { Metadata } from "next";
import { medicalContext } from "@/lib/medical/context";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { skillState } from "@/lib/skills/schedule";
import { skillCardForm } from "@/lib/actions/forms";
import { requestTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-ui";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export const metadata: Metadata = { title: "Skill Keeper" };

function cellTone(f: number) {
  return f >= 70 ? "bg-ok-soft text-ok" : f >= 40 ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger";
}

export default async function MedicalSkills() {
  const { mission, crew } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const cards = await listMissionDocs(mission.id, "skillCards", { orderBy: { field: "createdAt", dir: "asc" } });
  const reviews = Object.fromEntries(await Promise.all(crew.map(async (c) => [c.uid, await listPersonal(c.uid, "skillReviews", { limit: 500 })] as const)));
  const now = new Date(requestTime());
  const coverage = cards.map((card) => ({ card, fresh: crew.filter((c) => skillState(card, reviews[c.uid], now).freshness >= 70).length }));
  return (
    <div className="space-y-6">
      <PageHeader title="Skill Keeper" description="Spaced practice so rarely-used emergency skills don't fade. You write the cards; crew practise in two minutes." crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Skill Keeper" }]} />
      <Card>
        <CardHeader title="Team freshness" description="Green ≥ 70% · amber 40–69% · red < 40%. Decay rates are configurable placeholders, not validated curves." />
        <CardBody className="overflow-x-auto">
          {cards.length === 0 ? (
            <p className="text-sm text-muted">Add a card to start.</p>
          ) : (
            <table className="w-full min-w-[36rem] text-center text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="py-2 text-left">Skill</th>
                  {crew.map((c) => (
                    <th key={c.uid} className="px-1">
                      {c.callSign}
                    </th>
                  ))}
                  <th className="px-1">Ready</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map(({ card, fresh }) => (
                  <tr key={card.id} className="border-t border-line">
                    <td className="py-2 pr-2 text-left">
                      <span className="font-medium">{card.title}</span> {card.origin === "simulated" ? <DemoBadge label="Demo" /> : null}
                    </td>
                    {crew.map((c) => {
                      const f = skillState(card, reviews[c.uid], now).freshness;
                      return (
                        <td key={c.uid} className="px-1 py-1.5">
                          <span className={`inline-block min-w-12 rounded-full px-2 py-1 text-xs font-semibold ${cellTone(f)}`}>{f}%</span>
                        </td>
                      );
                    })}
                    <td>
                      <Badge tone={fresh >= 2 ? "ok" : "warn"}>
                        {fresh}/{crew.length}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Add a practice card" description="Keep it short: one question, one clear answer. Use only approved mission content." />
        <CardBody>
          <ActionForm action={skillCardForm} submitLabel="Add card">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" htmlFor="sk-title">
                <Input id="sk-title" name="title" required placeholder="e.g. Burn kit location" />
              </Field>
              <Field label="Type" htmlFor="sk-cat">
                <Select id="sk-cat" name="category" defaultValue="kit">
                  <option value="kit">Kit location</option>
                  <option value="equipment">Equipment</option>
                  <option value="procedure">Procedure</option>
                  <option value="communication">Communication</option>
                </Select>
              </Field>
            </div>
            <Field label="Question" htmlFor="sk-prompt">
              <Input id="sk-prompt" name="prompt" required />
            </Field>
            <Field label="Answer" htmlFor="sk-answer">
              <Textarea id="sk-answer" name="answer" required className="min-h-20" />
            </Field>
            <Field label="Fades by half after (days)" htmlFor="sk-hl" help="Shorter for complex, rarely-used skills.">
              <Input id="sk-hl" name="halfLife" type="number" min={3} max={120} defaultValue={21} className="max-w-32" />
            </Field>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
