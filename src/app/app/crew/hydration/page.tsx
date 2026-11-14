import type { Metadata } from "next";
import Link from "next/link";
import { crewContext } from "@/lib/crew/context";
import { listPersonal } from "@/lib/data/repo";
import { dailySeries, sumOf } from "@/lib/health/series";
import { dayKey, fmtDateTime, fmtTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, Progress, ViewAll } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { TrendChart, CHART_COLORS } from "@/components/charts/trend-chart";
import { HydrationQuickAdd, MealForm } from "@/components/crew/forms";
import { FoodRater } from "@/components/crew/food-rater";
import { FoodRadar } from "@/components/crew/food-radar";
import { analyseFood } from "@/lib/food/fatigue";
import { MENU } from "@/lib/content/menu";

export const metadata: Metadata = { title: "Water & food" };

export default async function HydrationPage() {
  const { user, tz } = await crewContext();
  const [hyd, meals, ratings] = await Promise.all([listPersonal(user.uid, "hydrationLogs", { sinceDays: 14 }), listPersonal(user.uid, "mealLogs", { sinceDays: 3 }), listPersonal(user.uid, "foodRatings", { sinceDays: 45 })]);
  const report = analyseFood(ratings, MENU.map((m) => m.name), new Date());
  const target = user.preferences.hydrationTargetMl;
  const unit = user.preferences.volumeUnit;
  const today = dayKey(new Date().toISOString(), tz);
  const todayMl = hyd.filter((h) => dayKey(h.at, tz) === today).reduce((s, h) => s + h.amountMl, 0);
  const demo = hyd.some((h) => h.origin === "simulated");
  return (
    <div className="space-y-6">
      <PageHeader title="Water & food" description="Log water, rate your meals and let the taste radar help you avoid getting tired of the menu." crumbs={[{ label: "Home", href: "/app/crew/dashboard" }, { label: "Water & food" }]} badges={demo ? <DemoBadge /> : undefined} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Today" action={<ViewAll href="/app/profile">Edit target</ViewAll>} />
          <CardBody className="space-y-5">
            <div>
              <p className="text-3xl font-bold">
                {unit === "oz" ? `${Math.round(todayMl / 29.57)} oz` : `${(todayMl / 1000).toFixed(2)} L`}
                <span className="ml-1 text-sm font-normal text-muted">{target ? `of ${unit === "oz" ? `${Math.round(target / 29.57)} oz` : `${(target / 1000).toFixed(1)} L`}` : "· no target set"}</span>
              </p>
              {target ? <div className="mt-3"><Progress value={(todayMl / target) * 100} tone="teal" label="Hydration today" /></div> : null}
            </div>
            <HydrationQuickAdd unit={unit} />
            {user.preferences.reminders.hydration ? <p className="text-xs text-muted">Hydration reminders are on (in-app).</p> : <p className="text-xs text-muted">Reminders are off — turn them on in <Link className="text-primary" href="/app/profile">Profile</Link>.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Last 14 days" />
          <CardBody>
            <TrendChart title="Water intake" unit="ml" data={dailySeries(hyd, (h) => h.at, 14, { ml: sumOf((h) => h.amountMl) }, tz)} series={[{ key: "ml", label: "Water", color: CHART_COLORS.teal, type: "bar", unit: "ml" }]} demo={demo} height={250} />
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Rate your meal" description="Three taps. Spot menu fatigue before it spoils your appetite." />
          <CardBody>
            <FoodRater items={MENU.map((m) => ({ name: m.name, emoji: m.emoji }))} suggested={report.suggestions.map((x) => x.item)} />
          </CardBody>
        </Card>
        <FoodRadar report={report} demo={ratings.some((r) => r.origin === "simulated")} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Log a meal" description={user.dietaryConstraints ? `Your dietary notes: ${user.dietaryConstraints}` : "Add dietary preferences in Profile"} />
          <CardBody>
            <MealForm />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent entries" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {[...hyd.slice(0, 5).map((h) => ({ id: h.id, at: h.at, text: `💧 ${h.amountMl} ml water` })), ...meals.slice(0, 5).map((m) => ({ id: m.id, at: m.at, text: `🍽️ ${m.mealType}${m.note ? ` — ${m.note}` : ""}` }))]
                .sort((a, b) => b.at.localeCompare(a.at))
                .slice(0, 8)
                .map((e) => (
                  <li key={e.id} className="flex justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-2.5">
                    <span>{e.text}</span>
                    <span className="text-xs text-muted" title={fmtDateTime(e.at, tz)}>
                      {fmtTime(e.at, tz)}
                    </span>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
