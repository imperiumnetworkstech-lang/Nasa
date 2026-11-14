import type { Metadata } from "next";
import { medicalContext } from "@/lib/medical/context";
import { crewSnapshots } from "@/lib/medical/summary";
import { listMissionDocs } from "@/lib/data/repo";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CrewCard } from "@/components/medical/crew-card";

export const metadata: Metadata = { title: "Assigned crew" };

export default async function MedicalCrewList() {
  const { mission, crew } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const alerts = await listMissionDocs(mission.id, "alerts");
  const snaps = await crewSnapshots(crew, alerts);
  return (
    <div className="space-y-6">
      <PageHeader title="Assigned crew" description={`Only crew on ${mission.missionCode} are visible to you.`} crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Crew" }]} />
      <div className="grid gap-3 md:grid-cols-2">
        {snaps.map((s) => (
          <CrewCard key={s.member.uid} s={s} />
        ))}
      </div>
    </div>
  );
}
