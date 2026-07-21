import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type RegionId = "titleBar" | "sidebar" | "canvas" | "inspector" | "panel" | "statusBar"

export interface RegionState {
  readonly id: RegionId
  readonly size: number
  readonly minSize: number
  readonly maxSize: number
  readonly defaultSize: number
  readonly collapsed: boolean
  readonly collapsible: boolean
}

export interface LayoutState {
  readonly regions: Record<RegionId, RegionState>
  readonly schema: number
}

export const DEFAULT_LAYOUT: LayoutState = {
  regions: {
    titleBar: {
      id: "titleBar",
      size: 48,
      minSize: 40,
      maxSize: 72,
      defaultSize: 48,
      collapsed: false,
      collapsible: false,
    },
    sidebar: {
      id: "sidebar",
      size: 280,
      minSize: 200,
      maxSize: 500,
      defaultSize: 280,
      collapsed: false,
      collapsible: true,
    },
    canvas: {
      id: "canvas",
      size: 0,
      minSize: 0,
      maxSize: 0,
      defaultSize: 0,
      collapsed: false,
      collapsible: false,
    },
    inspector: {
      id: "inspector",
      size: 320,
      minSize: 240,
      maxSize: 600,
      defaultSize: 320,
      collapsed: false,
      collapsible: true,
    },
    panel: {
      id: "panel",
      size: 200,
      minSize: 100,
      maxSize: 500,
      defaultSize: 200,
      collapsed: false,
      collapsible: true,
    },
    statusBar: {
      id: "statusBar",
      size: 28,
      minSize: 24,
      maxSize: 40,
      defaultSize: 28,
      collapsed: false,
      collapsible: false,
    },
  },
  schema: 1,
}

export type FocusRegion = RegionId

interface LayoutContextValue {
  readonly layout: LayoutState
  readonly focusedRegion: FocusRegion
  setRegionSize(id: RegionId, size: number): void
  toggleRegion(id: RegionId): void
  resetLayout(): void
  bulkSetLayout(l: LayoutState): void
  setFocusedRegion(region: FocusRegion): void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT)
  const [focusedRegion, setFocusedRegion] = useState<FocusRegion>("canvas")

  const setRegionSize = useCallback((id: RegionId, size: number) => {
    setLayout((prev) => {
      const region = prev.regions[id]
      if (!region || !region.collapsible) return prev
      const clamped = Math.max(region.minSize, Math.min(region.maxSize, size))
      return {
        ...prev,
        regions: {
          ...prev.regions,
          [id]: { ...region, size: clamped, collapsed: false },
        },
      }
    })
  }, [])

  const toggleRegion = useCallback((id: RegionId) => {
    setLayout((prev) => {
      const region = prev.regions[id]
      if (!region || !region.collapsible) return prev
      return {
        ...prev,
        regions: {
          ...prev.regions,
          [id]: { ...region, collapsed: !region.collapsed },
        },
      }
    })
  }, [])

  const reset = useCallback(() => {
    setLayout(DEFAULT_LAYOUT)
  }, [])

  const bulkSet = useCallback((l: LayoutState) => {
    setLayout(l)
  }, [])

  const value = useMemo<LayoutContextValue>(
    () => ({
      layout,
      focusedRegion,
      setRegionSize,
      toggleRegion,
      resetLayout: reset,
      bulkSetLayout: bulkSet,
      setFocusedRegion,
    }),
    [layout, focusedRegion, setRegionSize, toggleRegion, reset, bulkSet],
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider")
  return ctx
}
