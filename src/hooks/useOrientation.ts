import { useEffect, useState } from "react"
import { getOrientation, subscribeOrientation } from "@/utils/device"
import type { Orientation } from "@/types/design-system"

export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(getOrientation)

  useEffect(() => {
    const unsubscribe = subscribeOrientation(setOrientation)
    return unsubscribe
  }, [])

  return orientation
}
