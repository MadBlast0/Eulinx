/**
 * TerminalView — the xterm.js surface (TerminalView-Part04 §Mounting).
 *
 * The ONLY component that touches xterm.js. It:
 *  - creates one `Terminal` + FitAddon + WebLinksAddon + SearchAddon on mount
 *  - binds the active PTY via `useTerminal` and registers the terminal as the
 *    output sink (batched flush from the binding)
 *  - resizes to the container via FitAddon + ResizeObserver, debounced
 *  - re-themes xterm when the app theme changes
 *  - disposes everything on unmount (no leaks: listeners, observers, timers)
 *
 * Output never flows through props or React state — it goes pty -> binding ->
 * terminal.write on a rAF. The component is memoized and accepts no per-chunk
 * props (TerminalView-Part01 §Component Tree).
 */

import { memo, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react"
import { Terminal as XTerm } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { SearchAddon } from "@xterm/addon-search"
import "@xterm/xterm/css/xterm.css"

import { token } from "@/ui/tokens"
import { typeScale } from "@/ui/typography"
import { useTheme } from "@/ui/themes/use-theme"
import { useContainerQuery } from "@/ui/responsive/container-query"
import { usePrefersReducedMotion } from "@/ui/responsive/use-breakpoint"
import { useAnnouncer } from "@/a11y/live-region"
import { FOCUS_RING_STYLE } from "@/a11y/focus-ring"
import { useTerminal } from "./use-terminal"
import { buildXtermTheme } from "./xterm-theme"
import { TerminalToolbar } from "./terminal-toolbar"
import { TerminalSearch } from "./terminal-search"

/** Debounce for PTY resize propagation (spec: ~100-150 ms). */
const RESIZE_DEBOUNCE_MS = 120

export interface TerminalViewProps {
  /** Stable id for the backing PTY. The view is keyed by this. */
  readonly ptyId: string
  /** Optional title shown in the header. */
  readonly title?: string
  /** When true, the view starts focused (grabs the terminal). */
  readonly autoFocus?: boolean
  /** Called when the user requests close (e.g. tab close affordance). */
  readonly onClose?: (ptyId: string) => void
  /** Forwarded ref to the underlying xterm Terminal (tests / parent control). */
  readonly terminalRef?: React.Ref<XTerm | null>
}

function TerminalViewBase({
  ptyId,
  title,
  autoFocus = false,
  onClose,
  terminalRef,
}: TerminalViewProps): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const searchRef = useRef<SearchAddon | null>(null)
  const resizeTimer = useRef<number | null>(null)

  const { active } = useTheme()
  const announcer = useAnnouncerSafe()
  const cq = useContainerQuery(hostRef)
  const reducedMotion = usePrefersReducedMotion()
  const { write, registerSink, resize, status, hasExited } = useTerminal(ptyId)

  const [searchOpen, setSearchOpen] = useState(false)
  const [deadBanner, setDeadBanner] = useState<string | null>(null)

  useImperativeHandle(terminalRef, () => termRef.current!, [])

  // --- Create xterm instance once. -------------------------------------------
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const t = typeScale.terminal
    const term = new XTerm({
      fontFamily: "var(--Eulinx-font-mono)",
      fontSize: t.sizePx,
      lineHeight: t.lineHeight,
      letterSpacing: t.letterSpacingEm,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 5000,
      theme: buildXtermTheme(active),
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

    // Register the terminal as the PTY output sink (batched flush inside binding).
    registerSink((data: string) => term.write(data))

    // Route keystrokes to the PTY; the binding gates on backpressure.
    const onDataDisposable = term.onData((d) => {
      write(d)
    })

    try {
      fit.fit()
    } catch {
      /* host not measured yet; ResizeObserver will fire */
    }

    if (autoFocus) term.focus()
    announcer?.announce("async_load", `Terminal ${title ?? ptyId} opened`)

    return () => {
      onDataDisposable.dispose()
      if (resizeTimer.current !== null) {
        if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(resizeTimer.current)
        else clearTimeout(resizeTimer.current)
        resizeTimer.current = null
      }
      term.dispose()
      termRef.current = null
      fitRef.current = null
      searchRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptyId])

  // --- Re-theme on app theme change. -----------------------------------------
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.theme = buildXtermTheme(active)
  }, [active])

  // --- Fit + resize to container, debounced PTY propagation. -----------------
  useEffect(() => {
    const term = termRef.current
    const fit = fitRef.current
    if (!term || !fit || !cq.ready) return

    try {
      fit.fit()
    } catch {
      return
    }
    const cols = term.cols
    const rows = term.rows
    if (resizeTimer.current !== null) {
      clearTimeout(resizeTimer.current)
    }
    resizeTimer.current = setTimeout(() => {
      resizeTimer.current = null
      resize(cols, rows)
    }, RESIZE_DEBOUNCE_MS) as unknown as number
  }, [cq.width, cq.height, cq.ready, resize])

  // --- Announce exit + show dead banner. -------------------------------------
  useEffect(() => {
    if (hasExited) {
      setDeadBanner("Process exited")
      announcer?.announce("error", `Terminal ${title ?? ptyId} exited`)
    }
  }, [hasExited, announcer, ptyId, title])

  // --- Toolbar / search actions. ---------------------------------------------
  const handleCopy = useCallback((): void => {
    const term = termRef.current
    if (!term) return
    const text = term.getSelection()
    if (text) void navigator.clipboard?.writeText(text)
  }, [])

  const handleClear = useCallback((): void => {
    const term = termRef.current
    if (term) term.clear()
  }, [])

  const handleZoom = useCallback(
    (delta: number): void => {
      const term = termRef.current
      if (!term) return
      const next = Math.max(8, Math.min(32, (term.options.fontSize ?? 13) + delta))
      term.options.fontSize = next
      fitRef.current?.fit()
      resize(term.cols, term.rows)
    },
    [resize],
  )

  const handleSearchOpen = useCallback((): void => setSearchOpen(true), [])
  const handleSearchClose = useCallback((): void => setSearchOpen(false), [])

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ background: token("--Eulinx-color-surface") }}
      data-terminal-pty={ptyId}
    >
      <TerminalToolbar
        title={title ?? ptyId}
        status={status}
        onCopy={handleCopy}
        onClear={handleClear}
        onSearch={handleSearchOpen}
        onZoomIn={() => handleZoom(1)}
        onZoomOut={() => handleZoom(-1)}
        onClose={onClose ? () => onClose(ptyId) : undefined}
      />

      <div
        ref={hostRef}
        tabIndex={0}
        role="region"
        aria-label={`Terminal ${title ?? ptyId}, ${status}`}
          className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          padding: token("--Eulinx-space-1"),
          outline: "none",
        }}
        onFocus={() => termRef.current?.focus()}
      />

      {searchOpen && (
        <TerminalSearch
          searchAddon={searchRef}
          onClose={handleSearchClose}
          reducedMotion={reducedMotion}
        />
      )}

      {deadBanner && (
        <div
          role="status"
          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 px-4 py-2 text-role-label"
          style={{
            background: token("--Eulinx-color-elevated"),
            borderTop: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
            color: token("--Eulinx-color-text-muted"),
          }}
        >
          <span>{deadBanner}</span>
          {onClose && (
            <button
              type="button"
              onClick={() => onClose(ptyId)}
              style={{ ...FOCUS_RING_STYLE }}
              className="rounded px-2 py-1"
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function useAnnouncerSafe(): ReturnType<typeof useAnnouncer> | null {
  try {
    return useAnnouncer()
  } catch {
    return null
  }
}

export const TerminalView = memo(TerminalViewBase)
export type { XTerm }
