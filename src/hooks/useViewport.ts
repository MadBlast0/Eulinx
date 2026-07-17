import { useEffect, useState } from "react"
import { subscribe, getViewportInfo } from "@/utils/viewport"
import type { ViewportInfo } from "@/types/design-system"

export function useViewport(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>(getViewportInfo)

  useEffect(() => {
    const unsubscribe = subscribe(setInfo)
    return unsubscribe
  }, [])

  return info
}
