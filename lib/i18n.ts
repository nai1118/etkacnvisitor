// Minimal hand-rolled EN / 中文 translation layer for the dashboard. No i18n
// library — just a typed dictionary plus a couple of date-label helpers, so
// every component (and lib/aggregate.ts, which generates month/weekday
// names) can stay in sync on one `Lang` value.

export type Lang = "en" | "zh"

export const LANGS: Lang[] = ["en", "zh"]

export const LANG_LABEL: Record<Lang, string> = {
  en: "EN",
  zh: "中文",
}

export const MONTH_NAMES: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
}

/** Sunday-first, matching Date#getUTCDay(). */
export const WEEKDAY_NAMES: Record<Lang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  zh: ["日", "一", "二", "三", "四", "五", "六"],
}

export function formatMonthLabel(lang: Lang, monthIndex: number, year: number): string {
  return lang === "zh" ? `${year}年${MONTH_NAMES.zh[monthIndex]}` : `${MONTH_NAMES.en[monthIndex]} ${year}`
}

export function formatDayLabel(lang: Lang, monthIndex: number, day: number): string {
  return lang === "zh" ? `${MONTH_NAMES.zh[monthIndex]}${day}日` : `${MONTH_NAMES.en[monthIndex]} ${day}`
}

export const ZONE_LABEL: Record<Lang, { utc: string; cn: string }> = {
  en: { utc: "UTC", cn: "China (UTC+8)" },
  zh: { utc: "UTC", cn: "中國 (UTC+8)" },
}

export type Dict = {
  breadcrumb: string
  title: string
  intro: (p: { total: number; usingSample: boolean; pageLabel: string | null; range: string }) => string
  bucketIn: string
  langLabel: string

  dataSourceTitle: string
  dataSourceDescSample: string
  dataSourceDescCustom: string
  sampleDataSuffix: string

  statTotalLogins: string
  statTotalLoginsNote: (activeDays: number) => string
  statLoginsPerDay: string
  statLoginsPerDayNote: (quietDays: number) => string
  statPeakHour: string
  statPeakHourNote: (logins: number, pct: string) => string
  statBusiestDay: string
  statBusiestDayNote: (logins: number, weekday: string) => string
  statBusiestDayNoData: string

  visitorTrendTitle: string
  visitorTrendDescNormal: string
  visitorTrendDescCompare: (labels: string) => string
  pageLabel: string
  allMonths: string
  compareLabel: string
  legendLoginsPerDay: string
  legendRollingAvg: string
  legendMean: (v: string) => string
  compareLegendItem: (label: string, logins: number) => string

  byHourTitle: string
  byHourDesc: (total: number, zone: string) => string
  bandNight: string
  bandMorning: string
  bandAfternoon: string
  bandEvening: string
  workingHoursNote: (pct: string, zone: string, peakHour: string) => string

  byMonthTitle: string
  byMonthDesc: string
  byMonthListItem: (logins: number, days: number) => string

  byWeekdayTitle: string
  byWeekdayDesc: string

  footerSourcePrefix: string
  footerSourceSuffix: string
  footerTz: string

  uploadIdleText: string
  uploadBusyText: string
  uploadHint: string
  uploadChooseError: string
  uploadGenericError: string
  uploadParsedNotice: (fileName: string, count: number, pages: number) => string
  uploadWarningNotice: (fileName: string, warning: string) => string
  removeFileLabel: (fileName: string) => string
  eventCount: (n: number) => string
  clearUploads: string

  chartLoginsWord: string
  chartLoginsPerDay: string
  chartTotalWord: string
  chartDaysWord: string
  chartPeakWord: string
  chartMeanShort: string
  compareDayLabel: (day: string) => string
}

