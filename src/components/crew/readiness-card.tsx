import Link from "next/link";
import { CheckCircle2, CircleDashed, CircleAlert, TriangleAlert } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { Factor } from "@/lib/health/readiness";
import { fmtDateTime } from "@/lib/utils";

const STATUS = {
  usual: { icon: CheckCircle2, text: "Within your usual range", cls: "text-ok" },
  outside: { icon: TriangleAlert, text: "Different from your usual", cls: "text-warn" },
  attention: { icon: CircleAlert, text: "Worth a look", cls: "text-warn" },
  missing: { icon: CircleDashed, text: "Missing data", cls: "text-muted" },
};

/** Transparent wellbeing summary: each factor shows status, the data behind it and freshness. */
export function ReadinessCard({ factors, tz, demo }: { factors: Factor[]; tz: string; demo: boolean }) {
  const usual = factors.filter((f) => f.status === "usual").length;
  const missing = factors.filter((f) => f.status === "missing").length;
  return (
    <Card>
      <CardHeader
        title="Wellbeing summary"
        description={`${usual} of ${factors.length} factors within your usual range${missing ? ` · ${missing} missing` : ""}. A summary of your own records — not a diagnosis or fitness-for-duty decision.`}
        action={demo ? <span className="text-xs text-warn">Demo data</span> : undefined}
      />
      <CardBody>
        <ul className="divide-y divide-line">
          {factors.map((f) => {
            const s = STATUS[f.status];
            return (
              <li key={f.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <s.icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${s.cls}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link href={f.href} className="font-medium text-fg hover:underline">
                      {f.name}
                    </Link>
                    <span className={`text-xs font-medium ${s.cls}`}>{s.text}</span>
                  </div>
                  <p className="text-sm text-muted">{f.detail}</p>
                  <p className="text-xs text-muted/80">{f.at ? `Data from ${fmtDateTime(f.at, tz)}` : "No data"}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
