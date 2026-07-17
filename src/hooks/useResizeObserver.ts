import { useEffect, useRef } from "react"

export function useResizeObserver<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  cb: (entry: ResizeObserverEntry) => void
): void {
  const cbRef = useRef(cb)
  cbRef.current = cb

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        cbRef.current(entry)
      }
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref])
}
