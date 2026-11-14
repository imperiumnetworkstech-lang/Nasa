import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PERMISSION_MATRIX, SECTION_ROLES } from "@/lib/permissions";
import { ROLES, ROLE_LABELS } from "@/lib/types";
import { Callout, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Roles & permissions" };

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Roles & permissions" description="Enforced in server code (lib/permissions) and mirrored in Firestore security rules." />
      <Card>
        <CardHeader title="Capability matrix" />
        <CardBody className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-2">Capability</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2">
                    {ROLE_LABELS[r].split(" / ")[0]}
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
                      {row.roles[r] ? (
                        row.roles[r] === "No" ? (
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Minus aria-hidden className="h-3.5 w-3.5" /> No
                          </span>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-ok">
                            <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {row.roles[r]}
                          </span>
                        )
                      ) : (
                        <span className="sr-only">No</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Section access" />
        <CardBody className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(SECTION_ROLES).map(([s, roles]) => (
            <div key={s} className="rounded-2xl bg-surface-2 p-3">
              <p className="font-semibold">/app/{s}</p>
              <p className="text-xs text-muted">{roles.join(", ")}</p>
            </div>
          ))}
        </CardBody>
      </Card>
      <Callout tone="info">Users can never self-assign a role. New sign-ups are crew members unless a valid admin-issued invitation code says otherwise.</Callout>
    </div>
  );
}
