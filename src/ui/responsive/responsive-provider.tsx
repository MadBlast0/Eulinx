/**
 * P18-UI-DASH — ResponsiveRules
 *
 * ResponsiveProvider: mounted once at the app root. Wires window resize ->
 * computeCollapsePlan -> applies via the layout store, and renders the
 * "window too small" overlay. Exposes useResponsive() context.
 *
 * From ResponsiveRules-Part01 (one shell), Part03 (collapse order), Part04
 * (DPI / monitor change re-hydration).
 */

/* eslint-disable react-refresh/only-export-components -- provider + its
   colocated context hook are exported together by design. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useLayoutStore } from "@/stores/layout-store"
import {
  computeCollapsePlan,
  applyCollapsePlan,
  readRequestedRegions,
  type CollapsePlan,
} from "./collapse-orchestrator"
import {
  useBreakpoint,
  useMonitorChange,
} from "./use-breakpoint"
import {
  isWindowTooSmall,
  type Breakpoint,
  type WindowSize,
} from "./breakpoints"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface ResponsiveContextValue {
  readonly breakpoint: Breakpoint
  readonly width: number
  readonly height: number
  readonly plan: CollapsePlan
  readonly isDegraded: boolean
  readonly tooSmall: boolean
  /** Manually re-run the orchestrator (e.g. after a region toggle). */
  readonly recompute: () => void
}

const ResponsiveContext = createContext<ResponsiveContextValue | null>(null)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readRequestedVisibility(): ReturnType<typeof readRequestedRegions> {
  return readRequestedRegions()
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ResponsiveProviderProps {
  readonly children: ReactNode
  /** Disable the window-too-small overlay (tests / embed). */
  readonly hideOverlay?: boolean
}

export function ResponsiveProvider({
  children,
  hideOverlay = false,
}: ResponsiveProviderProps): ReactNode {
  const { breakpoint, width, height } = useBreakpoint()
  const setLayout = useLayoutStore((s) => s.setLayout)

  const [plan, setPlan] = useState<CollapsePlan>(() => ({
    sidebar: "visible",
    inspector: "visible",
    panel: "visible",
    canvasWidth: width,
    degraded: false,
    tooSmall: false,
  }))

  const windowSizeRef = useRef<WindowSize>({ width, height })
  windowSizeRef.current = { width, height }

  const recompute = useCallback(() => {
    const size = windowSizeRef.current
    const requested = readRequestedVisibility()
    const next = computeCollapsePlan(size, requested)
    setPlan(next)
    if (!next.tooSmall) {
      applyCollapsePlan(next)
    }
  }, [])

  // Re-run the orchestrator whenever the window crosses a breakpoint or the
  // store's region visibility changes (user toggled a region).
  useEffect(() => {
    recompute()
  }, [breakpoint, width, height, recompute])

  useEffect(() => {
    const unsub = useLayoutStore.subscribe((state, prev) => {
      if (!state.layout || !prev.layout) return
      const a = state.layout.regions
      const b = prev.layout.regions
      if (
        a.sidebar.visible !== b.sidebar.visible ||
        a.sidebar.collapsed !== b.sidebar.collapsed ||
        a.inspector.visible !== b.inspector.visible ||
        a.inspector.collapsed !== b.inspector.collapsed ||
        a.panel.visible !== b.panel.visible ||
        a.panel.collapsed !== b.panel.collapsed
      ) {
        recompute()
      }
    })
    return unsub
  }, [recompute])

  // Part04: detect monitor / DPI change on load and re-hydrate lastWindowSize.
  useMonitorChange(
    (_info, size) => {
      const { layout } = useLayoutStore.getState()
      if (layout) {
        setLayout({
          ...layout,
          lastWindowSize: { width: size.width, height: size.height },
        })
      }
      recompute()
    },
    useLayoutStore.getState().layout?.lastWindowSize ?? null,
  )

  const tooSmall = isWindowTooSmall(windowSizeRef.current)

  const value = useMemo<ResponsiveContextValue>(
    () => ({
      breakpoint,
      width,
      height,
      plan,
      isDegraded: plan.degraded,
      tooSmall: plan.tooSmall || tooSmall,
      recompute,
    }),
    [breakpoint, width, height, plan, tooSmall, recompute],
  )

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
      {!hideOverlay && (plan.tooSmall || tooSmall) ? <WindowTooSmallOverlay /> : null}
    </ResponsiveContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// "Window too small" overlay (calm, no animation per ResponsiveRules-Part01)
// ---------------------------------------------------------------------------

const MIN_W = 940
const MIN_H = 560

function WindowTooSmallOverlay(): ReactNode {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Window too small"
      data-testid="window-too-small"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "24px",
        textAlign: "center",
        background: "var(--Eulinx-color-bg-canvas, #0d1117)",
        color: "var(--Eulinx-color-fg-default, #e6edf3)",
        fontFamily: "var(--Eulinx-font-sans, system-ui, sans-serif)",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: 600 }}>
        Window too small
      </div>
      <div style={{ fontSize: "14px", opacity: 0.8, maxWidth: "420px" }}>
        Eulinx needs at least {MIN_W} × {MIN_H} px to stay usable. Resize the
        window larger to continue.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useResponsive(): ResponsiveContextValue {
  const ctx = useContext(ResponsiveContext)
  if (ctx === null) {
    throw new Error("useResponsive must be used within <ResponsiveProvider>")
  }
  return ctx
}
