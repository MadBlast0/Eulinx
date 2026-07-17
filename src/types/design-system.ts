export type ViewportSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
export type DeviceType = "mobile" | "tablet" | "desktop"
export type Orientation = "portrait" | "landscape"
export type Breakpoint = 320 | 480 | 640 | 768 | 1024 | 1280 | 1536
export type ThemeMode = "light" | "dark" | "system"
export type Direction = "ltr" | "rtl"
export type Placement = "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end" | "right-start" | "right-end"
export type Size = "xs" | "sm" | "md" | "lg" | "xl"
export type ColorScheme = "primary" | "secondary" | "destructive" | "success" | "warning" | "info" | "muted" | "accent"

export interface ViewportInfo {
  width: number
  height: number
  size: ViewportSize
  device: DeviceType
  orientation: Orientation
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLandscape: boolean
  isPortrait: boolean
  safeAreaTop: number
  safeAreaBottom: number
  safeAreaLeft: number
  safeAreaRight: number
  scale: number
}

export interface CollisionBoundary {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PlacementResult {
  placement: Placement
  style: React.CSSProperties
  collision: boolean
}
