import { loginEvents } from "./login-log"

export type Zone = "utc" | "cn"

export const ZONE_OFFSET: Record<Zone, number> = {
  utc: 0,
  cn: 8,
}

export const ZONE_LABEL: Record<Zone, string> = {
  utc: "UTC",
  cn: "China (UTC+8)",
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export type HourBucket = { hour: number; label: string; logins: number; share: number }

export function aggregateByHour(zone: Zone): HourBucket[] {
  const offset = ZONE_OFFSET[zone]
  const counts = new Array(24).fill(0) as number[]
  for (const e of loginEvents) counts[parts(e.ts, offset).hour] += 1
  const total = loginEvents.length
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

export function aggregateByMonth(zone: Zone): MonthBucket[] {
  const offset = ZONE_OFFSET[zone]
  const map = new Map<string, { label: string; logins: number; days: Set<string>; hours: number[] }>()

  for (const e of loginEvents) {
    const p = parts(e.ts, offset)
    const key = `${p.year}-${String(p.month + 1).padStart(2, "0")}`
    let bucket = map.get(key)
    if (!bucket) {
      bucket = { label: `${MONTHS[p.month]} ${p.year}`, logins: 0, days: new Set(), hours: new Array(24).fill(0) }
      map.set(key, bucket)
    }
    bucket.logins += 1
    bucket.days.add(dayKey(e.ts, offset))
    bucket.hours[p.hour] += 1
  }

  const days = dailySeries(zone)
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
export function dailySeries(zone: Zone): DayPoint[] {
  const offset = ZONE_OFFSET[zone]
  const counts = new Map<string, number>()
  for (const e of loginEvents) {
    const k = dayKey(e.ts, offset)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }

  const first = loginEvents[0].ts + offset * HOUR
  const last = loginEvents[loginEvents.length - 1].ts + offset * HOUR
  const start = Math.floor(first / DAY) * DAY
  const end = Math.floor(last / DAY) * DAY

  const out: DayPoint[] = []
  for (let t = start; t <= end; t += DAY) {
    const d = new Date(t)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    out.push({
      date: key,
      label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
      weekday: WEEKDAYS[d.getUTCDay()],
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

export type WeekdayBucket = { weekday: string; logins: number }

export function aggregateByWeekday(zone: Zone): WeekdayBucket[] {
  const offset = ZONE_OFFSET[zone]
  const counts = new Array(7).fill(0) as number[]
  for (const e of loginEvents) counts[parts(e.ts, offset).weekday] += 1
  // Monday-first ordering reads better for business traffic.
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.map((i) => ({ weekday: WEEKDAYS[i], logins: counts[i] }))
}

export type Summary = {
  total: number
  days: number
  activeDays: number
  perDay: number
  peakHour: HourBucket
  peakDay: DayPoint
  quietDays: number
  workingHoursShare: number
}

export function summarize(zone: Zone): Summary {
  const hours = aggregateByHour(zone)
  const days = dailySeries(zone)
  const peakHour = hours.reduce((a, b) => (b.logins > a.logins ? b : a))
  const peakDay = days.reduce((a, b) => (b.logins > a.logins ? b : a))
  const activeDays = days.filter((d) => d.logins > 0).length
  const working = hours.filter((h) => h.hour >= 8 && h.hour < 18).reduce((s, h) => s + h.logins, 0)
  const total = loginEvents.length
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

export function formatRange(zone: Zone) {
  const days = dailySeries(zone)
  return `${days[0].label} – ${days[days.length - 1].label}, 2026`
}
