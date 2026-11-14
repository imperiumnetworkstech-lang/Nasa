import type { Metadata } from "next";
import { medicalContext } from "@/lib/medical/context";
import { getSettings } from "@/lib/data/repo";
import { buildOverlay } from "@/lib/mission/overlay";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { TimelineView } from "@/components/mission/timeline-view";

export const metadata: Metadata = { title: "Mission context" };

export default async function MedicalTimeline() {
  const { mission, crew, tz } = await medicalContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const settings = await getSettings();
  const { env, events, rows } = await buildOverlay(mission.id, crew, tz, settings.privacyMinGroupSize);
  return (
    <div className="space-y-6">
      <PageHeader title="Mission context timeline" description="Health trends alongside EVAs, shift changes, habitat events and environment readings." crumbs={[{ label: "Medical", href: "/app/medical/dashboard" }, { label: "Mission context" }]} />
      <TimelineView events={events} env={env} crew={crew} tz={tz} canEdit overlay={rows} overlayTitle="Cabin CO₂ vs crew sleep & fatigue (daily, aggregated)" demo={mission.isDemo} />
    </div>
  );
}
