import { useEffect, useRef, useCallback } from "react"

export interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useSwipe<T extends HTMLElement>(
  handlers: SwipeHandlers,
  threshold = 50
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    startX.current = touch.clientX
    startY.current = touch.clientY
  }, [])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      if (!touch) return

      const dx = touch.clientX - startX.current
      const dy = touch.clientY - startY.current
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (Math.max(absDx, absDy) < threshold) return

      if (absDx > absDy) {
        if (dx > 0) {
          handlersRef.current.onSwipeRight?.()
        } else {
          handlersRef.current.onSwipeLeft?.()
        }
      } else {
        if (dy > 0) {
          handlersRef.current.onSwipeDown?.()
        } else {
          handlersRef.current.onSwipeUp?.()
        }
      }
    },
    [threshold]
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.addEventListener("touchstart", handleTouchStart, { passive: true })
    el.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchend", handleTouchEnd)
    }
  }, [ref, handleTouchStart, handleTouchEnd])

  return ref
}
