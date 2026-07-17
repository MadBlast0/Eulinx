import * as React from "react"
import { useViewportContext } from "@/providers/ViewportProvider"
import type { DeviceType, ViewportSize } from "@/types/design-system"

export interface DeviceDetectorProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  device?: DeviceType | DeviceType[]
  viewport?: ViewportSize | ViewportSize[]
}

function DeviceDetector({
  children,
  fallback,
  device,
  viewport,
}: DeviceDetectorProps) {
  const viewportInfo = useViewportContext()

  const matchesDevice = React.useMemo(() => {
    if (device === undefined) return true
    const devices = Array.isArray(device) ? device : [device]
    return devices.includes(viewportInfo.device)
  }, [device, viewportInfo.device])

  const matchesViewport = React.useMemo(() => {
    if (viewport === undefined) return true
    const sizes = Array.isArray(viewport) ? viewport : [viewport]
    return sizes.includes(viewportInfo.size)
  }, [viewport, viewportInfo.size])

  if (matchesDevice && matchesViewport) {
    return <>{children}</>
  }

  return <>{fallback ?? null}</>
}

DeviceDetector.displayName = "DeviceDetector"

export { DeviceDetector }
