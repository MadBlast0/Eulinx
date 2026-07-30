import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Terminal as XTerm } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { SearchAddon } from "@xterm/addon-search"
import { WebglAddon } from "@xterm/addon-webgl"
import { ImageAddon } from "@xterm/addon-image"
import { UnicodeGraphemesAddon } from "@xterm/addon-unicode-graphemes"
import { Unicode11Addon } from "@xterm/addon-unicode11"
import { useTheme } from "@/ui/tokens/theme-provider"
import { CheckCircle2, XCircle, MoreHorizontal, Loader2, WifiOff, TerminalSquare } from "lucide-react"
import { cn } from "@/utils/cn"
import { TerminalSearch } from "./terminal-search"
import type { PtyConnectionState } from "./use-terminal"
import type { Pty } from "./pty"
import { useTerminal } from "./use-terminal"
import { buildXtermTheme } from "./xterm-theme"
import { getConfig } from "@/core/config"
import { useToastContext } from "@/providers/ToastProvider"

export interface TerminalViewProps {
  readonly ptyId?: string
  readonly onNew?: () => void
  readonly shell?: string
  readonly className?: string
  readonly autoFocus?: boolean
  readonly initialBuffer?: string
  readonly onBufferChange?: (buffer: string) => void
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
  { key: "export", label: "Export to file", icon: <span className="text-[11px]">⇩</span> },
  { key: "clear", label: "Clear terminal", icon: <span className="text-[11px]">⎚</span> },
  { key: "search", label: "Search output", icon: <span className="text-[11px]">⌕</span> },
  { key: "new", label: "New terminal", icon: <span className="text-[11px]">⊞</span> },
] as const

function fitPty(term: XTerm | null, fit: FitAddon | null, ptyInstance: Pty | null): boolean {
  if (!term || !fit) return false
  try {
    fit.fit()
    if (ptyInstance?.resize) {
      ptyInstance.resize(term.cols, term.rows)
    }
    return true
  } catch { return false }
}

