import type { Breakpoint, ViewportSize, DeviceType, ViewportInfo } from "@/types/design-system"

export const BREAKPOINTS: Record<ViewportSize, Breakpoint> = {
  xs: 320,
  sm: 480,
  md: 640,
  lg: 768,
  xl: 1024,
  "2xl": 1280,
} as const

export const DEVICE_BREAKPOINTS: Record<DeviceType, Breakpoint> = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
} as const

export const VIEWPORT_SIZE_ORDER: ViewportSize[] = ["xs", "sm", "md", "lg", "xl", "2xl"]

export const DEFAULT_VIEWPORT: ViewportInfo = {
  width: 1024,
  height: 768,
  size: "lg",
  device: "desktop",
  orientation: "landscape",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isLandscape: true,
  isPortrait: false,
  safeAreaTop: 0,
  safeAreaBottom: 0,
  safeAreaLeft: 0,
  safeAreaRight: 0,
  scale: 1,
}
