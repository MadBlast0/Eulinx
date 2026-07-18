/**
 * P18-UI-DASH — ResponsiveRules
 *
 * The collapse orchestrator: the POLICY that decides which regions collapse to
 * rail or hide at a given window size. The mechanism (solver, pixel
 * reallocation, persist) lives in the WorkspaceLayout store; this module only
 * decides the ORDER and the TRIGGERS.
 *
 * Collapse order is the normative `degradeAxis` order from
 * WorkspaceLayout-Part03: sidebar (rail) -> inspector (hidden) -> panel
 * (hidden) -> canvas (shrink, never below ABSOLUTE_MIN_CANVAS=320 except when
 * the window is below MIN_WINDOW_SIZE, in which case the shell shows the
 * overlay).
 *
 * The planner reasons about the regions' ACTUAL requested sizes (from the
 * layout store), not their minima, so the ladder fires when a user has
 * expanded regions wider than the window can hold — exactly the sum-invariant
 * case WorkspaceLayout-Part03 describes.
 */

import {
  REGION_CONSTRAINTS,
  useLayoutStore,
  type RegionId,
  type SizableRegionId,
} from "@/stores/layout-store"
import {
  ABSOLUTE_MIN_CANVAS,
  aggregateMinHeight,
  isWindowTooSmall,
  type RegionVisibility,
  type WindowSize,
} from "./breakpoints"

// ---------------------------------------------------------------------------
// Inputs / plan shape
// ---------------------------------------------------------------------------

export type SidebarPlan = "rail" | "visible"
export type HidePlan = "hidden" | "visible"

/** A region the user wants shown, with its current (pre-collapse) size. */
export interface RequestedRegion {
  readonly visible: boolean
  readonly size: number
}

export type RequestedRegions = Record<SizableRegionId, RequestedRegion>

export interface CollapsePlan {
  readonly sidebar: SidebarPlan
  readonly inspector: HidePlan
  readonly panel: HidePlan
  /** Canvas width assigned after applying the plan (>= floor unless tooSmall). */
  readonly canvasWidth: number
  /** True when at least one optional region was degraded this pass. */
  readonly degraded: boolean
  /** True when the window is below MIN_WINDOW_SIZE -> overlay path. */
  readonly tooSmall: boolean
}

// ---------------------------------------------------------------------------
// Helpers to build the input from the layout store / visibility map
// ---------------------------------------------------------------------------

/** Build a RequestedRegions from the live layout store. */
export function readRequestedRegions(): RequestedRegions {
  const { layout } = useLayoutStore.getState()
  const empty: RequestedRegions = {
    sidebar: { visible: true, size: REGION_CONSTRAINTS.sidebar.defaultSize },
    inspector: { visible: true, size: REGION_CONSTRAINTS.inspector.defaultSize },
    panel: { visible: true, size: REGION_CONSTRAINTS.panel.defaultSize },
  }
  if (!layout) return empty
  return {
    sidebar: {
      visible: layout.regions.sidebar.visible || layout.regions.sidebar.collapsed,
      size: layout.regions.sidebar.restoreSize || layout.regions.sidebar.size,
    },
    inspector: {
      visible: layout.regions.inspector.visible || layout.regions.inspector.collapsed,
      size: layout.regions.inspector.restoreSize || layout.regions.inspector.size,
    },
    panel: {
      visible: layout.regions.panel.visible || layout.regions.panel.collapsed,
      size: layout.regions.panel.restoreSize || layout.regions.panel.size,
    },
  }
}

/** Convenience: build RequestedRegions from a boolean visibility map using
 *  each region's default size. Used by tests and the provider defaults. */
export function regionsFromVisibility(
  visibility: RegionVisibility,
): RequestedRegions {
  return {
    sidebar: { visible: visibility.sidebar, size: REGION_CONSTRAINTS.sidebar.defaultSize },
    inspector: { visible: visibility.inspector, size: REGION_CONSTRAINTS.inspector.defaultSize },
    panel: { visible: visibility.panel, size: REGION_CONSTRAINTS.panel.defaultSize },
  }
}

function horizontalClaim(regions: RequestedRegions): number {
  let total = 0
  const splitters = { count: 0 }
  const order: SizableRegionId[] = ["sidebar", "inspector"]
  for (const id of order) {
    if (regions[id].visible) {
      total += Math.max(regions[id].size, REGION_CONSTRAINTS[id].minSize)
      splitters.count += 1
    }
  }
  total += splitters.count * 4
  return total
}

// ---------------------------------------------------------------------------
// Pure planner
// ---------------------------------------------------------------------------

