import * as React from "react"
import { cn } from "@/utils/cn"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"

interface LazyLoaderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  threshold?: number
  rootMargin?: string
  once?: boolean
  className?: string
  placeholderHeight?: string
}

const defaultFallback = (
  <div className="flex items-center justify-center p-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
  </div>
)

const LazyLoader = React.forwardRef<HTMLDivElement, LazyLoaderProps>(
  (
    {
      children,
      fallback = defaultFallback,
      threshold = 0,
      rootMargin = "200px",
      once = true,
      className,
      placeholderHeight,
    },
    ref
  ) => {
    const sentinelRef = React.useRef<HTMLDivElement>(null)
    const [hasBeenVisible, setHasBeenVisible] = React.useState(false)
    const isIntersecting = useIntersectionObserver(
      sentinelRef,
      { threshold, rootMargin }
    )

    const isVisible = once ? isIntersecting || hasBeenVisible : isIntersecting

    React.useEffect(() => {
      if (isIntersecting && once) {
        setHasBeenVisible(true)
      }
    }, [isIntersecting, once])

    return (
      <div ref={ref} className={cn("relative", className)}>
        <div ref={sentinelRef} className="absolute inset-0 pointer-events-none" />

        {isVisible ? (
          children
        ) : (
          <div
            className="flex items-center justify-center"
            style={placeholderHeight ? { height: placeholderHeight } : undefined}
          >
            {fallback}
          </div>
        )}
      </div>
    )
  }
)
LazyLoader.displayName = "LazyLoader"

export { LazyLoader }
export type { LazyLoaderProps }
