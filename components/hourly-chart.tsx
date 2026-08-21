"use client"

import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { HourBucket } from "@/lib/aggregate"
import { T, type Lang } from "@/lib/i18n"

export function HourlyChart({ data, lang = "en" }: { data: HourBucket[]; lang?: Lang }) {
  const t = T[lang]
  const config = {
    logins: { label: lang === "zh" ? t.chartLoginsWord : "Visits", color: "var(--chart-1)" },
  } satisfies ChartConfig
  const peak = Math.max(...data.map((d) => d.logins))

  return (
    <ChartContainer config={config} className="aspect-auto h-[340px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
          className="font-mono"
          tickFormatter={(h: number) => String(h).padStart(2, "0")}
        />
        <YAxis tickLine={false} axisLine={false} width={26} tick={{ fontSize: 10 }} className="font-mono" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="font-mono"
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as HourBucket | undefined
                return p ? `${p.label} – ${String((p.hour + 1) % 24).padStart(2, "0")}:00` : ""
              }}
              formatter={(value, _name, item) => {
                const p = item?.payload as HourBucket
                return (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{t.chartLoginsWord}</span>
                    <span className="tabular-nums">
                      {value as number} · {(p.share * 100).toFixed(1)}%
                    </span>
                  </span>
                )
              }}
            />
          }
        />
        <Bar dataKey="logins" radius={[2, 2, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.hour}
              fill={d.logins === peak ? "var(--chart-2)" : "var(--chart-1)"}
              fillOpacity={d.logins === peak ? 1 : 0.35 + 0.65 * (d.logins / peak)}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
