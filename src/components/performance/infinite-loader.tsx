import * as React from "react"
import { cn } from "@/utils/cn"
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"

interface InfiniteLoaderProps {
  onLoadMore: () => void | Promise<void>
  hasMore: boolean
  loader?: React.ReactNode
  endMessage?: string | React.ReactNode
  threshold?: number
  className?: string
  children: React.ReactNode
  disabled?: boolean
}

const defaultLoader = (
  <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    <span>Loading more...</span>
  </div>
)

const InfiniteLoader = React.forwardRef<HTMLDivElement, InfiniteLoaderProps>(
  (
    {
      onLoadMore,
      hasMore,
      loader = defaultLoader,
      endMessage,
      threshold = 0,
      className,
      children,
      disabled = false,
    },
    ref
  ) => {
    const sentinelRef = React.useRef<HTMLDivElement>(null)
    const isLoadingRef = React.useRef(false)
    const isIntersecting = useIntersectionObserver(
      sentinelRef,
      { threshold, rootMargin: "100px" }
    )

    React.useEffect(() => {
      if (!isIntersecting || !hasMore || disabled || isLoadingRef.current) return
      isLoadingRef.current = true
      const result = onLoadMore()
      if (result instanceof Promise) {
        result.finally(() => {
          isLoadingRef.current = false
        })
      } else {
        isLoadingRef.current = false
      }
    }, [isIntersecting, hasMore, disabled, onLoadMore])

    return (
      <div ref={ref} className={cn(className)}>
        {children}
        <div ref={sentinelRef} className="h-px" />
        {hasMore && loader}
        {!hasMore && endMessage && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {typeof endMessage === "string" ? endMessage : endMessage}
          </div>
        )}
      </div>
    )
  }
)
InfiniteLoader.displayName = "InfiniteLoader"

export { InfiniteLoader }
export type { InfiniteLoaderProps }
