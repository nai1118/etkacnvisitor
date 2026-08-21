"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock, Database, Sunrise } from "lucide-react"

import { CompareTrendChart, COMPARE_COLORS } from "@/components/compare-trend-chart"
import { HourlyChart } from "@/components/hourly-chart"
import { MonthlyChart } from "@/components/monthly-chart"
import { PdfUpload, type UploadedSource } from "@/components/pdf-upload"
import { TrendChart } from "@/components/trend-chart"
import { WeekdayBars } from "@/components/weekday-chart"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { SAMPLE_SOURCE_LABEL, sampleLoginEvents, type LoginEvent } from "@/lib/login-log"
import {
  ZONE_LABEL,
  aggregateByHour,
  aggregateByMonth,
  aggregateByWeekday,
  compareMonths as buildCompareSeries,
  dailySeries,
  formatRange,
  monthKeyOf,
  summarize,
  type Zone,
} from "@/lib/aggregate"

const BANDS: { label: string; from: number; to: number }[] = [
  { label: "00–06 night", from: 0, to: 6 },
  { label: "06–12 morning", from: 6, to: 12 },
  { label: "12–18 afternoon", from: 12, to: 18 },
  { label: "18–24 evening", from: 18, to: 24 },
]

const ALL_MONTHS = "all"

function dedupeEvents(events: LoginEvent[]): LoginEvent[] {
  const seen = new Set<number>()
  const out: LoginEvent[] = []
  for (const e of events) {
    if (seen.has(e.ts)) continue
    seen.add(e.ts)
    out.push(e)
  }
  return out.sort((a, b) => a.ts - b.ts)
}

function pillClass(active: boolean) {
  return cn(
    "rounded-[2px] px-3 py-1.5 font-mono text-xs transition-colors",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
  )
}

