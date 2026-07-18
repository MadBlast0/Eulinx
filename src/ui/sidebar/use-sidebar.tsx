/**
 * Eulinx Sidebar — provider, context, and collapse state.
 *
 * Owns the client-side view state for the Sidebar: collapse/rail mode,
 * per-section expansion, and the data bundle. The Sidebar is wired into the
 * WorkspaceLayout `sidebar` region; in rail mode the WorkspaceLayout collapses
 * the region and this provider still holds the expansion state so it survives
 * the toggle (Sidebar-Part01 §Invariants: collapse is a width change, never an
 * unmount).
 *
 * Geometry (width) is owned by WorkspaceLayout via the layout store, not here.
 * This provider only owns the rail/expanded toggle and section flags — both
 * Tier 2 view state (Sidebar-Part04).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  SidebarData,
  SidebarRegionMode,
  SidebarSectionId,
  SidebarSectionState,
} from "./sidebar-data"

/** Sidebar-owned layout constants (Sidebar-Part01 §Layout Constants). */
export const SIDEBAR_COLLAPSED_WIDTH = 48
export const SIDEBAR_MIN_WIDTH = 220
export const SIDEBAR_MAX_WIDTH = 480
export const SIDEBAR_DEFAULT_WIDTH = 280
export const SIDEBAR_RESIZE_HANDLE = 4
export const SIDEBAR_SNAP_THRESHOLD = 32
export const TREE_ROW_HEIGHT = 24
export const TREE_OVERSCAN_ROWS = 8
export const TREE_VIRTUALIZE_THRESHOLD = 100
export const TREE_INDENT_PER_DEPTH = 12
export const SEARCH_DEBOUNCE_MS = 180

const DEFAULT_SECTIONS: SidebarSectionState = {
  explorer: true,
  workers: true,
  workflows: true,
  sessions: true,
}

export interface SidebarContextValue {
  readonly mode: SidebarRegionMode
  readonly collapsed: boolean
  readonly data: SidebarData
  /** Per-section expanded flags. */
  readonly sections: SidebarSectionState
  readonly workspaceSwitcherOpen: boolean
  setMode: (mode: SidebarRegionMode) => void
  toggleCollapsed: () => void
  toggleSection: (id: SidebarSectionId) => void
  setWorkspaceSwitcherOpen: (open: boolean) => void
  setData: (data: SidebarData) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export interface SidebarProviderProps {
  readonly children: ReactNode
  readonly data: SidebarData
  readonly initialMode?: SidebarRegionMode
  readonly initialSections?: SidebarSectionState
}

export function SidebarProvider({
  children,
  data,
  initialMode = "expanded",
  initialSections,
}: SidebarProviderProps): ReactNode {
  const [mode, setMode] = useState<SidebarRegionMode>(initialMode)
  const [sections, setSections] = useState<SidebarSectionState>(
    initialSections ?? DEFAULT_SECTIONS,
  )
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false)
  const [liveData, setLiveData] = useState<SidebarData>(data)

  const toggleCollapsed = useCallback(() => {
    setMode((m) => (m === "expanded" ? "rail" : "expanded"))
  }, [])

  const toggleSection = useCallback((id: SidebarSectionId) => {
    setSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const value = useMemo<SidebarContextValue>(
    () => ({
      mode,
      collapsed: mode === "rail",
      data: liveData,
      sections,
      workspaceSwitcherOpen,
      setMode,
      toggleCollapsed,
      toggleSection,
      setWorkspaceSwitcherOpen,
      setData: setLiveData,
    }),
    [
      mode,
      liveData,
      sections,
      workspaceSwitcherOpen,
      toggleCollapsed,
      toggleSection,
    ],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

/** Access the live Sidebar context. Must be used within `<SidebarProvider>`. */
export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (ctx === null) {
    throw new Error("useSidebar must be used within <SidebarProvider>.")
  }
  return ctx
}
