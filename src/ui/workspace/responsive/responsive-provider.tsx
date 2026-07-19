import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  breakpointForWidth,
  isWindowTooSmall,
  type Breakpoint,
} from "./breakpoints"
import { computeCollapsePlan, type CollapsePlan } from "./collapse-orchestrator"

export interface ResponsiveState {
  breakpoint: Breakpoint
  width: number
  height: number
  tooSmall: boolean
  collapsePlan: CollapsePlan
}

const ResponsiveContext = createContext<ResponsiveState | null>(null)

function getWindowSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 0, height: 0 }
  return { width: window.innerWidth, height: window.innerHeight }
}

export interface ResponsiveProviderProps {
  children: ReactNode
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  const [size, setSize] = useState<{ width: number; height: number }>(getWindowSize)

  useEffect(() => {
    if (typeof window === "undefined") return

    let frame = 0

    const handleResize = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setSize({ width: window.innerWidth, height: window.innerHeight })
      })
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [])

  const value = useMemo<ResponsiveState>(() => {
    const { width, height } = size
    return {
      width,
      height,
      breakpoint: breakpointForWidth(width),
      tooSmall: isWindowTooSmall(width, height),
      collapsePlan: computeCollapsePlan(width),
    }
  }, [size])

  return (
    <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>
  )
}

export function useResponsive(): ResponsiveState {
  const ctx = useContext(ResponsiveContext)
  if (ctx === null) {
    throw new Error("useResponsive must be used within a ResponsiveProvider")
  }
  return ctx
}
