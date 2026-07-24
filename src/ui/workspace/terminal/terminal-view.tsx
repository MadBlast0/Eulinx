import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Terminal as XTerm } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { SearchAddon } from "@xterm/addon-search"
import { useTheme } from "@/ui/tokens/theme-provider"
import { CheckCircle2, XCircle, MoreHorizontal, Loader2, WifiOff, TerminalSquare } from "lucide-react"
import { cn } from "@/utils/cn"
import { TerminalSearch } from "./terminal-search"
import type { PtyConnectionState } from "./use-terminal"
import type { Pty } from "./pty"
import { useTerminal } from "./use-terminal"
import { buildXtermTheme } from "./xterm-theme"

export interface TerminalViewProps {
  readonly ptyId?: string
  readonly onNew?: () => void
  readonly shell?: string
  readonly className?: string
  readonly autoFocus?: boolean
}

const STATUS_CONFIG: Record<PtyConnectionState, { icon: React.ReactNode; label: string; color: string }> = {
  connecting: {
    icon: <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />,
    label: "Starting…",
    color: "var(--Eulinx-color-warning)",
  },
  connected: {
    icon: <TerminalSquare className="h-3 w-3" strokeWidth={2} />,
    label: "Connected",
    color: "var(--Eulinx-color-success)",
  },
  disconnected: {
    icon: <WifiOff className="h-3 w-3" strokeWidth={2} />,
    label: "Disconnected",
    color: "var(--Eulinx-color-error)",
  },
  error: {
    icon: <XCircle className="h-3 w-3" strokeWidth={1.5} />,
    label: "Error",
    color: "var(--Eulinx-color-error)",
  },
}

const MENU_ITEMS = [
  { key: "copy", label: "Copy output", icon: <span className="text-[11px]">⎘</span> },
  { key: "clear", label: "Clear terminal", icon: <span className="text-[11px]">⎚</span> },
  { key: "search", label: "Search output", icon: <span className="text-[11px]">⌕</span> },
  { key: "new", label: "New terminal", icon: <span className="text-[11px]">⊞</span> },
] as const

