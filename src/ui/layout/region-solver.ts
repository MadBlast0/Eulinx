/**
 * P18-UI-DASH — Region Solver (WorkspaceLayout-Part03).
 *
 * Pure functions (no React) that compute the six-region grid from a window
 * size, the current region states, and the constraint table. The solver is the
 * single owner of the sum-invariant:
 *
 *   sidebar + canvas + inspector + (width-axis splitters) === containerWidth
 *   titleBar + canvas + panel + statusBar + (height-axis splitters) === containerHeight
 *
 * Every component that wants to change a region size MUST go through these
 * functions; it MUST NOT set a region `size` directly. The canvas is the flex
 * region: its size is always derived and never stored as truth.
 */

import { REGION_CONSTRAINTS, type RegionId, type RegionState } from "@/stores/layout-store"
import { MIN_WINDOW_SIZE } from "@/ui/responsive/breakpoints"

/** Splitter thickness, per WorkspaceLayout-Part03 §Splitter Geometry. */
export const SPLITTER_WIDTH = { width: 4, height: 4 } as const

/** Absolute canvas floor — violated only as the last resort (Part03). */
export const ABSOLUTE_MIN_CANVAS = 320

/** Minimum window box, below which the shell shows the "window too small" overlay (Part01/Part02). */
export const MIN_CONTAINER_SIZE: Readonly<{ width: number; height: number }> = MIN_WINDOW_SIZE

/** Fixed order the degrade ladder sacrifices regions in (Part03 §degradeAxis). */
export const DEGRADE_ORDER: readonly RegionId[] = ["sidebar", "inspector", "panel"]

/** The four regions that participate in the keyboard focus cycle (Part06). */
export const FOCUS_CYCLE: readonly RegionId[] = ["sidebar", "canvas", "inspector", "panel"]

/** The full window box the solver reasons about. */
export interface ContainerSize {
  readonly width: number
  readonly height: number
}

/** A solver result: corrected region sizes + the derived canvas size. */
export interface SolvedLayout {
  /** Corrected size for every region, keyed by RegionId. */
  readonly sizes: Record<RegionId, number>
  /** True if any region had to be clamped/collapsed to satisfy the container. */
  readonly degraded: boolean
  /** True when the container is below MIN_WINDOW_SIZE (overlay path). */
  readonly tooSmall: boolean
}

/**
 * Clamp a value to an inclusive range without throwing.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Count the width-axis splitters that separate visible, non-collapsed
 * sizable regions from the canvas. There is one splitter beside each such
 * region (sidebar on the left, inspector on the right).
 */
function widthSplitterCount(regions: Record<RegionId, RegionState>): number {
  let count = 0
  if (regions.sidebar.visible && !regions.sidebar.collapsed) count += 1
  if (regions.inspector.visible && !regions.inspector.collapsed) count += 1
  return count
}

/**
 * Count the height-axis splitters (the panel, when visible & not collapsed).
 */
function heightSplitterCount(regions: Record<RegionId, RegionState>): number {
  return regions.panel.visible && !regions.panel.collapsed ? 1 : 0
}

/**
 * Solve the horizontal axis. Pins every non-collapsed sizable region to its
 * clamped size, then gives the canvas whatever remains. If the canvas drops
 * below its functional floor, the degrade ladder reclaims space from the
 * collapsible regions in normative order.
 *
 * @returns the solved width for each width-axis region + a degraded flag.
 */
export function solveWidth(
  containerWidth: number,
  regions: Record<RegionId, RegionState>,
  canvasMinOverride?: number,
): { sizes: Pick<Record<RegionId, number>, "sidebar" | "inspector" | "canvas">; degraded: boolean } {
  const canvasFloor = canvasMinOverride ?? REGION_CONSTRAINTS.canvas.minSize

  const sidebar = REGION_CONSTRAINTS.sidebar
  const inspector = REGION_CONSTRAINTS.inspector

  let sidebarSize = regions.sidebar.size
  let inspectorSize = regions.inspector.size

  // 1. Pin non-collapsed sizable regions to their clamped size.
  if (regions.sidebar.collapsed) {
    sidebarSize = sidebar.collapseMode === "rail" ? sidebar.railSize : 0
  } else {
    sidebarSize = clamp(sidebarSize, sidebar.minSize, sidebar.maxSize)
  }

  if (regions.inspector.collapsed) {
    inspectorSize = 0
  } else {
    inspectorSize = clamp(inspectorSize, inspector.minSize, inspector.maxSize)
  }

  // 2. Sum the claimed pixels + splitters.
  const splitters = widthSplitterCount(regions) * SPLITTER_WIDTH.width
  const claimed = sidebarSize + inspectorSize + splitters
  let canvasSize = containerWidth - claimed

  let degraded = false

  if (canvasSize >= canvasFloor) {
    return { sizes: { sidebar: sidebarSize, inspector: inspectorSize, canvas: canvasSize }, degraded: false }
  }

  // 3. Under width pressure — degrade ladder.
  if (regions.sidebar.visible && !regions.sidebar.collapsed && canvasSize < canvasFloor) {
    // Sidebar -> rail reclaims (size - railSize).
    const reclaimed = sidebarSize - sidebar.railSize
    sidebarSize = sidebar.railSize
    canvasSize += reclaimed
    degraded = true
  }

  if (regions.inspector.visible && !regions.inspector.collapsed && canvasSize < canvasFloor) {
    // Inspector -> hidden reclaims its full width.
    canvasSize += inspectorSize
    inspectorSize = 0
    degraded = true
  }

  // 4. Last resort: violate the canvas functional floor, never below absolute.
  if (canvasSize < canvasFloor) {
    canvasSize = Math.max(ABSOLUTE_MIN_CANVAS, canvasSize)
    degraded = true
  }

  return { sizes: { sidebar: sidebarSize, inspector: inspectorSize, canvas: canvasSize }, degraded }
}

