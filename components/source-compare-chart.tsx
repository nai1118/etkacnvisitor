"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { DayPoint } from "@/lib/aggregate"
import { type Lang } from "@/lib/i18n"

// Distinct from COMPARE_COLORS in compare-trend-chart.tsx (month comparison)
// so the two comparison features never accidentally look identical, even
// though the palette itself is shared.
export const SOURCE_COMPARE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--chart-4)",
]

export type SourceSeries = {
  key: string
  label: string
  /** Daily series for one uploaded file, already in calendar-date order. */
  points: DayPoint[]
}

type Row = { date: string; label: string } & Record<string, number | string | null>

/**
 * Unlike month-vs-month comparison (aligned by day-of-month), sources are
 * aligned by the actual calendar date, since two files typically cover the
 * same real-world window (e.g. two portals' logs for the same weeks).
 */
function buildRows(series: SourceSeries[]): Row[] {
  const labelByDate = new Map<string, string>()
  for (const s of series) for (const p of s.points) labelByDate.set(p.date, p.label)
  const dates = [...labelByDate.keys()].sort()

  return dates.map((date) => {
    const row: Row = { date, label: labelByDate.get(date) ?? date }
    for (const s of series) {
      const point = s.points.find((p) => p.date === date)
      row[s.key] = point ? point.logins : null
    }
    return row
  })
}

export function SourceCompareChart({ series, lang = "en" }: { series: SourceSeries[]; lang?: Lang }) {
  const rows = buildRows(series)
  const config = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: SOURCE_COMPARE_COLORS[i % SOURCE_COMPARE_COLORS.length] }]),
  ) satisfies ChartConfig

  return (
    <ChartContainer config={config} className="aspect-auto h-[340px] w-full">
      <LineChart data={rows} margin={{ left: 4, right: 20, top: 12, bottom: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          interval="preserveStartEnd"
          className="font-mono"
          tick={{ fontSize: 10 }}
        />
        <YAxis tickLine={false} axisLine={false} width={28} tickMargin={4} className="font-mono" tick={{ fontSize: 10 }} />
        <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent className="font-mono" />} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stroke={SOURCE_COMPARE_COLORS[i % SOURCE_COMPARE_COLORS.length]}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