export function Dashboard() {
  const [zone, setZone] = useState<Zone>("cn")
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [page, setPage] = useState<string>(ALL_MONTHS)
  const [compareKeys, setCompareKeys] = useState<string[]>([])

  const handleAdd = useCallback((source: UploadedSource) => {
    setSources((prev) => [...prev, source])
  }, [])
  const handleRemove = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id))
  }, [])
  const handleReset = useCallback(() => setSources([]), [])

  const customEvents = useMemo(() => dedupeEvents(sources.flatMap((s) => s.events)), [sources])
  const usingSample = customEvents.length === 0
  const events = usingSample ? sampleLoginEvents : customEvents

  // Always computed over the full dataset, regardless of which month page is
  // active, so the "By month" card stays a stable overview / page switcher.
  const months = useMemo(() => aggregateByMonth(events, zone), [events, zone])

  // If the active page's month disappears (new upload, zone flip that
  // reshuffles month boundaries, etc.) fall back to the "all months" page.
  useEffect(() => {
    if (page !== ALL_MONTHS && !months.some((m) => m.key === page)) {
      setPage(ALL_MONTHS)
    }
  }, [months, page])

  // Drop any compare selections for months that no longer exist.
  useEffect(() => {
    setCompareKeys((prev) => {
      const next = prev.filter((k) => months.some((m) => m.key === k))
      return next.length === prev.length ? prev : next
    })
  }, [months])

  const toggleCompare = useCallback((key: string) => {
    setCompareKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }, [])

  const isComparing = compareKeys.length >= 2
  const compareSeries = useMemo(() => {
    if (!isComparing) return []
    const labels = new Map(months.map((m) => [m.key, m.label]))
    // Keep comparison lines in the same order as the "By month" card.
    const orderedKeys = months.map((m) => m.key).filter((k) => compareKeys.includes(k))
    return buildCompareSeries(events, zone, orderedKeys, labels)
  }, [isComparing, events, zone, compareKeys, months])

  const pageEvents = useMemo(
    () => (page === ALL_MONTHS ? events : events.filter((e) => monthKeyOf(e.ts, zone) === page)),
    [events, zone, page],
  )

  const { hours, days, weekdays, summary, range } = useMemo(
    () => ({
      hours: aggregateByHour(pageEvents, zone),
      days: dailySeries(pageEvents, zone),
      weekdays: aggregateByWeekday(pageEvents, zone),
      summary: summarize(pageEvents, zone),
      range: formatRange(pageEvents, zone),
    }),
    [pageEvents, zone],
  )

  const bands = BANDS.map((b) => ({
    ...b,
    logins: hours.slice(b.from, b.to).reduce((s, h) => s + h.logins, 0),
  }))

  const sourceLabel = usingSample ? SAMPLE_SOURCE_LABEL : sources.map((s) => s.fileName).join(", ")
  const pageLabel = page === ALL_MONTHS ? null : months.find((m) => m.key === page)?.label

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
          {summary.total} login events {usingSample ? "from the bundled sample export" : "parsed from your uploaded PDF(s)"}
          {pageLabel ? ` for ${pageLabel}` : ""}, aggregated by hour of day, by weekday and by month. Observation
          window {range}.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Bucket in</span>
          <div className="inline-flex rounded-sm border border-border bg-card p-0.5" role="group" aria-label="Timezone">
            {(["cn", "utc"] as Zone[]).map((z) => (
              <button key={z} type="button" onClick={() => setZone(z)} aria-pressed={zone === z} className={pillClass(zone === z)}>
                {ZONE_LABEL[z]}
              </button>
            ))}
          </div>
        </div>

      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data source</CardTitle>
          <CardDescription>
            {usingSample
              ? "Showing the bundled sample export. Upload your own visitor login-timestamp PDF to replace it."
              : "Charts below reflect the timestamps parsed from your uploaded PDF(s)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PdfUpload
            sources={sources}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onReset={handleReset}
            usingSample={usingSample}
          />
        </CardContent>
      </Card>

      <section
        aria-label="Summary"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4"
      >
        <Stat label="Total logins" value={summary.total.toString()} note={`${summary.activeDays} active days`} />
        <Stat label="Logins / day" value={summary.perDay.toFixed(2)} note={`${summary.quietDays} days with none`} />
        <Stat
          label="Peak hour"
          value={summary.peakHour.label}
          note={`${summary.peakHour.logins} logins · ${(summary.peakHour.share * 100).toFixed(1)}%`}
        />
        <Stat
          label="Busiest day"
          value={summary.peakDay?.label ?? "–"}
          note={summary.peakDay ? `${summary.peakDay.logins} logins · ${summary.peakDay.weekday}` : "no data"}
        />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Visitor trend</CardTitle>
          <CardDescription>
            {isComparing
              ? `Comparing ${compareSeries.map((s) => s.label).join(" vs ")}, lined up by day of month.`
              : "Daily logins with a 7-day rolling average. Days without a single login are kept as zeros so the gaps stay visible."}
          </CardDescription>
          <CardAction className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Page</span>
              <Select value={page} onValueChange={(v) => setPage(v ?? ALL_MONTHS)}>
                <SelectTrigger size="sm" className="min-w-32 font-mono text-xs" aria-label="Month page">
                  <SelectValue placeholder="All months">
                    {(v: string | null) =>
                      v === null || v === ALL_MONTHS ? "All months" : (months.find((m) => m.key === v)?.label ?? v)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MONTHS} className="font-mono text-xs">
                    All months
                  </SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m.key} value={m.key} className="font-mono text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {months.length >= 2 && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Compare</span>
                <div
                  className="inline-flex flex-wrap gap-0.5 rounded-sm border border-border bg-card p-0.5"
                  role="group"
                  aria-label="Compare months"
                >
                  {months.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleCompare(m.key)}
                      aria-pressed={compareKeys.includes(m.key)}
                      className={pillClass(compareKeys.includes(m.key))}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {isComparing ? (
            <CompareTrendChart series={compareSeries} />
          ) : (
            <TrendChart data={days} average={summary.perDay} />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
            {isComparing ? (
              compareSeries.map((s, i) => (
                <Legend
                  key={s.key}
                  color={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                  label={`${s.label} · ${s.points.reduce((sum, p) => sum + p.logins, 0)} logins`}
                />
              ))
            ) : (
              <>
                <Legend color="var(--chart-1)" label="Logins per day" />
                <Legend color="var(--chart-2)" label="7-day rolling average" dashed />
                <span>mean {summary.perDay.toFixed(2)} / day</span>
              </>
            )}
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
                      {summary.total ? Math.round((b.logins / summary.total) * 100) : 0}%
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
                Normalised to logins per observed day. Click a month to open its page above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={months} activeKey={page === ALL_MONTHS ? undefined : page} onSelect={setPage} />
              <ul className="mt-4 grid gap-1 border-t border-border pt-4">
                {months.map((m) => (
                  <li key={m.key}>
                    <button
                      type="button"
                      onClick={() => setPage(m.key)}
                      aria-pressed={page === m.key}
                      className={cn(
                        "flex w-full items-baseline justify-between gap-3 rounded-sm px-1.5 py-1 font-mono text-xs transition-colors",
                        page === m.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span>{m.label}</span>
                      <span className="tabular-nums">
                        {m.logins} logins / {m.daysObserved} d
                      </span>
                    </button>
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
          Source: <span className="font-mono">{sourceLabel}</span>. Rows appearing in multiple exports were
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
