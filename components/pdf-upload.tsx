"use client"

import { useCallback, useRef, useState } from "react"
import { FileText, Loader2, RotateCcw, Upload, X } from "lucide-react"

import { parsePdfFile } from "@/lib/parse-pdf"
import type { LoginEvent } from "@/lib/login-log"
import { cn } from "@/lib/utils"
import { T, type Lang } from "@/lib/i18n"

export type UploadedSource = {
  id: string
  fileName: string
  events: LoginEvent[]
  pageCount: number
  warnings: string[]
}

/** Order-independent content fingerprint, used to catch the same file (or an
 *  identical re-export under a different name) being uploaded more than
 *  once — a plain filename check would miss a rename, and would also wrongly
 *  flag two different files that just happen to share a name. */
function signatureOf(events: LoginEvent[]): string {
  return events
    .map((e) => e.ts)
    .sort((a, b) => a - b)
    .join(",")
}

export function PdfUpload({
  sources,
  onAdd,
  onRemove,
  onReset,
  usingSample,
  lang = "en",
}: {
  sources: UploadedSource[]
  onAdd: (source: UploadedSource) => void
  onRemove: (id: string) => void
  onReset: () => void
  usingSample: boolean
  lang?: Lang
}) {
  const t = T[lang]
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      )
      if (files.length === 0) {
        setError(t.uploadChooseError)
        return
      }
      setBusy(true)
      setError(null)
      setNotice(null)
      // Signatures already on the board, plus ones added earlier in *this*
      // batch — `sources` won't include those yet since onAdd's state update
      // hasn't flushed back into this closure mid-loop.
      const existingSignatures = sources.map((s) => signatureOf(s.events))
      const addedSignatures: string[] = []
      try {
        for (const file of files) {
          const result = await parsePdfFile(file)
          const signature = signatureOf(result.events)
          const isDuplicate =
            result.events.length > 0 &&
            (existingSignatures.includes(signature) || addedSignatures.includes(signature))
          if (isDuplicate) {
            setNotice(t.uploadDuplicateNotice(result.fileName))
            continue
          }
          addedSignatures.push(signature)
          onAdd({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            fileName: result.fileName,
            events: result.events,
            pageCount: result.pageCount,
            warnings: result.warnings,
          })
          setNotice(
            result.warnings.length > 0
              ? t.uploadWarningNotice(result.fileName, result.warnings[0])
              : t.uploadParsedNotice(result.fileName, result.events.length, result.pageCount),
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.uploadGenericError)
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ""
      }
    },
    [onAdd, t, sources],
  )

  return (
    <div className="grid gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files)
          }}
        />
        {busy ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <Upload className="size-5 text-muted-foreground" aria-hidden />
        )}
        <p className="text-sm font-medium">{busy ? t.uploadBusyText : t.uploadIdleText}</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{t.uploadHint}</p>
      </div>

      {error && (
        <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="rounded-sm border border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-muted-foreground">
          {notice}
        </p>
      )}

      {sources.length > 0 && (
        <ul className="grid gap-2">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate font-mono text-xs">{s.fileName}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {t.eventCount(s.events.length)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  aria-label={t.removeFileLabel(s.fileName)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!usingSample && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3" aria-hidden />
          {t.clearUploads}
        </button>
      )}
    </div>
  )
}
