import { BREAKPOINTS } from "./breakpoints"

export type SidebarState = "rail" | "visible"
export type PaneState = "hidden" | "visible"

export interface CollapsePlan {
  sidebar: SidebarState
  inspector: PaneState
  panel: PaneState
}

/**
 * Pure layout-degradation plan. Below `md` we collapse the sidebar to a rail,
 * hide the inspector, then hide the bottom panel. At `md` and above everything
 * is visible.
 */
export function computeCollapsePlan(width: number): CollapsePlan {
  if (width >= BREAKPOINTS.md) {
    return { sidebar: "visible", inspector: "visible", panel: "visible" }
  }

  if (width >= BREAKPOINTS.sm) {
    return { sidebar: "rail", inspector: "hidden", panel: "visible" }
  }

  return { sidebar: "rail", inspector: "hidden", panel: "hidden" }
}
