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
  zh: { utc: "UTC", cn: "中国 (UTC+8)" },
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

  compareSourcesTitle: string
  compareSourcesDesc: string
  compareSourcesPrompt: string
  nonChinaSourceNote: string

  byHourTitle: string
  byHourDesc: (total: number, zone: string) => string
  byHourDayLabel: string
  allDays: string
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
  uploadDuplicateNotice: (fileName: string) => string
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
  title: "ETKA News China Visitor Access Time Analysis",
  intro: ({ total, usingSample, pageLabel, range }) =>
    `${total} visits ${usingSample ? "from the bundled sample export" : "parsed from your uploaded PDF(s)"}` +
    `${pageLabel ? ` for ${pageLabel}` : ""}, aggregated by hour of day, by weekday and by month. Observation window ${range}.`,
  bucketIn: "Bucket in",
  langLabel: "Language",

  dataSourceTitle: "Data Source",
  dataSourceDescSample:
    "Data is based on ETKA.COM.CN News visitor access records. Upload the monthly timestamp PDF to display the corresponding month's data analysis.",
  dataSourceDescCustom: "Charts below reflect the timestamps parsed from your uploaded PDF(s).",
  sampleDataSuffix: "(sample data)",

  statTotalLogins: "Total visits",
  statTotalLoginsNote: (activeDays) => `${activeDays} active days`,
  statLoginsPerDay: "Visits / day",
  statLoginsPerDayNote: (quietDays) => `${quietDays} days with none`,
  statPeakHour: "Peak hour",
  statPeakHourNote: (logins, pct) => `${logins} visits · ${pct}%`,
  statBusiestDay: "Busiest day",
  statBusiestDayNote: (logins, weekday) => `${logins} visits · ${weekday}`,
  statBusiestDayNoData: "no data",

  visitorTrendTitle: "Visitor trend",
  visitorTrendDescNormal:
    "Daily visits with a 7-day rolling average. Days without a single visit are kept as zeros so the gaps stay visible.",
  visitorTrendDescCompare: (labels) => `Comparing ${labels}, lined up by day of month.`,
  pageLabel: "Page",
  allMonths: "All months",
  compareLabel: "Compare",
  legendLoginsPerDay: "Visits per day",
  legendRollingAvg: "7-day rolling average",
  legendMean: (v) => `mean ${v} / day`,
  compareLegendItem: (label, logins) => `${label} · ${logins} visits`,

  compareSourcesTitle: "Compare sources",
  compareSourcesDesc: "Overlaying the daily trend of each uploaded file, lined up by calendar date.",
  compareSourcesPrompt: "Select two or more files above to overlay their trends.",
  nonChinaSourceNote:
    "Only China (zh-cn) files are included in the charts above. Other files you've uploaded appear only in Compare sources below.",

  byHourTitle: "By hour of day",
  byHourDesc: (total, zone) => `All ${total} events folded into 24 buckets, ${zone} wall clock.`,
  byHourDayLabel: "Date",
  allDays: "All days",
  bandNight: "00–06 night",
  bandMorning: "06–12 morning",
  bandAfternoon: "12–18 afternoon",
  bandEvening: "18–24 evening",
  workingHoursNote: (pct, zone, peakHour) =>
    `${pct}% of all visits land inside 08:00–18:00 ${zone}, with the single busiest hour at ${peakHour}.`,

  byMonthTitle: "By month",
  byMonthDesc: "Normalised to visits per observed day. Click a month to open its page above.",
  byMonthListItem: (logins, days) => `${logins} visits / ${days} d`,

  byWeekdayTitle: "By weekday",
  byWeekdayDesc: "Weekend buckets shown in grey.",

  footerSourcePrefix: "Source:",
  footerSourceSuffix: "Rows appearing in multiple exports were de-duplicated.",
  footerTz: "Timestamps are stored in UTC; China time is derived as UTC+8, which can shift an event into the next calendar day.",

  uploadIdleText: "Drop a visit-log PDF here, or click to choose",
  uploadBusyText: "Parsing PDF…",
  uploadHint:
    "Timestamps are extracted and aggregated entirely in your browser — the file isn't uploaded anywhere. Multiple files are merged and de-duplicated.",
  uploadChooseError: "Please choose a PDF file.",
  uploadGenericError: "Could not read that PDF.",
  uploadParsedNotice: (fileName, count, pages) =>
    `${fileName}: parsed ${count} timestamp${count === 1 ? "" : "s"} from ${pages} page${pages === 1 ? "" : "s"}.`,
  uploadWarningNotice: (fileName, warning) => `${fileName}: ${warning}`,
  uploadDuplicateNotice: (fileName) => `Skipped "${fileName}" — its data matches a file you already uploaded.`,
  removeFileLabel: (fileName) => `Remove ${fileName}`,
  eventCount: (n) => `${n} event${n === 1 ? "" : "s"}`,
  clearUploads: "Clear uploads, show sample data",

  chartLoginsWord: "visits",
  chartLoginsPerDay: "visits / day",
  chartTotalWord: "total",
  chartDaysWord: "days",
  chartPeakWord: "peak",
  chartMeanShort: "mean",
  compareDayLabel: (day) => `Day ${day}`,
}

