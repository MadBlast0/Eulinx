import { useEffect } from "react"

let lockCount = 0
let originalOverflow = ""
let originalPaddingRight = ""

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    if (typeof document === "undefined") return

    lockCount++

    if (lockCount === 1) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      originalOverflow = document.body.style.overflow
      originalPaddingRight = document.body.style.paddingRight
      document.body.style.overflow = "hidden"
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    }

    return () => {
      lockCount--
      if (lockCount <= 0) {
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
        originalOverflow = ""
        originalPaddingRight = ""
        lockCount = 0
      }
    }
  }, [active])
}
