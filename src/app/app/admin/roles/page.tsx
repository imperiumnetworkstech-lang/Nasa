import type { Metadata } from "next";
import { Check, Minus, ShieldCheck, Stethoscope, Telescope, UserCog, UserRound } from "lucide-react";
import { PERMISSION_MATRIX } from "@/lib/permissions";
import { ROLES, ROLE_SHORT } from "@/lib/types";
import { Callout, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, IconTile, type TileTone } from "@/components/ui/card";

export const metadata: Metadata = { title: "Who can see what" };

const PLAIN: { role: (typeof ROLES)[number]; icon: typeof UserRound; tone: TileTone; can: string; cannot: string }[] = [
  { role: "astronaut", icon: UserRound, tone: "teal", can: "Log and see their own health, sleep, mood and messages.", cannot: "See anyone else's data." },
  { role: "medical", icon: Stethoscope, tone: "pink", can: "See and care for the crew on their own mission. Mood only if the crew member shares it.", cannot: "See private journals or other missions." },
  { role: "commander", icon: ShieldCheck, tone: "amber", can: "See who has checked in, schedule conflicts, and that a medical review is happening.", cannot: "See health details, mood or journals." },
  { role: "researcher", icon: Telescope, tone: "blue", can: "Use public research data and anonymous group averages.", cannot: "See anyone's personal records." },
  { role: "admin", icon: UserCog, tone: "violet", can: "Manage people, roles, missions and settings.", cannot: "Open health records, or change their own role." },
];

export default function RolesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Who can see what" description="Each role only gets what it needs. This is enforced on the server, not just hidden on screen." crumbs={[{ label: "People", href: "/app/admin/users" }, { label: "Who can see what" }]} />
      <div className="grid gap-3 md:grid-cols-2">
        {PLAIN.map((p) => (
          <Card key={p.role}>
            <CardBody className="flex gap-3">
              <IconTile tone={p.tone}>
                <p.icon aria-hidden className="h-5 w-5" />
              </IconTile>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{ROLE_SHORT[p.role]}</p>
                <p className="flex gap-1.5">
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {p.can}
                </p>
                <p className="flex gap-1.5 text-muted">
                  <Minus aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {p.cannot}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Callout tone="info">Nobody can give themselves a role. New sign-ups are crew unless they use an invite code you created.</Callout>
      <Card>
        <details>
          <summary className="cursor-pointer list-none px-5 py-5 text-base font-semibold">Full details</summary>
          <CardBody className="overflow-x-auto pt-0">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="py-2">What</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-2">
                      {ROLE_SHORT[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row) => (
                  <tr key={row.capability} className="border-t border-line align-top">
                    <td className="py-2.5 pr-3 font-medium">{row.capability}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-2 py-2.5 text-xs">
                        {row.roles[r] && row.roles[r] !== "No" ? <span className="text-ok">{row.roles[r]}</span> : <span className="text-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </details>
      </Card>
    </div>
  );
}
