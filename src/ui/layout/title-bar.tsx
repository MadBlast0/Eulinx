/**
 * TitleBar — minimal window chrome for Tauri.
 *
 * Handles window drag, minimize / maximize / close. This is the slim bar
 * at the very top of the window. The IDE-style TopBar with project info,
 * breadcrumbs, and actions lives in the center workspace area.
 *
 * Height: 32px (slim). Just enough for window controls.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"

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
  readonly onPointerDownChrome?: (e: React.PointerEvent) => void
  readonly onBeforeClose?: () => Promise<void> | void
}

export function TitleBar({
  onPointerDownChrome,
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
      try {
        await onBeforeClose?.()
      } catch {
        /* never block the close */
      }
      await withTauriWindow((w) => w.close())
    })()
  }, [onBeforeClose])

  const chromeStyle: CSSProperties = {
    height: 32,
    background: token("--Eulinx-color-surface"),
    borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
    color: token("--Eulinx-color-text"),
    userSelect: "none",
  }

  const buttonStyle: CSSProperties = {
    width: 32,
    height: 32,
    color: token("--Eulinx-color-text-muted"),
    transition: `background-color ${token("--Eulinx-duration-hover")} var(--Eulinx-ease-standard)`,
  }

  return (
    <div
      role="banner"
      data-tauri-drag-region
      onPointerDown={startDrag}
      onDoubleClick={toggleMaximize}
      className="flex shrink-0 select-none items-center justify-between px-2"
      style={chromeStyle}
    >
      {/* App name */}
      <span
        className="text-xs font-medium"
        style={{ color: token("--Eulinx-color-text-muted") }}
      >
        Eulinx
      </span>

      {/* Window controls */}
      <div className="flex items-center" data-no-drag>
        <button
          type="button"
          aria-label="Minimize"
          onClick={minimize}
          className="flex items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-surface-alt)]"
          style={buttonStyle}
        >
          <Icon name="nav.collapse" size="xs" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Maximize"
          onClick={toggleMaximize}
          onDoubleClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-surface-alt)]"
          style={buttonStyle}
        >
          <Icon name="nav.expand" size="xs" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="flex items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-error)]"
          style={buttonStyle}
        >
          <Icon name="nav.close" size="xs" aria-hidden />
        </button>
      </div>
    </div>
  )
}
