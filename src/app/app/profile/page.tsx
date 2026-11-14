import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { getMission } from "@/lib/data/repo";
import { ROLE_LABELS } from "@/lib/types";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Profile & preferences" };

export default async function ProfilePage() {
  const user = await requireUser();
  const mission = user.missionId ? await getMission(user.missionId) : null;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Profile & preferences" />
      <section className="hero-gradient flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-pop)]">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-2xl font-bold">{(user.callSign ?? user.displayName).slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{user.displayName}</p>
          <p className="text-sm text-white/80">{user.email}</p>
          <p className="mt-1 flex flex-wrap gap-1.5">
            <Badge className="border-white/30 bg-white/20 text-white">{ROLE_LABELS[user.role]}</Badge>
            <Badge className="border-white/30 bg-white/20 text-white">{mission ? mission.missionCode : "No mission"}</Badge>
            {user.isDemo ? <DemoBadge label="Demo account" /> : null}
          </p>
        </div>
        <p className="text-xs text-white/75">Role and mission are managed by administrators.</p>
      </section>
      <Card>
        <CardBody>
          <ProfileForm
            isCrew={user.role === "astronaut"}
            initial={{ displayName: user.displayName, callSign: user.callSign ?? "", dietaryConstraints: user.dietaryConstraints ?? "", allergies: user.allergies ?? "", preferences: user.preferences }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
