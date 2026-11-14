import type { Metadata } from "next";
import { commanderContext } from "@/lib/mission/context";
import { getSettings } from "@/lib/data/repo";
import { buildOverlay } from "@/lib/mission/overlay";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { TimelineView } from "@/components/mission/timeline-view";

export const metadata: Metadata = { title: "Mission timeline" };

export default async function CommanderTimeline() {
  const { mission, crew, tz } = await commanderContext();
  if (!mission) return <EmptyState title="Not assigned to a mission" />;
  const settings = await getSettings();
  // Overlay uses crew aggregates suppressed below the privacy group size.
  const { env, events, rows } = await buildOverlay(mission.id, crew, tz, settings.privacyMinGroupSize);
  return (
    <div className="space-y-6">
      <PageHeader title="Mission timeline" description="Mission events and habitat environment, with privacy-thresholded crew aggregates." crumbs={[{ label: "Mission", href: "/app/mission/dashboard" }, { label: "Timeline" }]} />
      <TimelineView events={events} env={env} crew={crew} tz={tz} canEdit overlay={rows} overlayTitle={`Cabin CO₂ vs crew aggregates (hidden when < ${settings.privacyMinGroupSize} people)`} demo={mission.isDemo} />
    </div>
  );
}
