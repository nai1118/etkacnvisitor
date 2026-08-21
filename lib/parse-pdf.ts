"use client"

// Client-side PDF -> visitor login timestamp extraction.
//
// ETKA-style access-log exports vary a bit in layout (different browsers /
// export tools produce slightly different text runs), so instead of relying
// on one exact table shape we scan the extracted text for several common
// timestamp patterns. All parsed timestamps are treated as UTC, matching the
// "UTC-Zeit" column in the source exports (same convention as the bundled
// sample dataset in lib/login-log.ts).

import type { LoginEvent } from "./login-log"

let workerConfigured = false

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist")
  if (!workerConfigured) {
    // Bundle the worker locally instead of pointing at a CDN: this keeps
    // parsing working offline and on networks that block third-party CDNs.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString()
    workerConfigured = true
  }
  return pdfjs
}

export type ParseResult = {
  fileName: string
  events: LoginEvent[]
  pageCount: number
  /** Number of raw timestamp matches before de-duplication within this file. */
  matched: number
  warnings: string[]
}

const GERMAN_MONTHS: Record<string, number> = {
  januar: 0,
  februar: 1,
  märz: 2,
  maerz: 2,
  april: 3,
  mai: 4,
  juni: 5,
  juli: 6,
  august: 7,
  september: 8,
  oktober: 9,
  november: 10,
  dezember: 11,
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

/** Try to parse a combined date+time match into an epoch-ms UTC timestamp. */
function toUtcMs(year: number, month1to12: number, day: number, h: number, m: number, s: number): number | null {
  if (month1to12 < 1 || month1to12 > 12 || day < 1 || day > 31 || h > 23 || m > 59 || s > 59) return null
  const iso = `${year}-${pad(month1to12)}-${pad(day)}T${pad(h)}:${pad(m)}:${pad(s)}Z`
  const ts = Date.parse(iso)
  return Number.isNaN(ts) ? null : ts
}

type Extractor = (text: string) => number[]

// 2026-07-01 01:38:29 / 2026-07-01T01:38:29 / 2026-07-01, 01:38:29
const isoLike: Extractor = (text) => {
  const out: number[] = []
  const re = /(\d{4})-(\d{2})-(\d{2})[T,\s]+(\d{2}):(\d{2}):(\d{2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const ts = toUtcMs(+m[1], +m[2], +m[3], +m[4], +m[5], +m[6])
    if (ts !== null) out.push(ts)
  }
  return out
}

// 01.07.2026 01:38:29 / 01.07.2026, 01:38:29 (German day.month.year)
const germanNumeric: Extractor = (text) => {
  const out: number[] = []
  const re = /(\d{2})\.(\d{2})\.(\d{4})[,\s]+(\d{2}):(\d{2}):(\d{2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const ts = toUtcMs(+m[3], +m[2], +m[1], +m[4], +m[5], +m[6])
    if (ts !== null) out.push(ts)
  }
  return out
}

// 1. Juli 2026, 01:38:29 (German long form)
const germanLong: Extractor = (text) => {
  const out: number[] = []
  const re = /(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})[,\s]+(\d{2}):(\d{2}):(\d{2})/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const month = GERMAN_MONTHS[m[2].toLowerCase()]
    if (month === undefined) continue
    const ts = toUtcMs(+m[3], month + 1, +m[1], +m[4], +m[5], +m[6])
    if (ts !== null) out.push(ts)
  }
  return out
}

// MM/DD/YYYY HH:MM:SS (US format)
const usSlash: Extractor = (text) => {
  const out: number[] = []
  const re = /(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2}):(\d{2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const ts = toUtcMs(+m[3], +m[1], +m[2], +m[4], +m[5], +m[6])
    if (ts !== null) out.push(ts)
  }
  return out
}

const COMBINED_EXTRACTORS: Extractor[] = [isoLike, germanNumeric, germanLong, usSlash]

/**
 * Fallback for exports where the date and time are not on the same text run
 * (e.g. a date header line followed by a list of times). Walks the text line
 * by line, remembers the most recent date it saw, and attaches it to any
 * bare HH:MM:SS times that follow.
 */
function dateHeaderFallback(text: string): number[] {
  const out: number[] = []
  const lines = text.split(/\r?\n/)

  let currentYmd: [number, number, number] | null = null

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/
  const germanDate = /^(\d{2})\.(\d{2})\.(\d{4})$/
  const germanLongDate = /^(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(\d{4})$/i
  const timeOnly = /^(\d{2}):(\d{2}):(\d{2})$/

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const iso = isoDate.exec(line)
    if (iso) {
      currentYmd = [+iso[1], +iso[2], +iso[3]]
      continue
    }
    const de = germanDate.exec(line)
    if (de) {
      currentYmd = [+de[3], +de[2], +de[1]]
      continue
    }
    const deLong = germanLongDate.exec(line)
    if (deLong) {
      const month = GERMAN_MONTHS[deLong[2].toLowerCase()]
      if (month !== undefined) currentYmd = [+deLong[3], month + 1, +deLong[1]]
      continue
    }
    const t = timeOnly.exec(line)
    if (t && currentYmd) {
      const ts = toUtcMs(currentYmd[0], currentYmd[1], currentYmd[2], +t[1], +t[2], +t[3])
      if (ts !== null) out.push(ts)
    }
  }
  return out
}

function extractTimestamps(text: string): number[] {
  const combined = COMBINED_EXTRACTORS.flatMap((fn) => fn(text))
  if (combined.length > 0) return combined
  return dateHeaderFallback(text)
}

export async function parsePdfFile(file: File): Promise<ParseResult> {
  const warnings: string[] = []
  const pdfjs = await loadPdfJs()

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise

  let fullText = ""
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    // Join items with newlines so line-based fallbacks work, and keep
    // whitespace between items on the same line so numbers don't merge.
    const pageText = content.items.map((item: any) => ("str" in item ? item.str : "")).join("\n")
    fullText += `${pageText}\n`
  }

  const matches = extractTimestamps(fullText)
  const unique = Array.from(new Set(matches)).sort((a, b) => a - b)

  if (unique.length === 0) {
    warnings.push(
      "No timestamps were recognized in this PDF. It may use a layout this parser doesn't know yet, or be a scanned/image PDF that needs OCR first.",
    )
  }

  return {
    fileName: file.name,
    events: unique.map((ts) => ({ ts })),
    pageCount: doc.numPages,
    matched: matches.length,
    warnings,
  }
}
