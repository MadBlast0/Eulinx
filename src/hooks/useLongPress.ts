import { useEffect, useRef, useCallback } from "react"

export interface UseLongPressOptions {
  threshold?: number
  enabled?: boolean
}

export function useLongPress<T extends HTMLElement>(
  handler: (e: TouchEvent | MouseEvent) => void,
  options: UseLongPressOptions = {}
): React.RefObject<T | null> {
  const { threshold = 500, enabled = true } = options
  const ref = useRef<T | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const isLongPress = useRef(false)

  const start = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!enabled) return
      isLongPress.current = false
      timerRef.current = setTimeout(() => {
        isLongPress.current = true
        handlerRef.current(e)
      }, threshold)
    },
    [enabled, threshold]
  )

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  const move = useCallback(() => {
    if (isLongPress.current) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.addEventListener("mousedown", start)
    el.addEventListener("touchstart", start, { passive: true })
    el.addEventListener("mouseup", end)
    el.addEventListener("touchend", end)
    el.addEventListener("mouseleave", end)
    el.addEventListener("mousemove", move)
    el.addEventListener("touchmove", move, { passive: true })

    return () => {
      el.removeEventListener("mousedown", start)
      el.removeEventListener("touchstart", start)
      el.removeEventListener("mouseup", end)
      el.removeEventListener("touchend", end)
      el.removeEventListener("mouseleave", end)
      el.removeEventListener("mousemove", move)
      el.removeEventListener("touchmove", move)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [ref, start, end, move])

  return ref
}
