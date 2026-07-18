/**
 * P18-UI-DASH — Layout Store (Zustand)
 *
 * Tier 2 state: view state. Pane sizes, collapsed regions, active tab, theme.
 * Persisted to SQLite via invoke, per workspace.
 * From WorkspaceLayout-Part01 §Layout Object Model.
 */

import { create } from "zustand"

// ---------------------------------------------------------------------------
// Types (WorkspaceLayout-Part01 §Layout Object Model)
// ---------------------------------------------------------------------------

export type RegionId = "titleBar" | "sidebar" | "canvas" | "inspector" | "panel" | "statusBar"
export type SizableRegionId = "sidebar" | "inspector" | "panel"
export type CollapseMode = "hidden" | "rail" | "none"

export interface RegionState {
  readonly id: RegionId
  readonly visible: boolean
  readonly collapsed: boolean
  readonly size: number
  readonly restoreSize: number
}

export interface RegionConstraints {
  readonly id: RegionId
  readonly axis: "width" | "height"
  readonly minSize: number
  readonly maxSize: number
  readonly defaultSize: number
  readonly collapseMode: CollapseMode
  readonly railSize: number
  readonly collapseThreshold: number
  readonly resizable: boolean
}

export interface CanvasTab {
  readonly tabId: string
  readonly kind: "graph" | "terminal" | "terminal_cards" | "artifact_diff" | "settings"
  readonly title: string
  readonly subjectId: string | null
  readonly pinned: boolean
}

export interface CanvasTabsState {
  readonly tabs: CanvasTab[]
  readonly activeTabId: string
  readonly mruOrder: string[]
}

export interface FocusState {
  readonly focusedRegion: RegionId
  readonly previousRegion: RegionId | null
  readonly focusVisible: boolean
}

export interface LayoutState {
  readonly schemaVersion: number
  readonly workspaceId: string
  readonly regions: Record<RegionId, RegionState>
  readonly canvasTabs: CanvasTabsState
  readonly focus: FocusState
  readonly lastWindowSize: { width: number; height: number }
  readonly updatedAt: string
}

// ---------------------------------------------------------------------------
// Constraint Table (WorkspaceLayout-Part01 §Constraint Table)
// ---------------------------------------------------------------------------

export const REGION_CONSTRAINTS: Record<RegionId, RegionConstraints> = {
  titleBar: { id: "titleBar", axis: "height", minSize: 36, maxSize: 36, defaultSize: 36, collapseMode: "none", railSize: 0, collapseThreshold: 0, resizable: false },
  sidebar: { id: "sidebar", axis: "width", minSize: 180, maxSize: 480, defaultSize: 240, collapseMode: "rail", railSize: 48, collapseThreshold: 60, resizable: true },
  canvas: { id: "canvas", axis: "width", minSize: 480, maxSize: Infinity, defaultSize: 0, collapseMode: "none", railSize: 0, collapseThreshold: 0, resizable: false },
  inspector: { id: "inspector", axis: "width", minSize: 260, maxSize: 560, defaultSize: 320, collapseMode: "hidden", railSize: 0, collapseThreshold: 80, resizable: true },
  panel: { id: "panel", axis: "height", minSize: 120, maxSize: 640, defaultSize: 220, collapseMode: "hidden", railSize: 0, collapseThreshold: 50, resizable: true },
  statusBar: { id: "statusBar", axis: "height", minSize: 24, maxSize: 24, defaultSize: 24, collapseMode: "none", railSize: 0, collapseThreshold: 0, resizable: false },
}

// ---------------------------------------------------------------------------
// Default Layout
// ---------------------------------------------------------------------------

