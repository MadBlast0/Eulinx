/**
 * P18-UI-DASH — ResponsiveRules
 *
 * Window-size / media / reduced-motion / DPI hooks.
 * From ResponsiveRules-Part02 (window queries) and Part04 (DPI + zoom).
 *
 * All hooks read CSS px (logical px), so OS zoom + DPI scaling do not change
 * layout decisions (Part 02 "breakpoints in CSS px; usable at 200% OS zoom").
 */

import { useEffect, useRef, useState } from "react"
import { BREAKPOINTS, resolveBreakpoint, type Breakpoint, type WindowSize } from "./breakpoints"

// ---------------------------------------------------------------------------
// useMediaQuery — generic matchMedia subscription (SSR-safe-ish, jsdom-safe)
// ---------------------------------------------------------------------------

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mql = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mql.matches)
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    }
    // Safari < 14 fallback
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [query])

  return matches
}

// ---------------------------------------------------------------------------
// usePrefersReducedMotion — wraps prefers-reduced-motion (Animations-Part01)
// ---------------------------------------------------------------------------

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)")
}

// ---------------------------------------------------------------------------
// useBreakpoint — tracks window.innerWidth via rAF-throttled resize
// ---------------------------------------------------------------------------

export interface UseBreakpointResult {
  readonly breakpoint: Breakpoint
  readonly width: number
  readonly height: number
}

export function useBreakpoint(): UseBreakpointResult {
  const [size, setSize] = useState<WindowSize>(() => {
    if (typeof window === "undefined") return { width: BREAKPOINTS.xl, height: 0 }
    return { width: window.innerWidth, height: window.innerHeight }
  })

  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const read = () => setSize({ width: window.innerWidth, height: window.innerHeight })

    const onResize = () => {
      if (frame.current !== null) return
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null
        read()
      })
    }

    read()
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [])

  return { breakpoint: resolveBreakpoint(size.width), width: size.width, height: size.height }
}

// ---------------------------------------------------------------------------
// useDpi / useMonitorChange — DPI + multi-monitor detection (Part04)
// ---------------------------------------------------------------------------

export interface DpiInfo {
  /** CSS px per CSS px of the window; 1 on single 1x monitor. */
  readonly devicePixelRatio: number
  /** Human-readable monitor label, best-effort. */
  readonly monitor: string
}

function readDpi(): DpiInfo {
  if (typeof window === "undefined") {
    return { devicePixelRatio: 1, monitor: "default" }
  }
  const dpr = window.devicePixelRatio || 1
  // Best-effort: there is no web API for "which monitor", so we label by DPR.
  const monitor = dpr > 1 ? `hi-dpi@${dpr}x` : "standard"
  return { devicePixelRatio: dpr, monitor }
}

export function useDpi(): DpiInfo {
  const [dpi, setDpi] = useState<DpiInfo>(readDpi)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const update = () => setDpi(readDpi())
    const mql = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    const onChange = () => update()
    update()
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    }
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])

  return dpi
}

export interface MonitorChangeResult {
  readonly dpi: DpiInfo
  /** True immediately after a DPI/monitor change is detected on this load. */
  readonly changedOnLoad: boolean
  /** Fires a callback whenever the monitor/DPI changes (and on initial mount). */
  readonly lastWindowSize: WindowSize | null
}

/**
 * Detects monitor / DPI changes and persists `lastWindowSize` (per
 * WorkspaceLayout-Part04 the layout store owns `lastWindowSize`). On load we
 * compare the current size against the persisted size to detect a monitor
 * change and re-hydrate, per ResponsiveRules-Part04.
 */
export function useMonitorChange(
  onMonitorChange?: (info: DpiInfo, size: WindowSize) => void,
  persistedSize?: WindowSize | null,
): MonitorChangeResult {
  const dpi = useDpi()
  const [lastWindowSize, setLastWindowSize] = useState<WindowSize | null>(
    persistedSize ?? null,
  )
  const [changedOnLoad, setChangedOnLoad] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const size: WindowSize = { width: window.innerWidth, height: window.innerHeight }

    const monitorChanged =
      persistedSize !== undefined &&
      persistedSize !== null &&
      (persistedSize.width !== size.width || persistedSize.height !== size.height)

    if (monitorChanged) setChangedOnLoad(true)

    setLastWindowSize(size)
    onMonitorChange?.(dpi, size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpi.devicePixelRatio])

  useEffect(() => {
    if (typeof window === "undefined") return
    const onResize = () => {
      const size: WindowSize = { width: window.innerWidth, height: window.innerHeight }
      setLastWindowSize(size)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return { dpi, changedOnLoad, lastWindowSize }
}