const en: Dict = {
  breadcrumb: "etka.com.cn / etkaportalcn / zh-cn / login / news",
  title: "Visitor login timestamp analytics",
  intro: ({ total, usingSample, pageLabel, range }) =>
    `${total} login events ${usingSample ? "from the bundled sample export" : "parsed from your uploaded PDF(s)"}` +
    `${pageLabel ? ` for ${pageLabel}` : ""}, aggregated by hour of day, by weekday and by month. Observation window ${range}.`,
  bucketIn: "Bucket in",
  langLabel: "Language",

  dataSourceTitle: "Data source",
  dataSourceDescSample: "Showing the bundled sample export. Upload your own visitor login-timestamp PDF to replace it.",
  dataSourceDescCustom: "Charts below reflect the timestamps parsed from your uploaded PDF(s).",
  sampleDataSuffix: "(sample data)",

  statTotalLogins: "Total logins",
  statTotalLoginsNote: (activeDays) => `${activeDays} active days`,
  statLoginsPerDay: "Logins / day",
  statLoginsPerDayNote: (quietDays) => `${quietDays} days with none`,
  statPeakHour: "Peak hour",
  statPeakHourNote: (logins, pct) => `${logins} logins · ${pct}%`,
  statBusiestDay: "Busiest day",
  statBusiestDayNote: (logins, weekday) => `${logins} logins · ${weekday}`,
  statBusiestDayNoData: "no data",

  visitorTrendTitle: "Visitor trend",
  visitorTrendDescNormal:
    "Daily logins with a 7-day rolling average. Days without a single login are kept as zeros so the gaps stay visible.",
  visitorTrendDescCompare: (labels) => `Comparing ${labels}, lined up by day of month.`,
  pageLabel: "Page",
  allMonths: "All months",
  compareLabel: "Compare",
  legendLoginsPerDay: "Logins per day",
  legendRollingAvg: "7-day rolling average",
  legendMean: (v) => `mean ${v} / day`,
  compareLegendItem: (label, logins) => `${label} · ${logins} logins`,

  byHourTitle: "By hour of day",
  byHourDesc: (total, zone) => `All ${total} events folded into 24 buckets, ${zone} wall clock.`,
  bandNight: "00–06 night",
  bandMorning: "06–12 morning",
  bandAfternoon: "12–18 afternoon",
  bandEvening: "18–24 evening",
  workingHoursNote: (pct, zone, peakHour) =>
    `${pct}% of all logins land inside 08:00–18:00 ${zone}, with the single busiest hour at ${peakHour}.`,

  byMonthTitle: "By month",
  byMonthDesc: "Normalised to logins per observed day. Click a month to open its page above.",
  byMonthListItem: (logins, days) => `${logins} logins / ${days} d`,

  byWeekdayTitle: "By weekday",
  byWeekdayDesc: "Weekend buckets shown in grey.",

  footerSourcePrefix: "Source:",
  footerSourceSuffix: "Rows appearing in multiple exports were de-duplicated.",
  footerTz: "Timestamps are stored in UTC; China time is derived as UTC+8, which can shift an event into the next calendar day.",

  uploadIdleText: "Drop a login-log PDF here, or click to choose",
  uploadBusyText: "Parsing PDF…",
  uploadHint:
    "Timestamps are extracted and aggregated entirely in your browser — the file isn't uploaded anywhere. Multiple files are merged and de-duplicated.",
  uploadChooseError: "Please choose a PDF file.",
  uploadGenericError: "Could not read that PDF.",
  uploadParsedNotice: (fileName, count, pages) =>
    `${fileName}: parsed ${count} timestamp${count === 1 ? "" : "s"} from ${pages} page${pages === 1 ? "" : "s"}.`,
  uploadWarningNotice: (fileName, warning) => `${fileName}: ${warning}`,
  removeFileLabel: (fileName) => `Remove ${fileName}`,
  eventCount: (n) => `${n} event${n === 1 ? "" : "s"}`,
  clearUploads: "Clear uploads, show sample data",

  chartLoginsWord: "logins",
  chartLoginsPerDay: "logins / day",
  chartTotalWord: "total",
  chartDaysWord: "days",
  chartPeakWord: "peak",
  chartMeanShort: "mean",
  compareDayLabel: (day) => `Day ${day}`,
}