function createDefaultLayout(workspaceId: string): LayoutState {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    workspaceId,
    regions: {
      titleBar: { id: "titleBar", visible: true, collapsed: false, size: 36, restoreSize: 36 },
      sidebar: { id: "sidebar", visible: true, collapsed: false, size: 240, restoreSize: 240 },
      canvas: { id: "canvas", visible: true, collapsed: false, size: 0, restoreSize: 0 },
      inspector: { id: "inspector", visible: true, collapsed: false, size: 320, restoreSize: 320 },
      panel: { id: "panel", visible: true, collapsed: false, size: 220, restoreSize: 220 },
      statusBar: { id: "statusBar", visible: true, collapsed: false, size: 24, restoreSize: 24 },
    },
    canvasTabs: {
      tabs: [{ tabId: "graph", kind: "graph", title: "Graph", subjectId: null, pinned: true }],
      activeTabId: "graph",
      mruOrder: ["graph"],
    },
    focus: { focusedRegion: "canvas", previousRegion: null, focusVisible: false },
    lastWindowSize: { width: 1280, height: 720 },
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Layout Store
// ---------------------------------------------------------------------------

interface LayoutStore {
  readonly layout: LayoutState | null
  readonly isLoading: boolean

  readonly setLayout: (layout: LayoutState) => void
  readonly updateRegion: (id: SizableRegionId, patch: Partial<RegionState>) => void
  readonly collapseRegion: (id: SizableRegionId) => void
  readonly expandRegion: (id: SizableRegionId) => void
  readonly setFocusedRegion: (id: RegionId) => void
  readonly setActiveTab: (tabId: string) => void
  readonly addTab: (tab: CanvasTab) => void
  readonly removeTab: (tabId: string) => void
  readonly setLoading: (loading: boolean) => void
  readonly resetLayout: (workspaceId: string) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  layout: null,
  isLoading: true,

  setLayout: (layout) => set({ layout, isLoading: false }),

  updateRegion: (id, patch) =>
    set((state) => {
      if (!state.layout) return state
      const region = state.layout.regions[id]
      if (!region) return state
      return {
        layout: {
          ...state.layout,
          regions: { ...state.layout.regions, [id]: { ...region, ...patch } },
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  collapseRegion: (id) =>
    set((state) => {
      if (!state.layout) return state
      const region = state.layout.regions[id]
      if (!region) return state
      const constraints = REGION_CONSTRAINTS[id]
      return {
        layout: {
          ...state.layout,
          regions: {
            ...state.layout.regions,
            [id]: {
              ...region,
              visible: constraints.collapseMode !== "hidden",
              collapsed: true,
              size: constraints.collapseMode === "rail" ? constraints.railSize : 0,
              restoreSize: region.size,
            },
          },
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  expandRegion: (id) =>
    set((state) => {
      if (!state.layout) return state
      const region = state.layout.regions[id]
      if (!region) return state
      return {
        layout: {
          ...state.layout,
          regions: {
            ...state.layout.regions,
            [id]: { ...region, visible: true, collapsed: false, size: region.restoreSize },
          },
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  setFocusedRegion: (id) =>
    set((state) => {
      if (!state.layout) return state
      return {
        layout: {
          ...state.layout,
          focus: {
            focusedRegion: id,
            previousRegion: state.layout.focus.focusedRegion,
            focusVisible: true,
          },
        },
      }
    }),

  setActiveTab: (tabId) =>
    set((state) => {
      if (!state.layout) return state
      const { canvasTabs } = state.layout
      if (!canvasTabs.tabs.find((t) => t.tabId === tabId)) return state
      const mruOrder = [tabId, ...canvasTabs.mruOrder.filter((id) => id !== tabId)]
      return {
        layout: {
          ...state.layout,
          canvasTabs: { ...canvasTabs, activeTabId: tabId, mruOrder },
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  addTab: (tab) =>
    set((state) => {
      if (!state.layout) return state
      const { canvasTabs } = state.layout
      if (canvasTabs.tabs.find((t) => t.tabId === tab.tabId)) return state
      return {
        layout: {
          ...state.layout,
          canvasTabs: {
            tabs: [...canvasTabs.tabs, tab],
            activeTabId: tab.tabId,
            mruOrder: [tab.tabId, ...canvasTabs.mruOrder],
          },
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  removeTab: (tabId) =>
    set((state) => {
      if (!state.layout) return state
      const { canvasTabs } = state.layout
      const tab = canvasTabs.tabs.find((t) => t.tabId === tabId)
      if (!tab || tab.pinned) return state
      const newTabs = canvasTabs.tabs.filter((t) => t.tabId !== tabId)
      const newMru = canvasTabs.mruOrder.filter((id) => id !== tabId)
      const newActive = canvasTabs.activeTabId === tabId
        ? (newMru[0] ?? newTabs[0]?.tabId ?? "")
        : canvasTabs.activeTabId
      return {
        layout: {
          ...state.layout,
          canvasTabs: { tabs: newTabs, activeTabId: newActive, mruOrder: newMru },
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  resetLayout: (workspaceId) => set({ layout: createDefaultLayout(workspaceId), isLoading: false }),
}))
