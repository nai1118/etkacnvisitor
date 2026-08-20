"use client"

import type { WeekdayBucket } from "@/lib/aggregate"

export function WeekdayBars({ data }: { data: WeekdayBucket[] }) {
  const max = Math.max(...data.map((d) => d.logins))
  const total = data.reduce((s, d) => s + d.logins, 0)

  return (
    <ul className="grid gap-2.5">
      {data.map((d) => {
        const weekend = d.weekday === "Sat" || d.weekday === "Sun"
        return (
          <li key={d.weekday} className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{d.weekday}</span>
            <span className="h-2.5 w-full overflow-hidden rounded-sm bg-secondary">
              <span
                className="block h-full rounded-sm"
                style={{
                  width: `${max ? (d.logins / max) * 100 : 0}%`,
                  backgroundColor: weekend ? "var(--chart-4)" : "var(--chart-1)",
                }}
              />
            </span>
            <span className="font-mono text-xs tabular-nums text-right">
              {d.logins}
              <span className="ml-1 text-muted-foreground">{total ? Math.round((d.logins / total) * 100) : 0}%</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
