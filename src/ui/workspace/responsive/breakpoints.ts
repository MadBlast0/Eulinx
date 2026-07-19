export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl"

export const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const

export const MIN_WINDOW_SIZE = { w: 720, h: 480 } as const

export function isWindowTooSmall(width: number, height: number): boolean {
  return width < MIN_WINDOW_SIZE.w || height < MIN_WINDOW_SIZE.h
}

export const BREAKPOINT_ORDER: readonly Breakpoint[] = ["xs", "sm", "md", "lg", "xl"]

export function breakpointForWidth(width: number): Breakpoint {
  let current: Breakpoint = "xs"
  for (const bp of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[bp]) {
      current = bp
    }
  }
  return current
}
