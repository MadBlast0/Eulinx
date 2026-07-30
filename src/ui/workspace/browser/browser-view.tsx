import { memo, useCallback, useEffect, useState, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Globe, RefreshCw, XCircle, Loader2, WifiOff, MoreHorizontal, Trash2 } from "lucide-react"
import { cn } from "@/utils/cn"
import { useToastContext } from "@/providers/ToastProvider"

export interface BrowserViewProps {
  readonly nodeId: string
  readonly initialUrl?: string
  readonly className?: string
}

interface ConsoleLog {
  level: "log" | "warning" | "error" | "info" | "debug"
  text: string
  url?: string
  line?: number
  column?: number
  timestamp: number
  args: unknown[]
}

interface JsError {
  message: string
  url?: string
  line?: number
  column?: number
  stackTrace?: string
  timestamp: number
}

interface NetworkRequest {
  requestId: string
  url: string
  method: string
  status?: number
  mimeType?: string
  error?: string
  timestamp: number
}

interface BrowserSnapshot {
  url: string
  title: string
  consoleLogs: ConsoleLog[]
  errors: JsError[]
  networkRequests: NetworkRequest[]
}

type ConnectionState = "connecting" | "connected" | "disconnected" | "error"

const STATUS_CONFIG: Record<ConnectionState, { icon: React.ReactNode; label: string; color: string }> = {
  connecting: {
    icon: <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />,
    label: "Connecting…",
    color: "var(--Eulinx-color-warning)",
  },
  connected: {
    icon: <Globe className="h-3 w-3" strokeWidth={2} />,
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

const CONSOLE_LEVEL_COLORS = {
  log: "var(--Eulinx-color-text)",
  info: "var(--Eulinx-color-info)",
  warning: "var(--Eulinx-color-warning)",
  error: "var(--Eulinx-color-error)",
  debug: "var(--Eulinx-color-text-muted)",
}

const MENU_ITEMS = [
  { key: "refresh", label: "Refresh page", icon: <RefreshCw className="h-3 w-3" strokeWidth={1.5} /> },
  { key: "clearConsole", label: "Clear console", icon: <Trash2 className="h-3 w-3" strokeWidth={1.5} /> },
  { key: "clearErrors", label: "Clear errors", icon: <Trash2 className="h-3 w-3" strokeWidth={1.5} /> },
  { key: "clearAll", label: "Clear all", icon: <Trash2 className="h-3 w-3" strokeWidth={1.5} /> },
] as const

function BrowserViewImpl({
  initialUrl = "about:blank",
  className,
}: BrowserViewProps) {
  const { toast } = useToastContext()
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting")
  const [currentUrl, setCurrentUrl] = useState(initialUrl)
  const [urlInput, setUrlInput] = useState(initialUrl)
  const [snapshot, setSnapshot] = useState<BrowserSnapshot | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<"console" | "errors" | "network">("console")
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Connect to CDP on mount
  useEffect(() => {
    const connect = async () => {
      try {
        setConnectionState("connecting")
        await invoke("browser_connect")
        
        // Check if connected
        const isConnected = await invoke<boolean>("browser_is_connected")
        if (isConnected) {
          setConnectionState("connected")
          
          // Navigate to initial URL if provided
          if (initialUrl && initialUrl !== "about:blank") {
            await invoke("browser_navigate", { url: initialUrl })
            setCurrentUrl(initialUrl)
            setUrlInput(initialUrl)
          }
        } else {
          setConnectionState("error")
        }
      } catch (err) {
        console.error("[Browser] Failed to connect to CDP:", err)
        setConnectionState("error")
        toast({
          title: "Browser Connection Failed",
          description: String(err),
          type: "error",
          duration: 5000,
        })
      }
    }

    void connect()
  }, [initialUrl, toast])

  // Poll for browser snapshot updates
  useEffect(() => {
    if (connectionState !== "connected") return

    const poll = async () => {
      try {
        const snap = await invoke<BrowserSnapshot>("browser_get_snapshot")
        setSnapshot(snap)
        
        // Update URL if it changed
        if (snap.url !== currentUrl) {
          setCurrentUrl(snap.url)
          setUrlInput(snap.url)
        }
      } catch (err) {
        console.error("[Browser] Failed to get snapshot:", err)
      }
    }

    // Initial poll
    void poll()

    // Poll every 2 seconds
    pollInterval.current = setInterval(() => {
      void poll()
    }, 2000)

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
        pollInterval.current = null
      }
    }
  }, [connectionState, currentUrl])

  const handleNavigate = useCallback(async (url: string) => {
    try {
      setConnectionState("connecting")
      await invoke("browser_navigate", { url })
      setCurrentUrl(url)
      setUrlInput(url)
      setConnectionState("connected")
    } catch (err) {
      console.error("[Browser] Failed to navigate:", err)
      toast({
        title: "Navigation Failed",
        description: String(err),
        type: "error",
        duration: 3000,
      })
      setConnectionState("error")
    }
  }, [toast])

  const handleRefresh = useCallback(async () => {
    try {
      await invoke("browser_reload")
      toast({
        title: "Page Refreshed",
        type: "success",
        duration: 2000,
      })
    } catch (err) {
      console.error("[Browser] Failed to reload:", err)
      toast({
        title: "Refresh Failed",
        description: String(err),
        type: "error",
        duration: 3000,
      })
    }
  }, [toast])

  const handleClearConsole = useCallback(async () => {
    try {
      await invoke("browser_clear_console")
      setMenuOpen(false)
    } catch (err) {
      console.error("[Browser] Failed to clear console:", err)
    }
  }, [])

  const handleClearErrors = useCallback(async () => {
    try {
      await invoke("browser_clear_errors")
      setMenuOpen(false)
    } catch (err) {
      console.error("[Browser] Failed to clear errors:", err)
    }
  }, [])

  const handleClearAll = useCallback(async () => {
    try {
      await invoke("browser_clear_all")
      setMenuOpen(false)
    } catch (err) {
      console.error("[Browser] Failed to clear all:", err)
    }
  }, [])

  const handleMenuAction = useCallback((key: string) => {
    switch (key) {
      case "refresh": void handleRefresh(); setMenuOpen(false); break
      case "clearConsole": void handleClearConsole(); break
      case "clearErrors": void handleClearErrors(); break
      case "clearAll": void handleClearAll(); break
    }
  }, [handleRefresh, handleClearConsole, handleClearErrors, handleClearAll])

  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (urlInput.trim()) {
      void handleNavigate(urlInput.trim())
    }
  }, [urlInput, handleNavigate])

  const status = STATUS_CONFIG[connectionState]

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]",
        className,
      )}
      onContextMenu={(e) => { e.stopPropagation(); e.preventDefault() }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-2 py-0.5"
        role="toolbar"
        aria-label="Browser controls"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="flex items-center gap-1.5 text-xs font-medium shrink-0"
            style={{ color: status?.color }}
            aria-live="polite"
          >
            {status?.icon}
            <span className="truncate">{status?.label}</span>
          </span>

          {/* URL bar */}
          <form onSubmit={handleUrlSubmit} className="flex-1 min-w-0">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL..."
              disabled={connectionState !== "connected"}
              className="w-full px-2 py-0.5 text-xs bg-[color:var(--Eulinx-color-surface-sunken)] border border-[color:var(--Eulinx-color-border)] rounded text-[color:var(--Eulinx-color-text)] placeholder:text-[color:var(--Eulinx-color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--Eulinx-color-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </form>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Refresh button */}
          <button
            type="button"
            aria-label="Refresh page"
            onClick={handleRefresh}
            disabled={connectionState !== "connected"}
            className="flex h-5 w-5 items-center justify-center rounded text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
          </button>

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

      {/* ── Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-[200px]">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-2">
          <button
            type="button"
            onClick={() => setSelectedTab("console")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              selectedTab === "console"
                ? "text-[color:var(--Eulinx-color-accent)] border-b-2 border-[color:var(--Eulinx-color-accent)]"
                : "text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
            )}
          >
            Console {snapshot && snapshot.consoleLogs.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[color:var(--Eulinx-color-accent)]/20 text-[10px] text-[color:var(--Eulinx-color-accent)]">
                {snapshot.consoleLogs.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("errors")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              selectedTab === "errors"
                ? "text-[color:var(--Eulinx-color-accent)] border-b-2 border-[color:var(--Eulinx-color-accent)]"
                : "text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
            )}
          >
            Errors {snapshot && snapshot.errors.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[color:var(--Eulinx-color-error)]/20 text-[10px] text-[color:var(--Eulinx-color-error)]">
                {snapshot.errors.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("network")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              selectedTab === "network"
                ? "text-[color:var(--Eulinx-color-accent)] border-b-2 border-[color:var(--Eulinx-color-accent)]"
                : "text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
            )}
          >
            Network {snapshot && snapshot.networkRequests.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[color:var(--Eulinx-color-info)]/20 text-[10px] text-[color:var(--Eulinx-color-info)]">
                {snapshot.networkRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[color:var(--Eulinx-color-surface-sunken)] p-2">
          {connectionState === "connecting" && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-[color:var(--Eulinx-color-text-muted)]">
                <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
                <span className="text-sm">Connecting to browser…</span>
              </div>
            </div>
          )}

          {connectionState === "error" && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--Eulinx-color-error)]/10">
                  <XCircle className="h-6 w-6 text-[color:var(--Eulinx-color-error)]" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[color:var(--Eulinx-color-error)]">Failed to connect to browser</span>
                  <span className="text-xs text-[color:var(--Eulinx-color-text-muted)]">Is Chrome DevTools Protocol enabled?</span>
                </div>
              </div>
            </div>
          )}

          {connectionState === "connected" && snapshot && (
            <>
              {selectedTab === "console" && (
                <div className="space-y-1">
                  {snapshot.consoleLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-[color:var(--Eulinx-color-text-muted)]">
                      No console logs
                    </div>
                  ) : (
                    snapshot.consoleLogs.map((log, i) => (
                      <div
                        key={i}
                        className="font-mono text-[11px] px-2 py-1 rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]"
                        style={{ color: CONSOLE_LEVEL_COLORS[log.level] }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 font-semibold uppercase">[{log.level}]</span>
                          <span className="flex-1 break-words">{log.text}</span>
                        </div>
                        {log.url && (
                          <div className="mt-1 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                            {log.url}:{log.line}:{log.column}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedTab === "errors" && (
                <div className="space-y-2">
                  {snapshot.errors.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-[color:var(--Eulinx-color-text-muted)]">
                      No errors
                    </div>
                  ) : (
                    snapshot.errors.map((error, i) => (
                      <div
                        key={i}
                        className="font-mono text-[11px] px-2 py-1.5 rounded border border-[color:var(--Eulinx-color-error)]/30 bg-[color:var(--Eulinx-color-error)]/5"
                      >
                        <div className="font-semibold text-[color:var(--Eulinx-color-error)] mb-1">
                          {error.message}
                        </div>
                        {error.url && (
                          <div className="text-[10px] text-[color:var(--Eulinx-color-text-muted)] mb-1">
                            {error.url}:{error.line}:{error.column}
                          </div>
                        )}
                        {error.stackTrace && (
                          <pre className="mt-1 text-[10px] text-[color:var(--Eulinx-color-text-muted)] whitespace-pre-wrap">
                            {error.stackTrace}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedTab === "network" && (
                <div className="space-y-1">
                  {snapshot.networkRequests.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-[color:var(--Eulinx-color-text-muted)]">
                      No network requests
                    </div>
                  ) : (
                    snapshot.networkRequests.map((req, i) => (
                      <div
                        key={i}
                        className="font-mono text-[11px] px-2 py-1 rounded border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "shrink-0 font-semibold",
                              req.status && req.status >= 200 && req.status < 300
                                ? "text-[color:var(--Eulinx-color-success)]"
                                : req.status && req.status >= 400
                                ? "text-[color:var(--Eulinx-color-error)]"
                                : "text-[color:var(--Eulinx-color-text-muted)]"
                            )}
                          >
                            {req.status || "---"}
                          </span>
                          <span className="shrink-0 text-[color:var(--Eulinx-color-text-muted)]">
                            {req.method}
                          </span>
                          <span className="flex-1 truncate text-[color:var(--Eulinx-color-text)]" title={req.url}>
                            {req.url}
                          </span>
                        </div>
                        {req.error && (
                          <div className="mt-1 text-[10px] text-[color:var(--Eulinx-color-error)]">
                            Error: {req.error}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export const BrowserView = memo(BrowserViewImpl)
export default BrowserView
