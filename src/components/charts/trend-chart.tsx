"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import { DemoBadge } from "@/components/ui/badge";

export interface Series {
  key: string;
  label: string;
  color: string;
  type?: "line" | "bar" | "area";
  unit?: string;
  axis?: "left" | "right";
  dashed?: boolean;
}

export type ChartRow = Record<string, string | number | null>;

export const CHART_COLORS = {
  primary: "var(--violet)",
  violet: "var(--violet)",
  teal: "var(--teal)",
  amber: "var(--amber)",
  coral: "var(--coral)",
  slate: "var(--slate)",
  navy: "var(--midnight)",
};

/**
 * Accessible trend chart: visible units, tooltip, legend, a "Demo data" label for synthetic data,
 * and a data-table alternative for screen-reader and keyboard users. No "normal range" shading.
 */
export function TrendChart({
  data,
  series,
  xKey = "label",
  unit,
  rightUnit,
  height = 240,
  title,
  demo,
  yDomain,
  emptyText = "No data recorded for this period yet.",
}: {
  data: ChartRow[];
  series: Series[];
  xKey?: string;
  unit?: string;
  rightUnit?: string;
  height?: number;
  title: string;
  demo?: boolean;
  yDomain?: [number | "auto", number | "auto"];
  emptyText?: string;
}) {
  const hasData = data.some((r) => series.some((s) => typeof r[s.key] === "number"));
  const hasRight = series.some((s) => s.axis === "right");
  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {title}
          {unit ? ` (${unit}${rightUnit ? ` · right axis ${rightUnit}` : ""})` : ""}
        </span>
        {demo ? <DemoBadge /> : null}
      </figcaption>
      {hasData ? (
        <div style={{ height }} role="img" aria-label={`${title} chart. A data table follows.`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 6, right: hasRight ? 6 : 12, bottom: 0, left: -12 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} minTickGap={16} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} domain={yDomain ?? ["auto", "auto"]} width={48} />
              {hasRight ? <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={48} /> : null}
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12, color: "var(--fg)" }}
                formatter={(value, name) => {
                  const s = series.find((x) => x.label === name);
                  return [`${typeof value === "number" ? Math.round(value * 10) / 10 : value} ${s?.unit ?? unit ?? ""}`, name];
                }}
              />
              {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
              {series.map((s) =>
                s.type === "bar" ? (
                  <Bar key={s.key} yAxisId={s.axis ?? "left"} dataKey={s.key} name={s.label} fill={s.color} radius={[8, 8, 8, 8]} maxBarSize={22} />
                ) : s.type === "area" ? (
                  <Area key={s.key} type="monotone" yAxisId={s.axis ?? "left"} dataKey={s.key} name={s.label} stroke={s.color} fill={`url(#g-${s.key})`} strokeWidth={3} dot={{ r: 3, fill: "var(--surface)", stroke: s.color, strokeWidth: 2 }} connectNulls isAnimationActive={false} />
                ) : (
                  <Line
                    key={s.key}
                    yAxisId={s.axis ?? "left"}
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    type="monotone"
                    strokeWidth={2.5}
                    strokeDasharray={s.dashed ? "5 4" : undefined}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ),
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted" style={{ height: Math.min(height, 140) }}>
          {emptyText}
        </div>
      )}
      {hasData ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted hover:text-fg">View data table</summary>
          <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-2">
                <tr>
                  <th className="px-2 py-1 font-medium">Date</th>
                  {series.map((s) => (
                    <th key={s.key} className="px-2 py-1 font-medium">
                      {s.label} {s.unit ?? unit ? `(${s.unit ?? unit})` : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-2 py-1">{String(r[xKey])}</td>
                    {series.map((s) => (
                      <td key={s.key} className="px-2 py-1 tabular-nums">
                        {typeof r[s.key] === "number" ? Math.round((r[s.key] as number) * 10) / 10 : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </figure>
  );
}
