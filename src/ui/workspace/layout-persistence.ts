import { DEFAULT_LAYOUT, type LayoutState } from "./layout-state"

const STORAGE_PREFIX = "eulinx:layout:"

export function saveLayout(workspaceId: string, layout: LayoutState): void {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + workspaceId,
      JSON.stringify(layout),
    )
  } catch {
    // localStorage may be full or unavailable
  }
}

export function loadLayout(workspaceId: string): LayoutState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + workspaceId)
    if (!raw) return null
    return JSON.parse(raw) as LayoutState
  } catch {
    return null
  }
}

export function resetLayout(): LayoutState {
  return structuredClone(DEFAULT_LAYOUT)
}
