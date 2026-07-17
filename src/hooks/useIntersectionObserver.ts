import { useEffect, useRef, useState } from "react"

export function useIntersectionObserver<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options?: IntersectionObserverInit,
  cb?: (entry: IntersectionObserverEntry) => void
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const cbRef = useRef(cb)
  cbRef.current = cb

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      setIsIntersecting(entry.isIntersecting)
      cbRef.current?.(entry)
    }, options)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, options])

  return isIntersecting
}