/**
 * Given the current window size and the regions the user wants visible (with
 * their current sizes), compute the structural collapse plan. PURE — does not
 * touch the store.
 *
 * @param windowSize   current Tauri window inner size (CSS px)
 * @param regions      requested regions + sizes (see readRequestedRegions)
 * @param canvasMinOverride optional canvas floor override (defaults to 480)
 */
export function computeCollapsePlan(
  windowSize: WindowSize,
  regions: RequestedRegions,
  canvasMinOverride?: number,
): CollapsePlan {
  const canvasFloor = canvasMinOverride ?? REGION_CONSTRAINTS.canvas.minSize

  if (isWindowTooSmall(windowSize)) {
    return {
      sidebar: "visible",
      inspector: "visible",
      panel: "visible",
      canvasWidth: Math.max(0, windowSize.width - horizontalClaim(regions)),
      degraded: false,
      tooSmall: true,
    }
  }

  let sidebar: SidebarPlan = regions.sidebar.visible ? "visible" : "visible"
  let inspector: HidePlan = regions.inspector.visible ? "visible" : "hidden"
  let panel: HidePlan = regions.panel.visible ? "visible" : "hidden"

  let canvasWidth = windowSize.width - horizontalClaim(regions)

  // ---- degrade pass, normative order: sidebar -> inspector -> panel ----

  if (canvasWidth < canvasFloor && regions.sidebar.visible) {
    // 1. sidebar -> rail. Rail reclaims (size - railSize) px for canvas.
    sidebar = "rail"
    canvasWidth +=
      Math.max(regions.sidebar.size, REGION_CONSTRAINTS.sidebar.minSize) -
      REGION_CONSTRAINTS.sidebar.railSize
  }

  if (canvasWidth < canvasFloor && regions.inspector.visible) {
    // 2. inspector -> hidden. Reclaims its full requested width.
    inspector = "hidden"
    canvasWidth += Math.max(regions.inspector.size, REGION_CONSTRAINTS.inspector.minSize)
  }

  if (canvasWidth < canvasFloor && regions.panel.visible) {
    // 3. panel -> hidden. Height-axis: removes panel min from the vertical
    //    aggregate so a height-constrained canvas row can grow.
    panel = "hidden"
  }

  // 4. Absolute last resort: violate the canvas functional floor, but never
  //    below the absolute floor. (Window-below-min is handled at the top.)
  if (canvasWidth < canvasFloor) {
    canvasWidth = Math.max(ABSOLUTE_MIN_CANVAS, canvasWidth)
  }

  // Height-axis degradation: if the vertical aggregate exceeds the window
  // height, drop the panel first (bottom region).
  const heightFeasible =
    windowSize.height >=
    aggregateMinHeight({
      sidebar: regions.sidebar.visible,
      inspector: regions.inspector.visible,
      panel: regions.panel.visible,
    })
  if (!heightFeasible && regions.panel.visible) {
    panel = "hidden"
  }

  const degraded = sidebar === "rail" || inspector === "hidden" || panel === "hidden"

  return {
    sidebar,
    inspector,
    panel,
    canvasWidth: Math.max(0, canvasWidth),
    degraded,
    tooSmall: false,
  }
}

// ---------------------------------------------------------------------------
// Store application
// ---------------------------------------------------------------------------

/**
 * Apply a computed plan to the layout store. Calls into the store's
 * `collapseRegion` / `expandRegion` (the solver mechanism). Must be called
 * inside a valid store context.
 *
 * Application order mirrors the degrade order so focus migration and pixel
 * reallocation happen deterministically (WorkspaceLayout-Part03).
 */
export function applyCollapsePlan(plan: CollapsePlan): void {
  const { collapseRegion, expandRegion } = useLayoutStore.getState()

  applyOne(collapseRegion, expandRegion, "sidebar", plan.sidebar === "rail")
  applyOne(collapseRegion, expandRegion, "inspector", plan.inspector === "hidden")
  applyOne(collapseRegion, expandRegion, "panel", plan.panel === "hidden")
}

function applyOne(
  collapseRegion: (id: SizableRegionId) => void,
  expandRegion: (id: SizableRegionId) => void,
  id: SizableRegionId,
  shouldCollapse: boolean,
): void {
  const region = useLayoutStore.getState().layout?.regions[id]
  if (!region) return
  if (shouldCollapse && !region.collapsed) {
    collapseRegion(id)
  } else if (!shouldCollapse && region.collapsed) {
    expandRegion(id)
  }
}

// Re-export for callers building from a visibility map.
export type { RegionId }