const zh: Dict = {
  breadcrumb: "etka.com.cn / etkaportalcn / zh-cn / login / news",
  title: "訪客登入時間戳記分析",
  intro: ({ total, usingSample, pageLabel, range }) =>
    `共 ${total} 筆登入紀錄,${usingSample ? "來自內建的範例匯出檔" : "解析自你上傳的 PDF"}` +
    `${pageLabel ? `(僅顯示 ${pageLabel})` : ""},依小時、星期與月份彙整。觀察區間 ${range}。`,
  bucketIn: "時區",
  langLabel: "語言",

  dataSourceTitle: "資料來源",
  dataSourceDescSample: "目前顯示內建的範例匯出檔。上傳你自己的訪客登入時間戳記 PDF 即可取代它。",
  dataSourceDescCustom: "下方圖表已改為顯示你上傳的 PDF 解析出的時間戳記。",
  sampleDataSuffix: "(範例資料)",

  statTotalLogins: "登入總數",
  statTotalLoginsNote: (activeDays) => `${activeDays} 個有活動的天數`,
  statLoginsPerDay: "平均每日登入",
  statLoginsPerDayNote: (quietDays) => `${quietDays} 天沒有登入`,
  statPeakHour: "尖峰時段",
  statPeakHourNote: (logins, pct) => `${logins} 筆登入 · ${pct}%`,
  statBusiestDay: "最忙碌的一天",
  statBusiestDayNote: (logins, weekday) => `${logins} 筆登入 · 週${weekday}`,
  statBusiestDayNoData: "無資料",

  visitorTrendTitle: "訪客趨勢",
  visitorTrendDescNormal: "每日登入數與 7 天滾動平均。沒有登入的日子以 0 呈現,讓斷點清楚可見。",
  visitorTrendDescCompare: (labels) => `正在比對 ${labels},依「當月第幾天」對齊。`,
  pageLabel: "頁面",
  allMonths: "全部月份",
  compareLabel: "比對",
  legendLoginsPerDay: "每日登入數",
  legendRollingAvg: "7 天滾動平均",
  legendMean: (v) => `平均 ${v} / 天`,
  compareLegendItem: (label, logins) => `${label} · 共 ${logins} 筆登入`,

  byHourTitle: "依小時分佈",
  byHourDesc: (total, zone) => `全部 ${total} 筆事件依 ${zone} 時間歸入 24 個小時區間。`,
  bandNight: "00–06 凌晨",
  bandMorning: "06–12 上午",
  bandAfternoon: "12–18 下午",
  bandEvening: "18–24 晚上",
  workingHoursNote: (pct, zone, peakHour) => `${pct}% 的登入落在 ${zone} 08:00–18:00 之間,尖峰時段為 ${peakHour}。`,

  byMonthTitle: "依月份分佈",
  byMonthDesc: "已換算成每個觀察日的平均登入數。點選月份可切換上方頁面。",
  byMonthListItem: (logins, days) => `${logins} 筆登入 / ${days} 天`,

  byWeekdayTitle: "依星期分佈",
  byWeekdayDesc: "週末以灰色顯示。",

  footerSourcePrefix: "來源:",
  footerSourceSuffix: "同時出現在多份匯出檔的紀錄已去除重複。",
  footerTz: "時間戳記皆以 UTC 儲存;中國時間為 UTC+8 換算,可能使事件落到隔天。",

  uploadIdleText: "將登入紀錄 PDF 拖放到這裡,或點擊選擇檔案",
  uploadBusyText: "正在解析 PDF…",
  uploadHint: "時間戳記解析與彙整全程都在你的瀏覽器內完成,檔案不會上傳到任何地方。多個檔案會自動合併並去除重複。",
  uploadChooseError: "請選擇一個 PDF 檔案。",
  uploadGenericError: "無法讀取這個 PDF 檔案。",
  uploadParsedNotice: (fileName, count, pages) => `${fileName}:從 ${pages} 頁中解析出 ${count} 筆時間戳記。`,
  uploadWarningNotice: (fileName, warning) => `${fileName}:${warning}`,
  removeFileLabel: (fileName) => `移除 ${fileName}`,
  eventCount: (n) => `${n} 筆事件`,
  clearUploads: "清除上傳檔案,顯示範例資料",

  chartLoginsWord: "登入數",
  chartLoginsPerDay: "筆 / 天",
  chartTotalWord: "總計",
  chartDaysWord: "天",
  chartPeakWord: "尖峰",
  chartMeanShort: "平均",
  compareDayLabel: (day) => `第 ${day} 天`,
}

export const T: Record<Lang, Dict> = { en, zh }
