import type { ViewportInfo, ViewportSize, DeviceType } from "@/types/design-system"
import { BREAKPOINTS, DEVICE_BREAKPOINTS, VIEWPORT_SIZE_ORDER } from "@/constants/viewport"

const DEFAULT_VIEWPORT_INFO: ViewportInfo = {
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

type Subscriber = (info: ViewportInfo) => void

let subscribers: Set<Subscriber> | null = null
let rafId: number | null = null
let currentInfo: ViewportInfo | null = null

function readSafeArea(property: string): number {
  try {
    const el = document.createElement("div")
    el.style.position = "fixed"
    el.style.top = "0"
    el.style.left = "0"
    el.style.width = "100%"
    el.style.paddingTop = `env(${property}, 0px)`
    document.body.appendChild(el)
    const value = parseFloat(getComputedStyle(el).paddingTop)
    document.body.removeChild(el)
    return isNaN(value) ? 0 : value
  } catch {
    return 0
  }
}

function readSafeAreas(): Pick<ViewportInfo, "safeAreaTop" | "safeAreaBottom" | "safeAreaLeft" | "safeAreaRight"> {
  return {
    safeAreaTop: readSafeArea("safe-area-inset-top"),
    safeAreaBottom: readSafeArea("safe-area-inset-bottom"),
    safeAreaLeft: readSafeArea("safe-area-inset-left"),
    safeAreaRight: readSafeArea("safe-area-inset-right"),
  }
}

export function getBreakpoint(width: number): ViewportSize {
  for (const size of VIEWPORT_SIZE_ORDER) {
    if (width <= BREAKPOINTS[size]) {
      return size
    }
  }
  return "2xl"
}

export function getDeviceType(width: number): DeviceType {
  if (width <= DEVICE_BREAKPOINTS.mobile) return "mobile"
  if (width <= DEVICE_BREAKPOINTS.tablet) return "tablet"
  return "desktop"
}

export function getViewportInfo(): ViewportInfo {
  if (typeof window === "undefined") return DEFAULT_VIEWPORT_INFO

  const width = window.innerWidth
  const height = window.innerHeight
  const size = getBreakpoint(width)
  const device = getDeviceType(width)
  const orientation: "portrait" | "landscape" = height > width ? "portrait" : "landscape"
  const { safeAreaTop, safeAreaBottom, safeAreaLeft, safeAreaRight } = readSafeAreas()

  return {
    width,
    height,
    size,
    device,
    orientation,
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
    isLandscape: orientation === "landscape",
    isPortrait: orientation === "portrait",
    safeAreaTop,
    safeAreaBottom,
    safeAreaLeft,
    safeAreaRight,
    scale: window.devicePixelRatio || 1,
  }
}

function notifySubscribers(info: ViewportInfo): void {
  currentInfo = info
  if (subscribers) {
    for (const cb of subscribers) {
      try {
        cb(info)
      } catch {
        /* swallow subscriber errors */
      }
    }
  }
}

function handleResize(): void {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    notifySubscribers(getViewportInfo())
  })
}

export function subscribe(cb: (info: ViewportInfo) => void): () => void {
  if (!subscribers) {
    subscribers = new Set()
    window.addEventListener("resize", handleResize, { passive: true })
    window.addEventListener("orientationchange", handleResize, { passive: true })
  }

  subscribers.add(cb)

  if (currentInfo) {
    try {
      cb(currentInfo)
    } catch {
      /* swallow */
    }
  }

  return () => {
    if (!subscribers) return
    subscribers.delete(cb)
    if (subscribers.size === 0) {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      subscribers = null
      currentInfo = null
    }
  }
}
