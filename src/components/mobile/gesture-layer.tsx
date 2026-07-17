import * as React from "react"
import { cn } from "@/utils/cn"

interface GestureLayerProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
  threshold?: number
  className?: string
  children: React.ReactNode
  disabled?: boolean
}

const GestureLayer = React.forwardRef<HTMLDivElement, GestureLayerProps>(
  (
    {
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onTap,
      onDoubleTap,
      onLongPress,
      threshold = 50,
      className,
      children,
      disabled = false,
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLDivElement>(null)
    const startXRef = React.useRef(0)
    const startYRef = React.useRef(0)
    const movedRef = React.useRef(false)
    const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const lastTapRef = React.useRef(0)
    const longPressFiredRef = React.useRef(false)

    React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement, [])

    function clearLongPress() {
      if (longPressTimerRef.current !== undefined) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = undefined
      }
    }

    function handleTouchStart(e: TouchEvent) {
      if (disabled) return
      const touch = e.touches[0]
      if (!touch) return
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      movedRef.current = false
      longPressFiredRef.current = false

      if (onLongPress) {
        clearLongPress()
        longPressTimerRef.current = setTimeout(() => {
          longPressFiredRef.current = true
          onLongPress()
        }, 500)
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (disabled || longPressFiredRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      const dx = touch.clientX - startXRef.current
      const dy = touch.clientY - startYRef.current
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        movedRef.current = true
        clearLongPress()
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (disabled) return
      clearLongPress()

      if (longPressFiredRef.current) {
        longPressFiredRef.current = false
        return
      }

      if (movedRef.current) {
        const touch = e.changedTouches[0]
        if (!touch) return
        const dx = touch.clientX - startXRef.current
        const dy = touch.clientY - startYRef.current
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        if (Math.max(absDx, absDy) < threshold) {
          if (onTap) onTap()
          return
        }

        if (absDx > absDy) {
          if (dx > 0) onSwipeRight?.()
          else onSwipeLeft?.()
        } else {
          if (dy > 0) onSwipeDown?.()
          else onSwipeUp?.()
        }
      } else {
        const now = Date.now()
        if (onDoubleTap && now - lastTapRef.current < 300) {
          onDoubleTap()
          lastTapRef.current = 0
        } else {
          lastTapRef.current = now
          if (onTap && !onDoubleTap) onTap()
        }
      }
    }

    React.useEffect(() => {
      if (disabled) return
      const el = internalRef.current
      if (!el) return

      el.addEventListener("touchstart", handleTouchStart, { passive: true })
      el.addEventListener("touchmove", handleTouchMove, { passive: true })
      el.addEventListener("touchend", handleTouchEnd, { passive: true })
      el.addEventListener("touchcancel", handleTouchEnd, { passive: true })

      return () => {
        el.removeEventListener("touchstart", handleTouchStart)
        el.removeEventListener("touchmove", handleTouchMove)
        el.removeEventListener("touchend", handleTouchEnd)
        el.removeEventListener("touchcancel", handleTouchEnd)
        clearLongPress()
      }
    }, [disabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, onLongPress])

    return (
      <div ref={internalRef} className={cn(className)}>
        {children}
      </div>
    )
  }
)
GestureLayer.displayName = "GestureLayer"

export { GestureLayer }
export type { GestureLayerProps }