const zh: Dict = {
  breadcrumb: "etka.com.cn / etkaportalcn / zh-cn / login / news",
  title: "ETKA News China 访客访问时间分析",
  intro: ({ total, usingSample, pageLabel }) =>
    `共包含 ${total} 笔访客访问记录${pageLabel ? `(${pageLabel})` : ""},数据来自${usingSample ? "目前内建的范例汇出档" : "你上传的 PDF"},并依小时、星期与月份进行汇整分析。`,
  bucketIn: "时区",
  langLabel: "语言",

  dataSourceTitle: "数据来源",
  dataSourceDescSample: "数据来自 ETKA.COM.CN News 访客访问记录。上传每月时间戳记 PDF,即可呈现对应月份的数据分析。",
  dataSourceDescCustom: "下方图表已改为显示你上传的 PDF 解析出的时间戳记。",
  sampleDataSuffix: "(范例资料)",

  statTotalLogins: "访问总数",
  statTotalLoginsNote: (activeDays) => `${activeDays} 个有活动的天数`,
  statLoginsPerDay: "平均每日访问",
  statLoginsPerDayNote: (quietDays) => `${quietDays} 天没有访问`,
  statPeakHour: "尖峰时段",
  statPeakHourNote: (logins, pct) => `${logins} 笔访问 · ${pct}%`,
  statBusiestDay: "最忙碌的一天",
  statBusiestDayNote: (logins, weekday) => `${logins} 笔访问 · 周${weekday}`,
  statBusiestDayNoData: "无资料",

  visitorTrendTitle: "访客趋势",
  visitorTrendDescNormal: "每日访问数与 7 天滚动平均。没有访问的日子以 0 呈现,让断点清楚可见。",
  visitorTrendDescCompare: (labels) => `正在比对 ${labels},依"当月第几天"对齐。`,
  pageLabel: "页面",
  allMonths: "全部月份",
  compareLabel: "比对",
  legendLoginsPerDay: "每日访问数",
  legendRollingAvg: "7 天滚动平均",
  legendMean: (v) => `平均 ${v} / 天`,
  compareLegendItem: (label, logins) => `${label} · 共 ${logins} 笔访问`,

  compareSourcesTitle: "比较来源",
  compareSourcesDesc: "依日历日期对齐,叠加显示每个已上传文件的每日趋势。",
  compareSourcesPrompt: "请在上方至少选择两个文件,以叠加显示趋势。",
  nonChinaSourceNote: "上方图表仅采用中国(zh-cn)版本的资料;你上传的其他语言版本档案只会显示在下方的「比较来源」区块。",

  byHourTitle: "依小时分布",
  byHourDesc: (total, zone) => `全部 ${total} 笔事件依 ${zone} 时间归入 24 个小时区间。`,
  byHourDayLabel: "日期",
  allDays: "全部日期",
  bandNight: "00–06 凌晨",
  bandMorning: "06–12 上午",
  bandAfternoon: "12–18 下午",
  bandEvening: "18–24 晚上",
  workingHoursNote: (pct, zone, peakHour) => `${pct}% 的访问落在 ${zone} 08:00–18:00 之间,尖峰时段为 ${peakHour}。`,

  byMonthTitle: "依月份分布",
  byMonthDesc: "已换算成每个观察日的平均访问数。点选月份可切换上方页面。",
  byMonthListItem: (logins, days) => `${logins} 笔访问 / ${days} 天`,

  byWeekdayTitle: "依星期分布",
  byWeekdayDesc: "周末以灰色显示。",

  footerSourcePrefix: "来源:",
  footerSourceSuffix: "同时出现在多份汇出档的记录已去除重复。",
  footerTz: "时间戳记皆以 UTC 储存;中国时间为 UTC+8 换算,可能使事件落到隔天。",

  uploadIdleText: "将访问记录 PDF 拖放到这里,或点击选择档案",
  uploadBusyText: "正在解析 PDF…",
  uploadHint: "时间戳记解析与汇整全程都在你的浏览器内完成,档案不会上传到任何地方。多个档案会自动合并并去除重复。",
  uploadChooseError: "请选择一个 PDF 档案。",
  uploadGenericError: "无法读取这个 PDF 档案。",
  uploadParsedNotice: (fileName, count, pages) => `${fileName}:从 ${pages} 页中解析出 ${count} 笔时间戳记。`,
  uploadWarningNotice: (fileName, warning) => `${fileName}:${warning}`,
  uploadDuplicateNotice: (fileName) => `已跳过「${fileName}」——其数据与你已上传的文件相同。`,
  removeFileLabel: (fileName) => `移除 ${fileName}`,
  eventCount: (n) => `${n} 笔事件`,
  clearUploads: "清除上传档案,显示范例资料",

  chartLoginsWord: "访问数",
  chartLoginsPerDay: "笔 / 天",
  chartTotalWord: "总计",
  chartDaysWord: "天",
  chartPeakWord: "尖峰",
  chartMeanShort: "平均",
  compareDayLabel: (day) => `第 ${day} 天`,
}

export const T: Record<Lang, Dict> = { en, zh }
