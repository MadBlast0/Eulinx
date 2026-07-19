import { type RefObject, useEffect, useState } from "react"
import { breakpointForWidth, type Breakpoint } from "./breakpoints"

function getWindowWidth(): number {
  if (typeof window === "undefined") return 0
  return window.innerWidth
}

/**
 * Tracks the current viewport breakpoint, updating on resize (debounced via rAF).
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    breakpointForWidth(getWindowWidth()),
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    let frame = 0

    const handleResize = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setBreakpoint(breakpointForWidth(window.innerWidth))
      })
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [])

  return breakpoint
}

/**
 * Returns true when the referenced element's width meets or exceeds `width`.
 */
export function useContainerQuery(ref: RefObject<Element | null>, width: number): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !ref.current) return false
    return ref.current.getBoundingClientRect().width >= width
  })

  useEffect(() => {
    const element = ref.current
    if (typeof window === "undefined" || !element || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const current = entry.contentRect.width
      setMatches(current >= width)
    })

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [ref, width])

  return matches
}
