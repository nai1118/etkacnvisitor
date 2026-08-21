"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { CompareSeries } from "@/lib/aggregate"

export const COMPARE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-5)", "var(--chart-3)", "var(--chart-4)"]
const COLORS = COMPARE_COLORS

type Row = { day: number } & Record<string, number | null>

function buildRows(series: CompareSeries[]): Row[] {
  const maxDay = Math.max(1, ...series.map((s) => (s.points.length ? s.points[s.points.length - 1].day : 0)))
  const rows: Row[] = []
  for (let day = 1; day <= maxDay; day++) {
    const row: Row = { day }
    for (const s of series) {
      const point = s.points.find((p) => p.day === day)
      row[s.key] = point ? point.logins : null
    }
    rows.push(row)
  }
  return rows
}

export function CompareTrendChart({ series }: { series: CompareSeries[] }) {
  const rows = buildRows(series)
  const config = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: COLORS[i % COLORS.length] }]),
  ) satisfies ChartConfig

  return (
    <ChartContainer config={config} className="aspect-auto h-[340px] w-full">
      <LineChart data={rows} margin={{ left: 4, right: 20, top: 12, bottom: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey="day"
          type="number"
          domain={[1, "dataMax"]}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          className="font-mono"
          tick={{ fontSize: 10 }}
          tickFormatter={(d: number) => String(d).padStart(2, "0")}
        />
        <YAxis tickLine={false} axisLine={false} width={28} tickMargin={4} className="font-mono" tick={{ fontSize: 10 }} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              className="font-mono"
              labelFormatter={(value) => `Day ${String(value).padStart(2, "0")}`}
            />
          }
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stroke={COLORS[i % COLORS.length]}
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
