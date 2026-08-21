import type { LoginEvent } from "./login-log"
import { formatDayLabel, formatMonthLabel, WEEKDAY_NAMES, type Lang } from "./i18n"

export type Zone = "utc" | "cn"

export const ZONE_OFFSET: Record<Zone, number> = {
  utc: 0,
  cn: 8,
}

const HOUR = 3600_000
const DAY = 24 * HOUR

/** Shifted date parts so we can bucket in the selected wall-clock zone. */
function parts(ts: number, offset: number) {
  const d = new Date(ts + offset * HOUR)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    weekday: d.getUTCDay(),
  }
}

function dayKey(ts: number, offset: number) {
  const p = parts(ts, offset)
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}

/** "YYYY-MM" bucket key for a timestamp in the given zone, e.g. for month-page filtering. */
export function monthKeyOf(ts: number, zone: Zone): string {
  const p = parts(ts, ZONE_OFFSET[zone])
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}`
}

/** "YYYY-MM-DD" bucket key for a timestamp in the given zone, e.g. for the by-hour day filter. */
export function dayKeyOf(ts: number, zone: Zone): string {
  return dayKey(ts, ZONE_OFFSET[zone])
}

export type HourBucket = { hour: number; label: string; logins: number; share: number }

// Hour labels ("00:00") are language-neutral, so aggregateByHour needs no lang param.
export function aggregateByHour(events: LoginEvent[], zone: Zone): HourBucket[] {
  const offset = ZONE_OFFSET[zone]
  const counts = new Array(24).fill(0) as number[]
  for (const e of events) counts[parts(e.ts, offset).hour] += 1
  const total = events.length
  return counts.map((logins, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    logins,
    share: total ? logins / total : 0,
  }))
}

export type MonthBucket = {
  key: string
  label: string
  logins: number
  activeDays: number
  daysObserved: number
  perDay: number
  peakHour: number
}

export function aggregateByMonth(events: LoginEvent[], zone: Zone, lang: Lang = "en"): MonthBucket[] {
  const offset = ZONE_OFFSET[zone]
  const map = new Map<string, { label: string; logins: number; days: Set<string>; hours: number[] }>()

  for (const e of events) {
    const p = parts(e.ts, offset)
    const key = `${p.year}-${String(p.month + 1).padStart(2, "0")}`
    let bucket = map.get(key)
    if (!bucket) {
      bucket = { label: formatMonthLabel(lang, p.month, p.year), logins: 0, days: new Set(), hours: new Array(24).fill(0) }
      map.set(key, bucket)
    }
    bucket.logins += 1
    bucket.days.add(dayKey(e.ts, offset))
    bucket.hours[p.hour] += 1
  }

  const days = dailySeries(events, zone, lang)
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => {
      const daysObserved = days.filter((d) => d.date.startsWith(key)).length
      let peakHour = 0
      b.hours.forEach((c, h) => {
        if (c > b.hours[peakHour]) peakHour = h
      })
      return {
        key,
        label: b.label,
        logins: b.logins,
        activeDays: b.days.size,
        daysObserved,
        perDay: daysObserved ? b.logins / daysObserved : 0,
        peakHour,
      }
    })
}

export type DayPoint = {
  date: string
  label: string
  weekday: string
  logins: number
  rolling: number
}

/** Continuous daily series across the observed window (gaps filled with 0). */
export function dailySeries(events: LoginEvent[], zone: Zone, lang: Lang = "en"): DayPoint[] {
  if (events.length === 0) return []

  const offset = ZONE_OFFSET[zone]
  const counts = new Map<string, number>()
  for (const e of events) {
    const k = dayKey(e.ts, offset)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }

  const sorted = [...events].sort((a, b) => a.ts - b.ts)
  const first = sorted[0].ts + offset * HOUR
  const last = sorted[sorted.length - 1].ts + offset * HOUR
  const start = Math.floor(first / DAY) * DAY
  const end = Math.floor(last / DAY) * DAY

  const out: DayPoint[] = []
  for (let t = start; t <= end; t += DAY) {
    const d = new Date(t)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    out.push({
      date: key,
      label: formatDayLabel(lang, d.getUTCMonth(), d.getUTCDate()),
      weekday: WEEKDAY_NAMES[lang][d.getUTCDay()],
      logins: counts.get(key) ?? 0,
      rolling: 0,
    })
  }

  const window = 7
  for (let i = 0; i < out.length; i++) {
    const from = Math.max(0, i - window + 1)
    const slice = out.slice(from, i + 1)
    out[i].rolling = Number((slice.reduce((s, p) => s + p.logins, 0) / slice.length).toFixed(2))
  }
  return out
}

export type CompareSeries = {
  key: string
  label: string
  /** Logins per calendar day-of-month, so different months line up for comparison. */
  points: { day: number; logins: number }[]
}

/**
 * One daily-logins series per given month, indexed by day-of-month (1-31)
 * instead of an absolute date, so e.g. July and August overlay on the same
 * axis. A month only observed through day 10 (partial data) simply stops
 * there rather than being padded with misleading zeros for the rest of the
 * month. Labels are passed in (already localized via aggregateByMonth)
 * rather than recomputed here.
 */
export function compareMonths(
  events: LoginEvent[],
  zone: Zone,
  monthKeys: string[],
  monthLabels: Map<string, string>,
): CompareSeries[] {
  return monthKeys.map((key) => {
    const monthEvents = events.filter((e) => monthKeyOf(e.ts, zone) === key)
    const series = dailySeries(monthEvents, zone)
    return {
      key,
      label: monthLabels.get(key) ?? key,
      points: series.map((p) => ({ day: Number(p.date.slice(-2)), logins: p.logins })),
    }
  })
}

export type WeekdayBucket = { weekday: string; logins: number; isWeekend: boolean }

export function aggregateByWeekday(events: LoginEvent[], zone: Zone, lang: Lang = "en"): WeekdayBucket[] {
  const offset = ZONE_OFFSET[zone]
  const counts = new Array(7).fill(0) as number[]
  for (const e of events) counts[parts(e.ts, offset).weekday] += 1
  // Monday-first ordering reads better for business traffic. Indices are
  // JS's Sun=0..Sat=6; 6 and 0 (Sat, Sun) are the weekend.
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.map((i) => ({
    weekday: WEEKDAY_NAMES[lang][i],
    logins: counts[i],
    isWeekend: i === 0 || i === 6,
  }))
}

export type Summary = {
  total: number
  days: number
  activeDays: number
  perDay: number
  peakHour: HourBucket
  peakDay: DayPoint | null
  quietDays: number
  workingHoursShare: number
}

const EMPTY_HOUR: HourBucket = { hour: 0, label: "00:00", logins: 0, share: 0 }

export function summarize(events: LoginEvent[], zone: Zone, lang: Lang = "en"): Summary {
  const hours = aggregateByHour(events, zone)
  const days = dailySeries(events, zone, lang)
  const total = events.length

  if (total === 0) {
    return {
      total: 0,
      days: 0,
      activeDays: 0,
      perDay: 0,
      peakHour: EMPTY_HOUR,
      peakDay: null,
      quietDays: 0,
      workingHoursShare: 0,
    }
  }

  const peakHour = hours.reduce((a, b) => (b.logins > a.logins ? b : a))
  const peakDay = days.reduce((a, b) => (b.logins > a.logins ? b : a))
  const activeDays = days.filter((d) => d.logins > 0).length
  const working = hours.filter((h) => h.hour >= 8 && h.hour < 18).reduce((s, h) => s + h.logins, 0)
  return {
    total,
    days: days.length,
    activeDays,
    perDay: total / days.length,
    peakHour,
    peakDay,
    quietDays: days.length - activeDays,
    workingHoursShare: working / total,
  }
}

export function formatRange(events: LoginEvent[], zone: Zone, lang: Lang = "en") {
  const days = dailySeries(events, zone, lang)
  if (days.length === 0) return lang === "zh" ? "无资料" : "no data"
  return `${days[0].label} – ${days[days.length - 1].label}`
}
