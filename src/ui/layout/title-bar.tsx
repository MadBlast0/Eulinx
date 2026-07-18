/**
 * P18-UI-DASH — Custom Title Bar (WorkspaceLayout-Part02).
 *
 * Draws Eulinx's own titlebar because Tauri runs with `decorations: false`.
 * Handles window drag, minimize / maximize / close, and double-click to
 * maximize. All Tauri calls go through `getCurrentWindow()` and are guarded so
 * the bar degrades gracefully in the browser dev server (buttons become
 * no-ops). The close path awaits the layout flush (Part04 flush-before-close)
 * before invoking `window_close`, so the final arrangement is never lost.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import type { RegionId } from "@/stores/layout-store"

/** True when running inside a Tauri window. */
function hasTauri(): boolean {
  return typeof window !== "undefined" && (window as unknown as { __TAURI__?: unknown }).__TAURI__ !== undefined
}

async function withTauriWindow<T>(
  fn: (w: import("@tauri-apps/api/window").Window) => Promise<T>,
): Promise<T | undefined> {
  if (!hasTauri()) return undefined
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window")
    return await fn(getCurrentWindow())
  } catch {
    return undefined
  }
}

export interface TitleBarProps {
  /** The workspace name shown in the breadcrumb. */
  readonly workspaceName?: string
  /** The session name shown in the breadcrumb. */
  readonly sessionName?: string
  /** Called when the user presses the window drag region (pointer down). */
  readonly onPointerDownChrome?: (e: React.PointerEvent) => void
  /** Callback to set the focused region (used when window controls are clicked). */
  readonly onFocusRegion?: (id: RegionId) => void
  /**
   * Flush-before-close hook. The shell awaits this (then the Tauri close) so
   * the final layout is persisted. Receives the resolved close function.
   */
  readonly onBeforeClose?: () => Promise<void> | void
}

export function TitleBar({
  workspaceName = "Eulinx",
  sessionName,
  onPointerDownChrome,
  onFocusRegion,
  onBeforeClose,
}: TitleBarProps): ReactNode {
  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return
      void withTauriWindow((w) => w.startDragging())
      onPointerDownChrome?.(e)
    },
    [onPointerDownChrome],
  )

  const minimize = useCallback(() => {
    void withTauriWindow((w) => w.minimize())
  }, [])
  const toggleMaximize = useCallback(() => {
    void withTauriWindow(async (w) => {
      const maximized = await w.isMaximized()
      if (maximized) await w.unmaximize()
      else await w.maximize()
    })
  }, [])
  const close = useCallback(() => {
    void (async () => {
      // Flush the final layout BEFORE closing so it is never lost (Part04).
      try {
        await onBeforeClose?.()
      } catch {
        /* never block the close on a persist failure */
      }
      await withTauriWindow((w) => w.close())
    })()
  }, [onBeforeClose])

  const chromeStyle: CSSProperties = {
    height: token("--Eulinx-space-12"),
    background: token("--Eulinx-color-surface"),
    borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
    color: token("--Eulinx-color-text-primary"),
    userSelect: "none",
  }

  const buttonStyle: CSSProperties = {
    width: token("--Eulinx-space-12"),
    height: token("--Eulinx-space-12"),
    color: token("--Eulinx-color-text-muted"),
    transition: `background-color ${token("--Eulinx-duration-fast")} var(--Eulinx-ease-standard)`,
  }

  return (
    <div
      role="banner"
      data-tauri-drag-region
      onPointerDown={startDrag}
      onDoubleClick={toggleMaximize}
      className="flex shrink-0 select-none items-center px-3"
      style={chromeStyle}
    >
      <span className="mr-2 text-role-ui font-semibold" style={{ color: token("--Eulinx-color-text-primary") }}>
        Eulinx
      </span>
      <span
        className="flex min-w-0 items-center gap-1 text-role-caption"
        style={{ color: token("--Eulinx-color-text-muted") }}
      >
        <span className="truncate" style={{ maxWidth: token("--Eulinx-space-20") }}>
          {workspaceName}
        </span>
        {sessionName !== undefined && (
          <>
            <Icon name="nav.chevron.right" size="xs" aria-hidden />
            <span className="truncate" style={{ maxWidth: token("--Eulinx-space-20") }}>
              {sessionName}
            </span>
          </>
        )}
      </span>

      <div className="ml-auto flex items-center" data-no-drag>
        <button
          type="button"
          aria-label="Minimize"
          onClick={minimize}
          className="flex items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-elevated-2)]"
          style={buttonStyle}
        >
          <Icon name="nav.collapse" size="sm" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          onClick={toggleMaximize}
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-elevated-2)]"
          style={buttonStyle}
        >
          <Icon name="nav.expand" size="sm" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          onPointerDown={() => onFocusRegion?.("titleBar")}
          className="flex items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-danger)]"
          style={buttonStyle}
        >
          <Icon name="nav.close" size="sm" aria-hidden />
        </button>
      </div>
    </div>
  )
}
