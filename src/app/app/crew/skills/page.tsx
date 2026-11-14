import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { crewContext } from "@/lib/crew/context";
import { listMissionDocs, listPersonal } from "@/lib/data/repo";
import { deckState } from "@/lib/skills/schedule";
import { relativeTime, requestTime } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, Progress } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { SkillPractice } from "@/components/crew/skill-practice";

export const metadata: Metadata = { title: "Skill practice" };

export default async function SkillsPage() {
  const { user } = await crewContext();
  const [cards, reviews] = await Promise.all([user.missionId ? listMissionDocs(user.missionId, "skillCards") : Promise.resolve([]), listPersonal(user.uid, "skillReviews", { limit: 500 })]);
  const now = new Date(requestTime());
  const deck = deckState(cards, reviews, now);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Skill practice"
        description="Emergency skills you rarely use fade over months. A two-minute practice keeps them fresh."
        crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Skill practice" }]}
        badges={cards.some((c) => c.origin === "simulated") ? <DemoBadge /> : undefined}
      />
      {cards.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="No practice cards yet" body="Your medical team adds the cards for your mission." />
      ) : (
        <>
          <Card>
            <CardHeader title={deck.due.length ? `${deck.due.length} to practise today` : "You're all fresh"} description={`Team-approved cards · your average freshness ${deck.averageFreshness}%`} />
            <CardBody>
              <SkillPractice cards={deck.due.map((s) => ({ id: s.card.id, title: s.card.title, prompt: s.card.prompt, answer: s.card.answer, freshness: s.freshness }))} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="All my skills" />
            <CardBody className="space-y-3">
              {deck.states.map((s) => (
                <div key={s.card.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{s.card.title}</span>
                    <span className={`text-xs font-semibold ${s.due ? "text-warn" : "text-ok"}`}>{s.freshness}% fresh</span>
                  </div>
                  <Progress value={s.freshness} tone={s.due ? "amber" : "teal"} label={`${s.card.title} freshness`} />
                  <p className="text-[11px] text-muted">{s.lastAt ? `Last practised ${relativeTime(s.lastAt, now.getTime())} · ${s.reviews} times` : "Never practised"}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
