"use client"

import { useMemo, useState } from "react"
import { Clock, Database, Sunrise } from "lucide-react"

import { HourlyChart } from "@/components/hourly-chart"
import { MonthlyChart } from "@/components/monthly-chart"
import { TrendChart } from "@/components/trend-chart"
import { WeekdayBars } from "@/components/weekday-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ZONE_LABEL,
  aggregateByHour,
  aggregateByMonth,
  aggregateByWeekday,
  dailySeries,
  formatRange,
  summarize,
  type Zone,
} from "@/lib/aggregate"

const BANDS: { label: string; from: number; to: number }[] = [
  { label: "00–06 night", from: 0, to: 6 },
  { label: "06–12 morning", from: 6, to: 12 },
  { label: "12–18 afternoon", from: 12, to: 18 },
  { label: "18–24 evening", from: 18, to: 24 },
]

export function Dashboard() {
  const [zone, setZone] = useState<Zone>("cn")

  const { hours, months, days, weekdays, summary, range } = useMemo(
    () => ({
      hours: aggregateByHour(zone),
      months: aggregateByMonth(zone),
      days: dailySeries(zone),
      weekdays: aggregateByWeekday(zone),
      summary: summarize(zone),
      range: formatRange(zone),
    }),
    [zone],
  )

  const bands = BANDS.map((b) => ({
    ...b,
    logins: hours.slice(b.from, b.to).reduce((s, h) => s + h.logins, 0),
  }))

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <header className="grid-paper -mx-4 mb-8 border-b border-border px-4 pb-8 pt-10 sm:-mx-6 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          etka.com.cn / etkaportalcn / zh-cn / login / news
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Visitor login timestamp analytics
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {summary.total} login events parsed from the two access-log exports, aggregated by hour of day, by weekday and
          by month. Observation window {range}.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Bucket in</span>
          <div className="inline-flex rounded-sm border border-border bg-card p-0.5" role="group" aria-label="Timezone">
            {(["cn", "utc"] as Zone[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZone(z)}
                aria-pressed={zone === z}
                className={cn(
                  "rounded-[2px] px-3 py-1.5 font-mono text-xs transition-colors",
                  zone === z
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {ZONE_LABEL[z]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4">
        <Stat label="Total logins" value={summary.total.toString()} note={`${summary.activeDays} active days`} />
        <Stat label="Logins / day" value={summary.perDay.toFixed(2)} note={`${summary.quietDays} days with none`} />
        <Stat
          label="Peak hour"
          value={summary.peakHour.label}
          note={`${summary.peakHour.logins} logins · ${(summary.peakHour.share * 100).toFixed(1)}%`}
        />
        <Stat
          label="Busiest day"
          value={summary.peakDay.label}
          note={`${summary.peakDay.logins} logins · ${summary.peakDay.weekday}`}
        />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Visitor trend</CardTitle>
          <CardDescription>
            Daily logins with a 7-day rolling average. Days without a single login are kept as zeros so the gaps stay
            visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={days} average={summary.perDay} />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
            <Legend color="var(--chart-1)" label="Logins per day" />
            <Legend color="var(--chart-2)" label="7-day rolling average" dashed />
            <span>mean {summary.perDay.toFixed(2)} / day</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By hour of day</CardTitle>
            <CardDescription>
              All {summary.total} events folded into 24 buckets, {ZONE_LABEL[zone]} wall clock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyChart data={hours} />
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4">
              {bands.map((b) => (
                <div key={b.label} className="bg-card px-3 py-2.5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{b.label}</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums">
                    {b.logins}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {Math.round((b.logins / summary.total) * 100)}%
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {(summary.workingHoursShare * 100).toFixed(0)}% of all logins land inside 08:00–18:00 {ZONE_LABEL[zone]},
              with the single busiest hour at {summary.peakHour.label}.
            </p>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By month</CardTitle>
              <CardDescription>
                Normalised to logins per observed day, since August is a partial month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={months} />
              <ul className="mt-4 grid gap-2 border-t border-border pt-4">
                {months.map((m) => (
                  <li key={m.key} className="flex items-baseline justify-between gap-3 font-mono text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="tabular-nums">
                      {m.logins} logins / {m.daysObserved} d
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By weekday</CardTitle>
              <CardDescription>Weekend buckets shown in grey.</CardDescription>
            </CardHeader>
            <CardContent>
              <WeekdayBars data={weekdays} />
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="mt-8 grid gap-2 rounded-sm border border-dashed border-border px-4 py-4 text-xs leading-relaxed text-muted-foreground">
        <p className="flex items-start gap-2">
          <Database className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Source: <span className="font-mono">etka_zh-cn_login_news_1-30_Juli_2026.pdf</span> and{" "}
          <span className="font-mono">etka_zh-cn_login_news.pdf</span>. Rows appearing in both exports were
          de-duplicated.
        </p>
        <p className="flex items-start gap-2">
          <Sunrise className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Timestamps are stored in UTC; China time is derived as UTC+8, which can shift an event into the next calendar
          day.
        </p>
      </footer>
    </main>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-card px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{note}</p>
    </div>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-0 w-6 border-t-2"
        style={{ borderColor: color, borderTopStyle: dashed ? "dashed" : "solid" }}
      />
      {label}
    </span>
  )
}
