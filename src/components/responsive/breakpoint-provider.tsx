import * as React from "react"
import { useViewportContext } from "@/providers/ViewportProvider"
import { BREAKPOINTS } from "@/constants/viewport"
import type { ViewportSize } from "@/types/design-system"

interface BreakpointContextValue {
  isAbove: (size: ViewportSize) => boolean
  isBelow: (size: ViewportSize) => boolean
  between: (min: ViewportSize, max: ViewportSize) => boolean
  currentWidth: number
  currentSize: ViewportSize
}

const BreakpointContext = React.createContext<BreakpointContextValue | null>(null)

export interface BreakpointProviderProps {
  children: React.ReactNode
}

function BreakpointProvider({ children }: BreakpointProviderProps) {
  const viewport = useViewportContext()

  const value = React.useMemo<BreakpointContextValue>(() => ({
    isAbove: (size: ViewportSize) => {
      const breakpoint = BREAKPOINTS[size]
      if (breakpoint === undefined) return false
      return viewport.width > breakpoint
    },
    isBelow: (size: ViewportSize) => {
      const breakpoint = BREAKPOINTS[size]
      if (breakpoint === undefined) return false
      return viewport.width < breakpoint
    },
    between: (min: ViewportSize, max: ViewportSize) => {
      const minBp = BREAKPOINTS[min]
      const maxBp = BREAKPOINTS[max]
      if (minBp === undefined || maxBp === undefined) return false
      return viewport.width >= minBp && viewport.width <= maxBp
    },
    currentWidth: viewport.width,
    currentSize: viewport.size,
  }), [viewport.width, viewport.size])

  return (
    <BreakpointContext.Provider value={value}>
      {children}
    </BreakpointContext.Provider>
  )
}

BreakpointProvider.displayName = "BreakpointProvider"

function useResponsiveContext(): BreakpointContextValue {
  const ctx = React.useContext(BreakpointContext)
  if (ctx === null) {
    throw new Error("useResponsiveContext must be used within a BreakpointProvider")
  }
  return ctx
}

export { BreakpointProvider, useResponsiveContext }
