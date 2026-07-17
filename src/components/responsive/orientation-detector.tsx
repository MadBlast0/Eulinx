import * as React from "react"
import { useOrientation } from "@/hooks/useOrientation"
import type { Orientation } from "@/types/design-system"

export interface OrientationDetectorProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  orientation: Orientation | Orientation[]
}

function OrientationDetector({
  children,
  fallback,
  orientation,
}: OrientationDetectorProps) {
  const currentOrientation = useOrientation()

  const matches = React.useMemo(() => {
    const orientations = Array.isArray(orientation) ? orientation : [orientation]
    return orientations.includes(currentOrientation)
  }, [orientation, currentOrientation])

  if (matches) {
    return <>{children}</>
  }

  return <>{fallback ?? null}</>
}

OrientationDetector.displayName = "OrientationDetector"

export { OrientationDetector }
