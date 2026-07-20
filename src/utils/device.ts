import type { DeviceType, Orientation } from \"@/types/design-system\"
import { DEVICE_BREAKPOINTS } from \"@/constants/viewport\"

type OrientationSubscriber = (o: Orientation) => void

let orientationSubscribers: Set<OrientationSubscriber> | null = null

export function getDeviceType(): DeviceType {
  const ua = navigator.userAgent
  const isMobileUA = /Mobile|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isTabletUA = /Tablet|iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
  const width = window.innerWidth

  if (isTabletUA) return \"tablet\"
  if (isMobileUA) return \"mobile\"
  if (width <= DEVICE_BREAKPOINTS.mobile) return \"mobile\"
  if (width <= DEVICE_BREAKPOINTS.tablet) return \"tablet\"
  return \"desktop\"
}

export function isTouchDevice(): boolean {
  return \"ontouchstart\" in window || navigator.maxTouchPoints > 0
}

export function isReducedMotion(): boolean {
  try {
    return window.matchMedia(\"(prefers-reduced-motion: reduce)\").matches
  } catch {
    console.warn(\"eulinx: matchMedia not available for reduced-motion check\")
    return false
  }
}

export function isHighContrast(): boolean {
  try {
    return window.matchMedia(\"(prefers-contrast: high)\").matches
  } catch {
    console.warn(\"eulinx: matchMedia not available for high-contrast check\")
    return false
  }
}

export function getOrientation(): Orientation {
  if (typeof screen === \"undefined\") return \"landscape\"

  try {
    const angle = screen.orientation?.angle ?? 0
    return angle === 0 || angle === 180 ? \"portrait\" : \"landscape\"
  } catch {
    console.warn(\"eulinx: screen.orientation not available, falling back to dimension check\")
    return window.innerHeight > window.innerWidth ? \"portrait\" : \"landscape\"
  }
}

function handleOrientationChange(): void {
  if (!orientationSubscribers) return
  const o = getOrientation()
  for (const cb of orientationSubscribers) {
    try {
      cb(o)
    } catch {
      console.warn(\"eulinx: orientation subscriber threw during notification\")
    }
  }
}

export function subscribeOrientation(cb: (o: Orientation) => void): () => void {
  if (!orientationSubscribers) {
    orientationSubscribers = new Set()
    window.addEventListener(\"orientationchange\", handleOrientationChange, { passive: true })
  }

  orientationSubscribers.add(cb)

  try {
    cb(getOrientation())
  } catch {
    console.warn(\"eulinx: orientation subscriber threw during initial callback\")
  }

  return () => {
    if (!orientationSubscribers) return
    orientationSubscribers.delete(cb)
    if (orientationSubscribers.size === 0) {
      window.removeEventListener(\"orientationchange\", handleOrientationChange)
      orientationSubscribers = null
    }
  }
}
