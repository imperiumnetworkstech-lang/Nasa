import { dayKey, fmtDate } from "@/lib/utils";

/** Bucket timestamped values by calendar day (in the user's timezone) for charts. */
export function dailySeries<T>(
  items: T[],
  at: (x: T) => string,
  days: number,
  reducers: Record<string, (group: T[]) => number | null>,
  tz = "UTC",
  now = new Date(),
): Record<string, string | number | null>[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = dayKey(at(it), tz);
    const g = groups.get(k);
    if (g) g.push(it);
    else groups.set(k, [it]);
  }
  const rows: Record<string, string | number | null>[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const k = dayKey(d.toISOString(), tz);
    const g = groups.get(k) ?? [];
    const row: Record<string, string | number | null> = { label: fmtDate(d.toISOString(), tz), day: k };
    for (const [name, fn] of Object.entries(reducers)) row[name] = g.length ? fn(g) : null;
    rows.push(row);
  }
  return rows;
}

export const meanOf = <T,>(f: (x: T) => number | null | undefined) => (g: T[]) => {
  const v = g.map(f).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
export const sumOf = <T,>(f: (x: T) => number) => (g: T[]) => g.reduce((s, x) => s + f(x), 0);
