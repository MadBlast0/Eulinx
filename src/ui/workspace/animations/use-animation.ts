import { useEffect, useState } from "react"

export const DURATIONS = {
  hover: "var(--Eulinx-duration-hover)",
  button: "var(--Eulinx-duration-button)",
  card: "var(--Eulinx-duration-card)",
  navigation: "var(--Eulinx-duration-navigation)",
  dialog: "var(--Eulinx-duration-dialog)",
  page: "var(--Eulinx-duration-page)",
} as const

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function getInitialReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(getInitialReducedMotion)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    setReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  return reducedMotion
}

export interface UseAnimationOptions {
  duration?: keyof typeof DURATIONS
  disabled?: boolean
}

export interface AnimationResult {
  className: string
  style: React.CSSProperties
}

export function useAnimation(opts?: UseAnimationOptions): AnimationResult {
  const { duration = "button", disabled = false } = opts ?? {}
  const reducedMotion = usePrefersReducedMotion()

  if (disabled || reducedMotion) {
    return { className: "", style: {} }
  }

  return {
    className: "transition-[background-color,border-color,color]",
    style: {
      transitionDuration: DURATIONS[duration],
      transitionTimingFunction: "var(--Eulinx-ease-standard)",
    },
  }
}
