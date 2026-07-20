import { useCallback, useRef, useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, RotateCw, Globe, TriangleAlert, FileText } from "lucide-react"
import { fetchPage } from "@/tools/built-in/browser"
import type { BrowserFetchResult } from "@/tools/built-in/browser"

function formatUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return "about:blank"
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Strip tags + collapse whitespace to a rough readable-text extraction. */
function extractReadableText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
  const text = withoutScripts.replace(/<[^>]+>/g, " ")
  return text.replace(/\s+/g, " ").trim()
}

export interface BrowserViewProps {
  readonly url?: string
}

export function BrowserView({ url: initialUrl = "about:blank" }: BrowserViewProps) {
  const [inputValue, setInputValue] = useState(initialUrl)
  const [currentUrl, setCurrentUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [canGoBack] = useState(false)
  const [canGoForward] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<BrowserFetchResult | null>(null)

  const navigate = useCallback((url: string) => {
    const formatted = formatUrl(url)
    setInputValue(formatted)
    setCurrentUrl(formatted)
    setError(false)
    setLoading(true)
  }, [])

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      navigate(inputValue)
    },
    [inputValue, navigate],
  )

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl
    }
    setError(false)
    setLoading(true)
  }, [currentUrl])

  const handleGoBack = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.history.back()
    } catch {
      console.warn('eulinx: browser-view: cross-origin iframe navigation blocked')
      /* cross-origin */
    }
  }, [])

  const handleGoForward = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.history.forward()
    } catch {
      console.warn('eulinx: browser-view: cross-origin iframe navigation blocked')
      /* cross-origin */
    }
  }, [])

  const handleIframeLoad = useCallback(() => {
    setLoading(false)
    setError(false)
  }, [])

  const handleIframeError = useCallback(() => {
    setLoading(false)
    setError(true)
  }, [])

  const handleExtract = useCallback(async () => {
    const target = formatUrl(inputValue)
    setExtracting(true)
    setExtracted(null)
    try {
      const result = await fetchPage(target)
      setExtracted(result)
    } catch {
      setError(true)
    } finally {
      setExtracting(false)
    }
  }, [inputValue])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[color:var(--Eulinx-color-background)]">
      <div className="flex shrink-0 items-center gap-1 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-2 py-1.5">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={handleGoBack}
          aria-label="Go back"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] disabled:opacity-30"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          disabled={!canGoForward}
          onClick={handleGoForward}
          aria-label="Go forward"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] disabled:opacity-30"
        >
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--Eulinx-radius-sm)] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            strokeWidth={1.5}
          />
        </button>
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting || currentUrl === "about:blank"}
          aria-label="Extract readable text"
          className="flex h-7 items-center gap-1 rounded-[var(--Eulinx-radius-sm)] px-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] disabled:opacity-30"
        >
          <FileText className={`h-3.5 w-3.5 ${extracting ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Extract
        </button>
        <form onSubmit={handleSubmit} className="flex flex-1">
          <div className="relative flex w-full items-center">
            <Globe className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label="URL"
              className="h-7 w-full rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)] pl-8 pr-2 text-[12px] text-[color:var(--Eulinx-color-text)] outline-none placeholder:text-[color:var(--Eulinx-color-text-muted)] focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </form>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5">
            <div className="h-full w-full animate-pulse bg-[color:var(--Eulinx-color-accent)]" />
          </div>
        )}
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--Eulinx-color-surface)]">
              <TriangleAlert className="h-6 w-6 text-[color:var(--Eulinx-color-error)]" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">
              This page could not be loaded
            </p>
            <p className="max-w-sm text-xs text-[color:var(--Eulinx-color-text-muted)]">
              <span className="break-all font-mono">{currentUrl}</span> may be blocking
              embeds, or the address might be incorrect.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-1 flex h-8 items-center gap-1.5 rounded-[var(--Eulinx-radius-md)] bg-[color:var(--Eulinx-color-accent)] px-3 text-xs font-medium text-[color:var(--Eulinx-color-accent-foreground)] transition-opacity hover:opacity-90"
            >
              <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Try again
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full">
            {currentUrl === "about:blank" ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Globe className="h-8 w-8 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1} />
                  <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
                    Enter a URL to start browsing
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={currentUrl}
                title={currentUrl}
                className="h-full w-full"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            )}
          </div>
        )}
      </div>

      {extracted && (
        <div className="shrink-0 border-t border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
            Extracted text
            <span className="ml-auto font-normal opacity-70">
              {extracted.status} · {extracted.contentType || "n/a"}
            </span>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[color:var(--Eulinx-color-text-secondary)]">
            {extractReadableText(extracted.content) || "(no readable text found)"}
          </pre>
        </div>
      )}
    </div>
  )
}
