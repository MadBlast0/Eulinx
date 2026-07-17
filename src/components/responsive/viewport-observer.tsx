import * as React from "react"
import { cn } from "@/utils/cn"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"

export interface ViewportObserverProps {
  onEnter?: () => void
  onLeave?: () => void
  threshold?: number
  once?: boolean
  children: React.ReactNode
  className?: string
}

function ViewportObserver({
  onEnter,
  onLeave,
  threshold = 0,
  once = false,
  children,
  className,
}: ViewportObserverProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const hasFiredRef = React.useRef(false)

  const isIntersecting = useIntersectionObserver(
    ref,
    { threshold },
    (entry) => {
      if (once && hasFiredRef.current) return

      if (entry.isIntersecting) {
        hasFiredRef.current = true
        onEnter?.()
      } else {
        onLeave?.()
      }
    }
  )

  return (
    <div
      ref={ref}
      className={cn(className)}
      data-intersecting={isIntersecting}
    >
      {children}
    </div>
  )
}

ViewportObserver.displayName = "ViewportObserver"

export { ViewportObserver }
