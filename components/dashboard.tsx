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
import { SAMPLE_SOURCE_FILENAME, sampleLoginEvents, type LoginEvent } from "@/lib/login-log"
import { LANGS, LANG_LABEL, T, ZONE_LABEL, type Lang } from "@/lib/i18n"
import {
  aggregateByHour,
  aggregateByMonth,
  aggregateByWeekday,
  compareMonths as buildCompareSeries,
  dailySeries,
  dayKeyOf,
  formatRange,
  monthKeyOf,
  summarize,
  type Zone,
} from "@/lib/aggregate"

const ALL_MONTHS = "all"
const ALL_DAYS = "all"

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
  const [lang, setLang] = useState<Lang>("en")
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [page, setPage] = useState<string>(ALL_MONTHS)
  const [compareKeys, setCompareKeys] = useState<string[]>([])
  const [hourDay, setHourDay] = useState<string>(ALL_DAYS)

  const t = T[lang]
  const BANDS: { label: string; from: number; to: number }[] = [
    { label: t.bandNight, from: 0, to: 6 },
    { label: t.bandMorning, from: 6, to: 12 },
    { label: t.bandAfternoon, from: 12, to: 18 },
    { label: t.bandEvening, from: 18, to: 24 },
  ]

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
  const months = useMemo(() => aggregateByMonth(events, zone, lang), [events, zone, lang])

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

  const { days, weekdays, summary, range } = useMemo(
    () => ({
      days: dailySeries(pageEvents, zone, lang),
      weekdays: aggregateByWeekday(pageEvents, zone, lang),
      summary: summarize(pageEvents, zone, lang),
      range: formatRange(pageEvents, zone, lang),
    }),
    [pageEvents, zone, lang],
  )

  // Days with at least one event, within the current month page — the
  // options for the "By hour of day" date filter.
  const hourDayOptions = useMemo(() => days.filter((d) => d.logins > 0), [days])

  // If the selected date falls outside the current page (month switch,
  // upload replaced the data, zone flip, etc.) fall back to "all days".
  useEffect(() => {
    if (hourDay !== ALL_DAYS && !hourDayOptions.some((d) => d.date === hourDay)) {
      setHourDay(ALL_DAYS)
    }
  }, [hourDayOptions, hourDay])

  const hourEvents = useMemo(
    () => (hourDay === ALL_DAYS ? pageEvents : pageEvents.filter((e) => dayKeyOf(e.ts, zone) === hourDay)),
    [pageEvents, zone, hourDay],
  )

  const hours = useMemo(() => aggregateByHour(hourEvents, zone), [hourEvents, zone])

  const hourSummary = useMemo(() => {
    const total = hourEvents.length
    const peak = hours.reduce((a, b) => (b.logins > a.logins ? b : a), hours[0])
    const working = hours.filter((h) => h.hour >= 8 && h.hour < 18).reduce((s, h) => s + h.logins, 0)
    return { total, peakLabel: peak?.label ?? "00:00", workingShare: total ? working / total : 0 }
  }, [hours, hourEvents])

  const bands = BANDS.map((b) => ({
    ...b,
    logins: hours.slice(b.from, b.to).reduce((s, h) => s + h.logins, 0),
  }))

  const sourceLabel = usingSample
    ? `${SAMPLE_SOURCE_FILENAME} ${t.sampleDataSuffix}`
    : sources.map((s) => s.fileName).join(", ")
  const pageLabel = page === ALL_MONTHS ? null : (months.find((m) => m.key === page)?.label ?? null)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <header className="grid-paper -mx-4 mb-8 border-b border-border px-4 pb-8 pt-10 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t.breadcrumb}</p>
          <div className="inline-flex rounded-sm border border-border bg-card p-0.5" role="group" aria-label={t.langLabel}>
            {LANGS.map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={pillClass(lang === l)}>
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
        </div>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {t.intro({ total: summary.total, usingSample, pageLabel, range })}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t.bucketIn}</span>
          <div className="inline-flex rounded-sm border border-border bg-card p-0.5" role="group" aria-label="Timezone">
            {(["cn", "utc"] as Zone[]).map((z) => (
              <button key={z} type="button" onClick={() => setZone(z)} aria-pressed={zone === z} className={pillClass(zone === z)}>
                {ZONE_LABEL[lang][z]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.dataSourceTitle}</CardTitle>
          <CardDescription>{usingSample ? t.dataSourceDescSample : t.dataSourceDescCustom}</CardDescription>
        </CardHeader>
        <CardContent>
          <PdfUpload
            sources={sources}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onReset={handleReset}
            usingSample={usingSample}
            lang={lang}
          />
        </CardContent>
      </Card>

      <section
        aria-label="Summary"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4"
      >
        <Stat label={t.statTotalLogins} value={summary.total.toString()} note={t.statTotalLoginsNote(summary.activeDays)} />
        <Stat label={t.statLoginsPerDay} value={summary.perDay.toFixed(2)} note={t.statLoginsPerDayNote(summary.quietDays)} />
        <Stat
          label={t.statPeakHour}
          value={summary.peakHour.label}
          note={t.statPeakHourNote(summary.peakHour.logins, (summary.peakHour.share * 100).toFixed(1))}
        />
        <Stat
          label={t.statBusiestDay}
          value={summary.peakDay?.label ?? "–"}
          note={summary.peakDay ? t.statBusiestDayNote(summary.peakDay.logins, summary.peakDay.weekday) : t.statBusiestDayNoData}
        />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t.visitorTrendTitle}</CardTitle>
          <CardDescription>
            {isComparing ? t.visitorTrendDescCompare(compareSeries.map((s) => s.label).join(" vs ")) : t.visitorTrendDescNormal}
          </CardDescription>
          <CardAction className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t.pageLabel}</span>
              <Select value={page} onValueChange={(v) => setPage(v ?? ALL_MONTHS)}>
                <SelectTrigger size="sm" className="min-w-32 font-mono text-xs" aria-label={t.pageLabel}>
                  <SelectValue placeholder={t.allMonths}>
                    {(v: string | null) =>
                      v === null || v === ALL_MONTHS ? t.allMonths : (months.find((m) => m.key === v)?.label ?? v)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_MONTHS} className="font-mono text-xs">
                    {t.allMonths}
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
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t.compareLabel}</span>
                <div
                  className="inline-flex flex-wrap gap-0.5 rounded-sm border border-border bg-card p-0.5"
                  role="group"
                  aria-label={t.compareLabel}
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
            <CompareTrendChart series={compareSeries} lang={lang} />
          ) : (
            <TrendChart data={days} average={summary.perDay} lang={lang} />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
            {isComparing ? (
              compareSeries.map((s, i) => (
                <Legend
                  key={s.key}
                  color={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                  label={t.compareLegendItem(
                    s.label,
                    s.points.reduce((sum, p) => sum + p.logins, 0),
                  )}
                />
              ))
            ) : (
              <>
                <Legend color="var(--chart-1)" label={t.legendLoginsPerDay} />
                <Legend color="var(--chart-2)" label={t.legendRollingAvg} dashed />
                <span>{t.legendMean(summary.perDay.toFixed(2))}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.byHourTitle}</CardTitle>
            <CardDescription>{t.byHourDesc(hourSummary.total, ZONE_LABEL[lang][zone])}</CardDescription>
            <CardAction className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t.byHourDayLabel}</span>
              <Select value={hourDay} onValueChange={(v) => setHourDay(v ?? ALL_DAYS)}>
                <SelectTrigger size="sm" className="min-w-32 font-mono text-xs" aria-label={t.byHourDayLabel}>
                  <SelectValue placeholder={t.allDays}>
                    {(v: string | null) =>
                      v === null || v === ALL_DAYS ? t.allDays : (hourDayOptions.find((d) => d.date === v)?.label ?? v)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DAYS} className="font-mono text-xs">
                    {t.allDays}
                  </SelectItem>
                  {hourDayOptions.map((d) => (
                    <SelectItem key={d.date} value={d.date} className="font-mono text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent>
            <HourlyChart data={hours} lang={lang} />
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4">
              {bands.map((b) => (
                <div key={b.label} className="bg-card px-3 py-2.5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{b.label}</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums">
                    {b.logins}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {hourSummary.total ? Math.round((b.logins / hourSummary.total) * 100) : 0}%
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t.workingHoursNote((hourSummary.workingShare * 100).toFixed(0), ZONE_LABEL[lang][zone], hourSummary.peakLabel)}
            </p>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.byMonthTitle}</CardTitle>
              <CardDescription>{t.byMonthDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={months} activeKey={page === ALL_MONTHS ? undefined : page} onSelect={setPage} lang={lang} />
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
                      <span className="tabular-nums">{t.byMonthListItem(m.logins, m.daysObserved)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.byWeekdayTitle}</CardTitle>
              <CardDescription>{t.byWeekdayDesc}</CardDescription>
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
          <span>
            {t.footerSourcePrefix} <span className="font-mono">{sourceLabel}</span>. {t.footerSourceSuffix}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Sunrise className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t.footerTz}
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
