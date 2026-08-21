"use client"

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { DayPoint } from "@/lib/aggregate"
import { T, type Lang } from "@/lib/i18n"

export function TrendChart({ data, average, lang = "en" }: { data: DayPoint[]; average: number; lang?: Lang }) {
  const t = T[lang]
  const config = {
    logins: { label: lang === "zh" ? t.chartLoginsWord : "Visits", color: "var(--chart-1)" },
    rolling: { label: lang === "zh" ? "7 天滚动平均" : "7-day average", color: "var(--chart-2)" },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="aspect-auto h-[340px] w-full">
      <ComposedChart data={data} margin={{ left: 4, right: 20, top: 12, bottom: 4 }}>
        <defs>
          <linearGradient id="fillLogins" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-logins)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-logins)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          tickMargin={4}
          className="font-mono"
          tick={{ fontSize: 10 }}
        />
        <ReferenceLine
          y={average}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          label={{
            value: `${t.chartMeanShort} ${average.toFixed(1)}`,
            position: "insideTopLeft",
            fill: "var(--muted-foreground)",
            fontSize: 10,
          }}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              className="font-mono"
              labelFormatter={(value, payload) => {
                const point = payload?.[0]?.payload as DayPoint | undefined
                return point ? `${point.label} · ${point.weekday}` : String(value)
              }}
            />
          }
        />
        <Area
          dataKey="logins"
          type="monotone"
          fill="url(#fillLogins)"
          stroke="var(--color-logins)"
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
        <Line
          dataKey="rolling"
          type="monotone"
          stroke="var(--color-rolling)"
          strokeWidth={1.75}
          strokeDasharray="5 3"
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  )
}
