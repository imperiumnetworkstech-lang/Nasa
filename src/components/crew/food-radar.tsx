import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { FatigueReport } from "@/lib/food/fatigue";
import { MENU_EMOJI } from "@/lib/content/menu";

/** Menu Fatigue Radar: plain-language view of the crew member's own taste trends. */
export function FoodRadar({ report, demo }: { report: FatigueReport; demo: boolean }) {
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
  return (
    <Card>
      <CardHeader title="Taste radar" description={`Based on your own ratings${demo ? " · demo data" : ""}`} />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="text-xs text-muted">Meals finished this week</p>
            <p className="text-2xl font-bold">{pct(report.finishedRecent)}</p>
            <p className="text-[11px] text-muted">Last week {pct(report.finishedBefore)}</p>
          </div>
          <div className={`rounded-2xl p-3 ${report.appetiteDropping ? "bg-warn-soft" : "bg-ok-soft"}`}>
            <p className="text-xs text-muted">Appetite</p>
            <p className={`text-lg font-bold ${report.appetiteDropping ? "text-warn" : "text-ok"}`}>{report.appetiteDropping ? "Dipping" : "Steady"}</p>
            <p className="text-[11px] text-muted">{report.appetiteDropping ? "You're finishing fewer meals. Mention it if it continues." : "Keep rating to keep this accurate."}</p>
          </div>
        </div>
        {report.rest.length ? (
          <section>
            <p className="mb-2 text-sm font-semibold">😴 Maybe take a break from</p>
            <ul className="space-y-1.5">
              {report.rest.map((r) => (
                <li key={r.item} className="flex items-center justify-between gap-2 rounded-2xl bg-warn-soft px-3 py-2 text-sm">
                  <span>
                    {MENU_EMOJI[r.item] ?? "🍽️"} {r.item}
                  </span>
                  <span className="text-xs text-muted">{r.why}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {report.suggestions.length ? (
          <section>
            <p className="mb-2 text-sm font-semibold">✨ Try next</p>
            <ul className="space-y-1.5">
              {report.suggestions.map((s) => (
                <li key={s.item} className="flex items-center justify-between gap-2 rounded-2xl bg-primary-soft px-3 py-2 text-sm">
                  <span>
                    {MENU_EMOJI[s.item] ?? "🍽️"} {s.item}
                  </span>
                  <span className="text-xs text-muted">{s.why}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {report.favourites.length ? (
          <p className="text-xs text-muted">
            ❤️ Favourites: {report.favourites
              .slice(0, 5)
              .map((f) => f.item)
              .join(", ")}
          </p>
        ) : null}
        {!report.items.length ? <p className="text-sm text-muted">Rate a few meals and your radar will start spotting patterns.</p> : null}
      </CardBody>
    </Card>
  );
}
