import { useEffect, useRef } from "react"

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: (e: MouseEvent) => void,
  enabled = true
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return

    const handleMouseDown = (e: MouseEvent) => {
      const el = ref.current
      if (!el || !(e.target instanceof Node)) return
      if (!el.contains(e.target)) {
        handlerRef.current(e)
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      const el = ref.current
      if (!el || !(e.target instanceof Node)) return
      if (!el.contains(e.target)) {
        handlerRef.current(e as unknown as MouseEvent)
      }
    }

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("touchstart", handleTouchStart, { passive: true })

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("touchstart", handleTouchStart)
    }
  }, [ref, enabled])
}
