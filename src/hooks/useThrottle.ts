import { useEffect, useRef, useState } from "react"

export function useThrottle<T>(value: T, delay = 300): T {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const remaining = delay - (Date.now() - lastRan.current)

    if (remaining <= 0) {
      setThrottledValue(value)
      lastRan.current = Date.now()
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }, remaining)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [value, delay])

  return throttledValue
}
