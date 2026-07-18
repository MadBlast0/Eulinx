/**
 * P18-UI-DASH — ResponsiveRules
 *
 * Breakpoints and container-query helpers.
 * From ResponsiveRules-Part01..Part04.
 *
 * Policy layer only: this module defines WHEN structural adaptations fire.
 * The mechanism (the solver) lives in the WorkspaceLayout store
 * (src/stores/layout-store.ts) and the WorkspaceLayout surface files.
 *
 * Breakpoint widths are aligned with WorkspaceLayout's MIN_WINDOW_SIZE
 * (940x560, see src/ui/tokens/design-tokens.ts `layout.minWindow`) and the
 * aggregate-min logic from WorkspaceLayout-Part03. Part 02 specifies the
 * nominal step values; we use those and add xs for the sub-sm range which
 * the spec leaves open ("if not specified, choose sensible values").
 */

import { REGION_CONSTRAINTS } from "@/stores/layout-store"
import { layout as layoutTokens } from "@/ui/tokens/design-tokens"

// ---------------------------------------------------------------------------
// Breakpoints (window WIDTH in CSS px / logical px — never device px)
// ---------------------------------------------------------------------------

/** Nominal breakpoint upper-bounds, in CSS px. A window is `< bp` until the next. */
export const BREAKPOINTS = {
  xs: 640,
  sm: 720,
  md: 1024,
  lg: 1440,
  xl: 1920,
} as const

export type BreakpointName = keyof typeof BREAKPOINTS
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl"

/**
 * Hard window minimum. Below this the shell shows the "window too small"
 * overlay. Mirrors `layout.minWindow` (940x560).
 */
export const MIN_WINDOW_SIZE = {
  width: layoutTokens.minWindow.width,
  height: layoutTokens.minWindow.height,
} as const

/** Absolute canvas floor — canvas may violate its 480 functional min only down to this. */
export const ABSOLUTE_MIN_CANVAS = 320

// ---------------------------------------------------------------------------
// Pure breakpoint resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a window width to a named breakpoint.
 * xs < 640 < sm 720 < md 1024 < lg 1440 < xl 1920.
 */
export function resolveBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return "xl"
  if (width >= BREAKPOINTS.lg) return "lg"
  if (width >= BREAKPOINTS.md) return "md"
  if (width >= BREAKPOINTS.sm) return "sm"
  return "xs"
}

/** Inclusive lower bound (px) for a breakpoint name. */
export function breakpointMinWidth(name: Breakpoint): number {
  switch (name) {
    case "xl":
      return BREAKPOINTS.xl
    case "lg":
      return BREAKPOINTS.lg
    case "md":
      return BREAKPOINTS.md
    case "sm":
      return BREAKPOINTS.sm
    case "xs":
      return 0
  }
}

/** Exclusive upper bound (px) for a breakpoint name. */
export function breakpointMaxWidth(name: Breakpoint): number {
  switch (name) {
    case "xs":
      return BREAKPOINTS.xs
    case "sm":
      return BREAKPOINTS.sm
    case "md":
      return BREAKPOINTS.md
    case "lg":
      return BREAKPOINTS.lg
    case "xl":
      return Number.POSITIVE_INFINITY
  }
}

/** Build a CSS `@media (min-width: ...)` / `max-width` query for a breakpoint. */
export function breakpointMediaQuery(name: Breakpoint): string {
  const min = breakpointMinWidth(name)
  const max = breakpointMaxWidth(name)
  if (name === "xs") return `(max-width: ${max - 1}px)`
  if (name === "xl") return `(min-width: ${min}px)`
  return `(min-width: ${min}px) and (max-width: ${max - 1}px)`
}

// ---------------------------------------------------------------------------
// Container query helpers
// ---------------------------------------------------------------------------

/** A container-width breakpoint expressed as a px threshold + direction. */
export interface ContainerThreshold {
  readonly minWidth: number
  readonly maxWidth?: number
}

export function matchesContainerWidth(
  containerWidth: number,
  threshold: ContainerThreshold,
): boolean {
  const aboveMin = containerWidth >= threshold.minWidth
  const belowMax =
    threshold.maxWidth === undefined ? true : containerWidth < threshold.maxWidth
  return aboveMin && belowMax
}

/**
 * Compute the active container-tier label for a measured container width.
 * Used by <ContainerQuery> and useContainerQuery to drive nested adaptation
 * (card grids, panel splits) independent of the window.
 */
export type ContainerTier = "compact" | "cozy" | "roomy"

export function resolveContainerTier(containerWidth: number): ContainerTier {
  if (containerWidth < 360) return "compact"
  if (containerWidth < 720) return "cozy"
  return "roomy"
}

// ---------------------------------------------------------------------------
// Aggregate-min math (sum-invariant from WorkspaceLayout-Part03)
// ---------------------------------------------------------------------------

export interface WindowSize {
  readonly width: number
  readonly height: number
}

export interface RegionVisibility {
  readonly sidebar: boolean
  readonly inspector: boolean
  readonly panel: boolean
}

/**
 * The horizontal pixels claimed by the fixed non-fluid regions plus the
 * requested optional regions. Splitters (4px each, between width-axis regions)
 * are accounted for. Vertical regions (panel/statusBar/titleBar height) feed
 * the height aggregate separately.
 */
export function aggregateMinWidth(visible: RegionVisibility): number {
  const { sidebar, inspector } = REGION_CONSTRAINTS
  let total = 0
  const splitters = { count: 0 }
  if (visible.sidebar) {
    total += sidebar.minSize
    splitters.count += 1
  }
  if (visible.inspector) {
    total += inspector.minSize
    splitters.count += 1
  }
  // splitters sit between width-axis regions and canvas
  total += splitters.count * 4
  return total
}

export function aggregateMinHeight(visible: RegionVisibility): number {
  const { titleBar, statusBar, panel } = REGION_CONSTRAINTS
  let total = titleBar.minSize + statusBar.minSize
  if (visible.panel) total += panel.minSize
  return total
}

/** Below this width the window is unusable => "window too small" overlay. */
export function isWindowTooSmall(size: WindowSize): boolean {
  return size.width < MIN_WINDOW_SIZE.width || size.height < MIN_WINDOW_SIZE.height
}