function TerminalXterm({
  ptyId,
  onNew,
  shell,
  className,
  autoFocus = true,
  initialBuffer,
  onBufferChange,
}: {
  ptyId: string
  onNew?: () => void
  shell?: string
  className?: string
  autoFocus?: boolean
  initialBuffer?: string
  onBufferChange?: (buffer: string) => void
}) {
  const { active: theme } = useTheme()
  const { toast } = useToastContext()
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const searchRef = useRef<SearchAddon | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const bufferSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pasteWarning, setPasteWarning] = useState<string | null>(null)
  const [terminalTitle, setTerminalTitle] = useState<string | null>(null)
  const [lastSearchQuery, setLastSearchQuery] = useState<string>("")
  const hasReceivedDataRef = useRef(false)

  const { pty, clear: ptyClear, exitCode, connectionState } = useTerminal(ptyId, shell)

  // Create terminal + addons once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const config = getConfig()
    const scrollback = config.ui.terminalScrollback

    const term = new XTerm({
      allowProposedApi: true,
      fontFamily:
        '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: 13,
      lineHeight: 1.55,
      fontWeight: 400,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback,
      theme: buildXtermTheme(theme),
    })
    const fit = new FitAddon()
    const webLinks = new WebLinksAddon()
    const search = new SearchAddon()
    term.loadAddon(fit)
    term.loadAddon(webLinks)
    term.loadAddon(search)

    let webgl: WebglAddon | null = null
    try {
      webgl = new WebglAddon()
      term.loadAddon(webgl)
      webgl.onContextLoss(() => {
        console.warn('[Terminal] WebGL context lost, falling back to canvas renderer')
        // Dispose WebGL addon and let xterm fall back to canvas
        webgl?.dispose()
        webgl = null
        // Force a re-render by resizing
        try {
          fitPty(term, fit, pty)
        } catch (err) {
          console.error('[Terminal] Failed to recover from WebGL context loss:', err)
        }
      })
    } catch (err) {
      console.warn('[Terminal] WebGL not available, using canvas renderer:', err)
    }
    
    const image = new ImageAddon({ sixelSupport: true, iipSupport: true })
    term.loadAddon(image)
    term.loadAddon(new Unicode11Addon())
    term.loadAddon(new UnicodeGraphemesAddon())
    term.unicode.activeVersion = "11"

    term.open(host)

    const viewport = host.querySelector(".xterm-viewport") as HTMLElement | null
    if (viewport) {
      viewport.style.backgroundColor = "transparent"
    }

    termRef.current = term
    fitRef.current = fit
    searchRef.current = search

    // Listen for title changes from OSC sequences
    const titleDisposable = term.onTitleChange((title) => {
      console.log('[Terminal] Title changed:', title)
      setTerminalTitle(title)
    })

    // Listen for bell character (\x07)
    const bellDisposable = term.onBell(() => {
      console.log('[Terminal] Bell received')
      toast({
        title: "Terminal Bell",
        description: `Activity in terminal ${ptyId}`,
        type: "info",
        duration: 3000,
      })
    })

    const raf = requestAnimationFrame(() => {
      fitPty(term, fit, pty)
      if (autoFocus) term.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      titleDisposable.dispose()
      bellDisposable.dispose()
      if (webgl) {
        try {
          webgl.dispose()
        } catch (err) {
          console.warn('[Terminal] Error disposing WebGL addon:', err)
        }
      }
      term.dispose()
      termRef.current = null
      fitRef.current = null
      searchRef.current = null
    }
  }, [pty, autoFocus, theme, toast, ptyId])

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
      // Debounced buffer save
      if (onBufferChange) {
        if (bufferSaveTimer.current) clearTimeout(bufferSaveTimer.current)
        bufferSaveTimer.current = setTimeout(() => {
          try {
            const buffer = term.buffer.active
            const lines: string[] = []
            for (let i = 0; i < buffer.length; i++) {
              const line = buffer.getLine(i)
              if (line) {
                lines.push(line.translateToString(true))
              }
            }
            onBufferChange(lines.join('\n'))
          } catch (err) {
            console.warn('[Terminal] Failed to save buffer:', err)
          }
        }, 2000)
      }
    })

    const dataSub = term.onData((data) => {
      pty.write(data)
    })

    // Handle paste events with multi-line warning
    const handlePaste = (event: { data: string }) => {
      const text = event.data
      const lines = text.split('\n')
      
      // Warn if pasting more than 1 line
      if (lines.length > 1) {
        setPasteWarning(text)
        return // Don't paste yet, wait for confirmation
      }
      
      // Single line paste - proceed normally
      pty.write(text)
    }

    term.onData((_data) => {
      // This handles keyboard input, actual paste is handled by onPaste addon
    })

    // Attach paste handler
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      // Handle Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && e.type === 'keydown') {
        e.preventDefault()
        void navigator.clipboard.readText().then((text) => {
          handlePaste({ data: text })
        }).catch((err) => {
          console.warn('[Terminal] Failed to read clipboard:', err)
        })
        return false
      }
      return true
    })

    const offExit = pty.onExit(() => {
      term.write("\r\n\x1b[2m[session terminated]\x1b[0m\r\n")
    })

    // Restore initial buffer if provided
    if (initialBuffer && initialBuffer.trim()) {
      console.log('[Terminal] Restoring buffer content')
      term.write(initialBuffer)
    }

    fitPty(term, fitRef.current, pty)
    if (autoFocus) term.focus()

    return () => {
      offData()
      dataSub.dispose()
      offExit()
      if (bufferSaveTimer.current) clearTimeout(bufferSaveTimer.current)
    }
  }, [pty, autoFocus, initialBuffer, onBufferChange])

  // Resize PTY when container size changes.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    
    const ro = new ResizeObserver(() => {
      // Debounce resize operations
      if (resizeTimer) clearTimeout(resizeTimer)
      
      resizeTimer = setTimeout(() => {
        try {
          fitPty(termRef.current, fitRef.current, pty)
        } catch (err) {
          // Ignore transient measure failures during resize
          console.debug('[Terminal] Resize measurement failed (transient):', err)
        }
      }, 150) // Increased debounce to 150ms for better performance
    })
    
    ro.observe(host)
    
    return () => {
      ro.disconnect()
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [pty])

  // Focus and re-fit when terminal becomes connected
  useEffect(() => {
    if (connectionState !== "connected") return
    const term = termRef.current
    if (!term) return
    try {
      fitPty(termRef.current, fitRef.current, pty)
      term.focus()
    } catch { void 0 }
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

  const handleExport = useCallback(() => {
    const term = termRef.current
    if (!term) return
    
    try {
      // Extract all buffer content
      const buffer = term.buffer.active
      const lines: string[] = []
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i)
        if (line) {
          lines.push(line.translateToString(true))
        }
      }
      
      const content = lines.join('\n')
      
      // Create download link
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `terminal-${ptyId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('[Terminal] Exported buffer to file')
    } catch (err) {
      console.error('[Terminal] Failed to export buffer:', err)
    }
    
    setMenuOpen(false)
  }, [ptyId])

  const handleClear = useCallback(() => {
    termRef.current?.clear()
    ptyClear()
    hasReceivedDataRef.current = false
    setMenuOpen(false)
  }, [ptyClear])

  const handleSearchFn = useCallback((query: string, dir: "next" | "prev"): boolean => {
    const search = searchRef.current
    if (!search) return false
    
    // Remember last search query for F3 shortcuts
    if (query) {
      setLastSearchQuery(query)
    }
    
    if (dir === "prev") {
      return search.findPrevious(query, { caseSensitive: false, incremental: false })
    }
    return search.findNext(query, { caseSensitive: false, incremental: false })
  }, [])

  const toggleSearch = useCallback(() => {
    const newSearchOpen = !searchOpen
    setSearchOpen(newSearchOpen)
    setMenuOpen(false)
    
    // Clear search decorations when closing
    if (!newSearchOpen && searchRef.current) {
      searchRef.current.clearDecorations()
    }
  }, [searchOpen])

  // Keyboard shortcuts for search (F3/Shift+F3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 or Shift+F3 for find next/prev
      if (e.key === 'F3') {
        e.preventDefault()
        
        // If search is not open but we have a last query, open search
        if (!searchOpen && lastSearchQuery) {
          setSearchOpen(true)
          return
        }
        
        // If search is open and we have a query, find next/prev
        if (searchOpen && lastSearchQuery) {
          handleSearchFn(lastSearchQuery, e.shiftKey ? "prev" : "next")
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, lastSearchQuery, handleSearchFn])

  const handleMenuAction = useCallback((key: string) => {
    switch (key) {
      case "copy": handleCopy(); break
      case "export": handleExport(); break
      case "clear": handleClear(); break
      case "search": toggleSearch(); break
      case "new": onNew?.(); setMenuOpen(false); break
    }
  }, [handleCopy, handleExport, handleClear, toggleSearch, onNew])

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
          {terminalTitle && (
            <>
              <span className="text-[color:var(--Eulinx-color-border)]">•</span>
              <span className="text-xs text-[color:var(--Eulinx-color-text-secondary)] truncate" title={terminalTitle}>
                {terminalTitle}
              </span>
            </>
          )}
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

      {/* ── Paste warning dialog ── */}
      {pasteWarning && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/50" 
            onClick={() => setPasteWarning(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div 
              className="bg-[color:var(--Eulinx-color-surface)] border border-[color:var(--Eulinx-color-border)] rounded-lg shadow-[var(--Eulinx-elev-lg)] max-w-md w-full pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[color:var(--Eulinx-color-border)]">
                <h3 className="text-sm font-semibold text-[color:var(--Eulinx-color-text)]">
                  Paste {pasteWarning.split('\n').length} lines?
                </h3>
              </div>
              <div className="p-4">
                <p className="text-xs text-[color:var(--Eulinx-color-text-secondary)] mb-3">
                  You're about to paste multiple lines into the terminal. This will execute each line as a command.
                </p>
                <div className="bg-[color:var(--Eulinx-color-surface-sunken)] rounded p-2 mb-4 max-h-32 overflow-y-auto">
                  <pre className="text-[10px] text-[color:var(--Eulinx-color-text-muted)] whitespace-pre-wrap break-all font-mono">
                    {pasteWarning.slice(0, 500)}{pasteWarning.length > 500 ? '...' : ''}
                  </pre>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setPasteWarning(null)}
                    className="px-3 py-1.5 text-xs rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text)] hover:bg-[color:var(--Eulinx-color-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (pty && pasteWarning) {
                        pty.write(pasteWarning)
                      }
                      setPasteWarning(null)
                    }}
                    className="px-3 py-1.5 text-xs rounded bg-[color:var(--Eulinx-color-accent)] text-white hover:opacity-90 transition-opacity"
                  >
                    Paste anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Terminal / Loading / Disconnected / Error ── */}
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

        {connectionState === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--Eulinx-color-surface-sunken)] z-10">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--Eulinx-color-error)]/10">
                <XCircle className="h-6 w-6 text-[color:var(--Eulinx-color-error)]" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-[color:var(--Eulinx-color-error)]">Failed to start terminal</span>
                <span className="text-xs text-[color:var(--Eulinx-color-text-muted)]">Check the shell path or try again</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Destroy and recreate PTY to retry
                  if (ptyId) {
                    const ptyInstance = pty
                    if (ptyInstance) {
                      ptyInstance.kill()
                    }
                    // Allow registry to clean up, then UI will recreate
                    setTimeout(() => {
                      window.location.reload()
                    }, 100)
                  }
                }}
                className="mt-2 px-4 py-2 text-xs rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text)] hover:bg-[color:var(--Eulinx-color-hover)] transition-colors"
              >
                Reload Terminal
              </button>
            </div>
          </div>
        )}

        {connectionState === "disconnected" && exitCode === null && (
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
  initialBuffer,
  onBufferChange,
}: TerminalViewProps) {
  if (!ptyId) return null
  return <TerminalXterm 
    ptyId={ptyId} 
    onNew={onNew} 
    shell={shell} 
    className={className} 
    autoFocus={autoFocus ?? true}
    initialBuffer={initialBuffer}
    onBufferChange={onBufferChange}
  />
})

export default TerminalView