/**
 * Solve the vertical axis. titleBar and statusBar are fixed; the panel is the
 * only sizable height region; the canvas takes the rest.
 */
export function solveHeight(
  containerHeight: number,
  regions: Record<RegionId, RegionState>,
): { sizes: Pick<Record<RegionId, number>, "titleBar" | "panel" | "statusBar" | "canvas">; degraded: boolean } {
  const panel = REGION_CONSTRAINTS.panel

  let panelSize = regions.panel.size
  if (regions.panel.collapsed) {
    panelSize = 0
  } else {
    panelSize = clamp(panelSize, panel.minSize, panel.maxSize)
  }

  const splitters = heightSplitterCount(regions) * SPLITTER_WIDTH.height
  const claimed = regions.titleBar.size + regions.statusBar.size + panelSize + splitters
  const canvasSize = Math.max(0, containerHeight - claimed)

  return {
    sizes: { titleBar: regions.titleBar.size, panel: panelSize, statusBar: regions.statusBar.size, canvas: canvasSize },
    degraded: false,
  }
}

/**
 * Run the full two-axis solve against the current region states and a container
 * size. Returns corrected sizes for all six regions plus the derived canvas
 * size. clamps before summing, never the reverse (Part03 MUST).
 *
 * @param container   the live window box in CSS px
 * @param regions     the six region states (canvas.collapsed is ignored)
 * @param canvasMinOverride  optional canvas floor override (defaults to 480)
 */
export function solveLayout(
  container: ContainerSize,
  regions: Record<RegionId, RegionState>,
  canvasMinOverride?: number,
): SolvedLayout {
  const width = solveWidth(container.width, regions, canvasMinOverride)
  const height = solveHeight(container.height, regions)

  const sizes: Record<RegionId, number> = {
    titleBar: height.sizes.titleBar,
    sidebar: width.sizes.sidebar,
    canvas: Math.min(width.sizes.canvas, height.sizes.canvas),
    inspector: width.sizes.inspector,
    panel: height.sizes.panel,
    statusBar: height.sizes.statusBar,
  }

  // Below MIN_WINDOW_SIZE the shell renders the "window too small" overlay.
  const tooSmall = container.width < MIN_CONTAINER_SIZE.width || container.height < MIN_CONTAINER_SIZE.height

  return { sizes, degraded: width.degraded || tooSmall, tooSmall }
}

/**
 * Compute the initial canvas-derived box for a freshly loaded layout, before
 * any window resize. Thin wrapper over `solveLayout` for callers that already
 * hold a `Record<RegionId, RegionState>`.
 */
export function computeCanvas(
  container: ContainerSize,
  regions: Record<RegionId, RegionState>,
): number {
  return solveLayout(container, regions).sizes.canvas
}

/**
 * Reallocate `pendingSizes` (the two neighbours a splitter is dragging) for the
 * width axis and return corrected region sizes. The canvas is recomputed, never
 * written directly. Used during drag preview and on commit.
 *
 * @param axis      which axis the splitter controls
 * @param pending   the region ids + new sizes being previewed
 * @param regions   current full region set (for the untouched axis)
 * @param container the window box
 */
export function applyPendingSizes(
  _axis: "width" | "height",
  pending: Partial<Record<RegionId, number>>,
  regions: Record<RegionId, RegionState>,
  container: ContainerSize,
): SolvedLayout {
  const merged: Record<RegionId, RegionState> = { ...regions }
  for (const id of Object.keys(pending) as RegionId[]) {
    const next = pending[id]
    if (next === undefined) continue
    merged[id] = { ...merged[id], size: next }
  }
  return solveLayout(container, merged)
}
