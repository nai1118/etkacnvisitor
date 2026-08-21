"use client"

import { Bar, BarChart, Cell, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { MonthBucket } from "@/lib/aggregate"
import { T, type Lang } from "@/lib/i18n"

export function MonthlyChart({
  data,
  activeKey,
  onSelect,
  lang = "en",
}: {
  data: MonthBucket[]
  /** Month key ("YYYY-MM") currently paged to, if any. Highlights that bar. */
  activeKey?: string
  /** Called with a month's key when its bar is clicked, to jump to that page. */
  onSelect?: (key: string) => void
  lang?: Lang
}) {
  const t = T[lang]
  const config = {
    perDay: { label: lang === "zh" ? t.chartLoginsPerDay : "Visits / day", color: "var(--chart-1)" },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="aspect-auto h-[160px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="2 4" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={78}
          tick={{ fontSize: 11 }}
          className="font-mono"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="font-mono"
              formatter={(value, _name, item) => {
                const p = item?.payload as MonthBucket
                return (
                  <div className="grid gap-0.5">
                    <span>{(value as number).toFixed(2)} {t.chartLoginsPerDay}</span>
                    <span className="text-muted-foreground">
                      {p.logins} {t.chartTotalWord} · {p.daysObserved} {t.chartDaysWord} · {t.chartPeakWord}{" "}
                      {String(p.peakHour).padStart(2, "0")}:00
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey="perDay" radius={[0, 2, 2, 0]} barSize={26}>
          {data.map((d) => (
            <Cell
              key={d.key}
              fill={activeKey === d.key ? "var(--chart-2)" : "var(--chart-1)"}
              fillOpacity={!activeKey || activeKey === d.key ? 1 : 0.35}
              onClick={onSelect ? () => onSelect(d.key) : undefined}
              style={{ cursor: onSelect ? "pointer" : undefined }}
            />
          ))}
          <LabelList
            dataKey="perDay"
            position="right"
            offset={8}
            className="fill-foreground font-mono"
            fontSize={11}
            formatter={(v: number) => v.toFixed(2)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
