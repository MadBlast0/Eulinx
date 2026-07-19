import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Terminal as XTerm } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { SearchAddon } from "@xterm/addon-search"
import { useTheme } from "@/ui/tokens/theme-provider"
import { Terminal as TerminalIcon, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/utils/cn"
import { TerminalToolbar } from "./terminal-toolbar"
import { TerminalSearch } from "./terminal-search"
import { buildXtermTheme } from "./xterm-theme"
import { useTerminal, type TerminalLine, type TerminalLineKind, KIND_PREFIX } from "./use-terminal"

const KIND_COLOR: Record<TerminalLineKind, string> = {
  input: "var(--Eulinx-color-text)",
  output: "var(--Eulinx-color-text-secondary)",
  error: "var(--Eulinx-color-error)",
  success: "var(--Eulinx-color-success)",
}

export interface TerminalViewProps {
  readonly ptyId?: string
  readonly lines?: readonly TerminalLine[]
  readonly onPushLine?: (line: Omit<TerminalLine, "id">) => void
  readonly onClear?: () => void
  readonly onNew?: () => void
  readonly className?: string
}

function TerminalFallback({
  lines,
  onPushLine,
  onClear,
  onNew,
  className,
}: {
  lines: readonly TerminalLine[]
  onPushLine?: (line: Omit<TerminalLine, "id">) => void
  onClear?: () => void
  onNew?: () => void
  className?: string
}) {
  const [draft, setDraft] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = draft.trim()
    if (!value) return
    onPushLine?.({ kind: "input", text: value })
    setDraft("")
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)]",
        className,
      )}
    >
      <TerminalToolbar onClear={onClear} onNew={onNew} />
      <div
        className="flex-1 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed"
        role="log"
        aria-label="Terminal output"
      >
        {lines.length === 0 ? (
          <div className="flex items-center gap-2 text-[color:var(--Eulinx-color-text-muted)]">
            <TerminalIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>No output yet.</span>
          </div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="whitespace-pre-wrap break-words">
              <span style={{ color: KIND_COLOR[line.kind] }}>
                {KIND_PREFIX[line.kind] ? `${KIND_PREFIX[line.kind]} ` : ""}
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-[color:var(--Eulinx-color-border)] px-3 py-2"
      >
        <span
          className="font-mono text-xs"
          style={{ color: "var(--Eulinx-color-accent)" }}
          aria-hidden="true"
        >
          $
        </span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a command…"
          aria-label="Terminal command input"
          className="h-7 flex-1 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-background)] px-2 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </form>
    </div>
  )
}

function TerminalXterm({
  ptyId,
  onNew,
  className,
}: {
  ptyId: string
  onNew?: () => void
  className?: string
}) {
  const { active: theme } = useTheme()
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const searchRef = useRef<SearchAddon | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)

  const { pty, clear, exitCode } = useTerminal(ptyId)

  // Create terminal + addons once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const term = new XTerm({
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 2000,
      theme: buildXtermTheme(theme),
      allowProposedApi: true,
    })
    const fit = new FitAddon()
    const webLinks = new WebLinksAddon()
    const search = new SearchAddon()
    term.loadAddon(fit)
    term.loadAddon(webLinks)
    term.loadAddon(search)
    term.open(host)

    termRef.current = term
    fitRef.current = fit
    searchRef.current = search

    try {
      fit.fit()
    } catch {
      // Host not yet measurable; ResizeObserver will retry.
    }

    return () => {
      term.dispose()
      termRef.current = null
      fitRef.current = null
      searchRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-theme when the active theme changes.
  useEffect(() => {
    const term = termRef.current
    if (term) term.options.theme = buildXtermTheme(theme)
  }, [theme])

  // Bind PTY data flow.
  useEffect(() => {
    if (!pty) return
    const term = termRef.current
    if (!term) return

    const offData = pty.onData((chunk) => {
      term.write(chunk)
    })

    const dataSub = term.onData((data) => {
      pty.write(data)
    })

    const offExit = pty.onExit(() => {
      term.write("\r\n\x1b[2m[session terminated]\x1b[0m\r\n")
    })

    try {
      fitRef.current?.fit()
    } catch {
      // ignore
    }

    return () => {
      offData()
      dataSub.dispose()
      offExit()
    }
  }, [pty])

  // Debounced resize via ResizeObserver (~120ms).
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let raf = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          try {
            fitRef.current?.fit()
          } catch {
            // ignore transient measure failures
          }
        })
      }, 120)
    })
    ro.observe(host)
    return () => {
      ro.disconnect()
      if (timer) clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [])

  const handleCopy = useCallback(() => {
    const term = termRef.current
    if (!term) return
    const sel = term.getSelection()
    if (sel) void navigator.clipboard?.writeText(sel)
  }, [])

  const handleClear = useCallback(() => {
    termRef.current?.clear()
    clear()
  }, [clear])

  const handleSearch = useCallback((query: string, dir: "next" | "prev"): boolean => {
    const search = searchRef.current
    if (!search) return false
    if (dir === "prev") {
      return search.findPrevious(query, {
        caseSensitive: false,
        incremental: false,
      })
    }
    return search.findNext(query, {
      caseSensitive: false,
      incremental: false,
    })
  }, [])

  const toggleSearch = useCallback(() => setSearchOpen((v) => !v), [])

  const exitBadge = useMemo(() => {
    if (exitCode === null) return null
    if (exitCode === 0)
      return (
        <span className="flex items-center gap-1 text-[color:var(--Eulinx-color-success)]">
          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> exited 0
        </span>
      )
    return (
      <span className="flex items-center gap-1 text-[color:var(--Eulinx-color-error)]">
        <XCircle className="h-3 w-3" strokeWidth={1.5} /> exited {exitCode}
      </span>
    )
  }, [exitCode])

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-sunken)]",
        className,
      )}
    >
      <TerminalToolbar
        onCopy={handleCopy}
        onClear={handleClear}
        onNew={onNew}
        onToggleSearch={toggleSearch}
        searchOpen={searchOpen}
      />
      {searchOpen && (
        <TerminalSearch
          onSearch={handleSearch}
          onClose={() => setSearchOpen(false)}
        />
      )}
      <div
        ref={hostRef}
        className="min-h-[120px] flex-1 px-2 py-1 font-mono"
        aria-label="Live terminal"
        role="log"
      />
      {exitBadge && <div className="border-t border-[color:var(--Eulinx-color-border)] px-3 py-1 font-mono text-[11px]">{exitBadge}</div>}
    </div>
  )
}

export const TerminalView = memo(function TerminalView({
  ptyId,
  lines = [],
  onPushLine,
  onClear,
  onNew,
  className,
}: TerminalViewProps) {
  if (!ptyId) {
    return (
      <TerminalFallback
        lines={lines}
        onPushLine={onPushLine}
        onClear={onClear}
        onNew={onNew}
        className={className}
      />
    )
  }
  return <TerminalXterm ptyId={ptyId} onNew={onNew} className={className} />
})

export default TerminalView
