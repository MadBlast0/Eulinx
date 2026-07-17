import { useEffect, useState } from "react"
import {
  getDeviceType,
  isTouchDevice,
  isReducedMotion,
  isHighContrast,
  getOrientation,
  subscribeOrientation,
} from "@/utils/device"
import type { DeviceType, Orientation } from "@/types/design-system"

export interface DeviceInfo {
  deviceType: DeviceType
  isTouch: boolean
  isReducedMotion: boolean
  isHighContrast: boolean
  orientation: Orientation
}

export function useDevice(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(() => ({
    deviceType: getDeviceType(),
    isTouch: isTouchDevice(),
    isReducedMotion: isReducedMotion(),
    isHighContrast: isHighContrast(),
    orientation: getOrientation(),
  }))

  useEffect(() => {
    const unsubscribeOrientation = subscribeOrientation((orientation) => {
      setInfo((prev) => ({ ...prev, orientation }))
    })

    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handleReducedMotion = (e: MediaQueryListEvent) => {
      setInfo((prev) => ({ ...prev, isReducedMotion: e.matches }))
    }
    reducedMotionMq.addEventListener("change", handleReducedMotion)

    const highContrastMq = window.matchMedia("(prefers-contrast: high)")
    const handleHighContrast = (e: MediaQueryListEvent) => {
      setInfo((prev) => ({ ...prev, isHighContrast: e.matches }))
    }
    highContrastMq.addEventListener("change", handleHighContrast)

    const handleResize = () => {
      setInfo((prev) => ({ ...prev, deviceType: getDeviceType() }))
    }
    window.addEventListener("resize", handleResize, { passive: true })

    return () => {
      unsubscribeOrientation()
      reducedMotionMq.removeEventListener("change", handleReducedMotion)
      highContrastMq.removeEventListener("change", handleHighContrast)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return info
}