function TerminalXterm({
  ptyId,
  onNew,
  shell,
  className,
  autoFocus = true,
}: {
  ptyId: string
  onNew?: () => void
  shell?: string
  className?: string
  autoFocus?: boolean
}) {
  const { active: theme } = useTheme()
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const searchRef = useRef<SearchAddon | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasReceivedDataRef = useRef(false)

  const { pty, clear: ptyClear, exitCode, connectionState } = useTerminal(ptyId, shell)

  const fitTerm = useCallback((term?: XTerm | null, _fit?: FitAddon | null, host?: HTMLDivElement | null, ptyInstance?: Pty | null): boolean => {
    const t = term ?? termRef.current
    const h = host ?? hostRef.current
    if (!t || !h) return false
    try {
      const dims = (t as any)._core?._renderService?.dimensions
      if (!dims || dims.css.cell.width === 0 || dims.css.cell.height === 0) return false
      const style = getComputedStyle(h)
      const padX = parseInt(style.paddingLeft || "0") + parseInt(style.paddingRight || "0")
      const padY = parseInt(style.paddingTop || "0") + parseInt(style.paddingBottom || "0")
      const cols = Math.max(2, Math.floor((h.clientWidth - padX) / dims.css.cell.width))
      const rows = Math.max(1, Math.floor((h.clientHeight - padY) / dims.css.cell.height))
      if (t.rows !== rows || t.cols !== cols) {
        t.resize(cols, rows)
      }
      if (ptyInstance?.resize) {
        ptyInstance.resize(cols, rows)
      }
      return true
    } catch { return false }
  }, [])

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

    let retries = 0
    const fitLoop = () => {
      if (fitTerm(term, fit, host, pty)) {
        if (autoFocus) term.focus()
      } else if (retries < 60) {
        retries++
        requestAnimationFrame(fitLoop)
      }
    }
    const raf = requestAnimationFrame(fitLoop)

    return () => {
      cancelAnimationFrame(raf)
      term.dispose()
      termRef.current = null
      fitRef.current = null
      searchRef.current = null
    }
  }, [])

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
      if (!hasReceivedDataRef.current) {
        hasReceivedDataRef.current = true
      }
    })

    const dataSub = term.onData((data) => {
      pty.write(data)
    })

    const offExit = pty.onExit(() => {
      term.write("\r\n\x1b[2m[session terminated]\x1b[0m\r\n")
    })

    fitTerm(term, fitRef.current, hostRef.current, pty)
    if (autoFocus) term.focus()

    return () => {
      offData()
      dataSub.dispose()
      offExit()
    }
  }, [pty])

  // Resize PTY when container size changes.
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
            fitTerm(termRef.current, fitRef.current, hostRef.current, pty)
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
  }, [pty])

  // Focus and re-fit when terminal becomes connected
  useEffect(() => {
    if (connectionState !== "connected") return
    const term = termRef.current
    if (!term) return
    try {
      fitTerm(termRef.current, fitRef.current, hostRef.current, pty)
      term.focus()
    } catch {}
  }, [connectionState, pty])

  // Click anywhere in terminal area → focus
  const handleWrapperClick = useCallback(() => {
    const term = termRef.current
    if (term) {
      term.focus()
    }
  }, [])

  const handleCopy = useCallback(() => {
    const term = termRef.current
    if (!term) return
    const sel = term.getSelection()
    if (sel) void navigator.clipboard?.writeText(sel)
    setMenuOpen(false)
  }, [])

  const handleClear = useCallback(() => {
    termRef.current?.clear()
    ptyClear()
    hasReceivedDataRef.current = false
    setMenuOpen(false)
  }, [ptyClear])

  const handleSearchFn = useCallback((query: string, dir: "next" | "prev"): boolean => {
    const search = searchRef.current
    if (!search) return false
    if (dir === "prev") {
      return search.findPrevious(query, { caseSensitive: false, incremental: false })
    }
    return search.findNext(query, { caseSensitive: false, incremental: false })
  }, [])

  const toggleSearch = useCallback(() => {
    setSearchOpen((v) => !v)
    setMenuOpen(false)
  }, [])

  const handleMenuAction = useCallback((key: string) => {
    switch (key) {
      case "copy": handleCopy(); break
      case "clear": handleClear(); break
      case "search": toggleSearch(); break
      case "new": onNew?.(); setMenuOpen(false); break
    }
  }, [handleCopy, handleClear, toggleSearch, onNew])

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

  const status = STATUS_CONFIG[connectionState]

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]",
        className,
      )}
      onClick={handleWrapperClick}
      onContextMenu={(e) => { e.stopPropagation(); e.preventDefault() }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-2 py-0.5"
        role="toolbar"
        aria-label="Terminal controls"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: status?.color }}
            aria-live="polite"
          >
            {status?.icon}
            <span className="truncate">{status?.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Overflow menu */}
          <div className="relative">
            <button
              type="button"
              aria-label="More actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
              className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
            >
              <MoreHorizontal className="h-3 w-3" strokeWidth={1.5} />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 top-full z-20 mt-1 min-w-[140px] overflow-hidden rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] shadow-[var(--Eulinx-elev-lg)]"
                  role="menu"
                >
                  {MENU_ITEMS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => handleMenuAction(item.key)}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-[12px] text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[color:var(--Eulinx-color-text-muted)]">
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      {searchOpen && (
        <TerminalSearch
          onSearch={handleSearchFn}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* ── Terminal / Loading / Disconnected ── */}
      <div
        ref={hostRef}
        className="min-h-[120px] flex-1 relative"
        aria-label="Live terminal"
        role="terminal"
      >
        {connectionState === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--Eulinx-color-surface-sunken)] z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-3 text-[color:var(--Eulinx-color-text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
              <span className="text-sm">Starting shell…</span>
            </div>
          </div>
        )}

        {(connectionState === "disconnected" || connectionState === "error") && (
          <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--Eulinx-color-surface-sunken)] z-10">
            <div className="flex flex-col items-center gap-3 text-center px-4 text-[color:var(--Eulinx-color-text-muted)]">
              <WifiOff className="h-8 w-8" strokeWidth={1.5} />
              <span className="text-sm">Terminal disconnected</span>
              <button
                type="button"
                onClick={() => { pty?.kill(); }}
                className="px-3 py-1 text-xs rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text)] hover:bg-[color:var(--Eulinx-color-hover)]"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {exitBadge && (
        <div className="border-t border-[color:var(--Eulinx-color-border)] px-3 py-1.5 font-mono text-[11px]">
          {exitBadge}
        </div>
      )}
    </div>
  )
}

export const TerminalView = memo(function TerminalView({
  ptyId,
  onNew,
  shell,
  className,
  autoFocus = true,
}: TerminalViewProps) {
  if (!ptyId) return null
  return <TerminalXterm ptyId={ptyId} onNew={onNew} shell={shell} className={className} autoFocus={autoFocus ?? true} />
})

export default TerminalView