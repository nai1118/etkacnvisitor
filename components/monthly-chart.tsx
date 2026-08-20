"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { MonthBucket } from "@/lib/aggregate"

const config = {
  perDay: { label: "Logins / day", color: "var(--chart-1)" },
} satisfies ChartConfig

export function MonthlyChart({ data }: { data: MonthBucket[] }) {
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
                    <span>{(value as number).toFixed(2)} logins / day</span>
                    <span className="text-muted-foreground">
                      {p.logins} total · {p.daysObserved} days · peak {String(p.peakHour).padStart(2, "0")}:00
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey="perDay" fill="var(--color-perDay)" radius={[0, 2, 2, 0]} barSize={26}>
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
