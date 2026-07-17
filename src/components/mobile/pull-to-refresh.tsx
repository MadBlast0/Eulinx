import * as React from "react"
import { cn } from "@/utils/cn"
import { useDevice } from "@/hooks/useDevice"

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  threshold?: number
  className?: string
  loadingText?: string
  pullText?: string
  releaseText?: string
}

type PullState = "idle" | "pulling" | "threshold" | "refreshing"

const PullToRefresh = React.forwardRef<HTMLDivElement, PullToRefreshProps>(
  (
    {
      onRefresh,
      children,
      threshold = 60,
      className,
      loadingText = "Refreshing...",
      pullText = "Pull to refresh",
      releaseText = "Release to refresh",
    },
    ref
  ) => {
    const { isTouch } = useDevice()
    const [pullState, setPullState] = React.useState<PullState>("idle")
    const [pullDistance, setPullDistance] = React.useState(0)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const startYRef = React.useRef(0)
    const pullingRef = React.useRef(false)
    const refreshingRef = React.useRef(false)

    const indicatorHeight = Math.min(pullDistance, threshold + 20)

    function applyFriction(distance: number): number {
      if (distance <= threshold) return distance
      return threshold + (distance - threshold) * 0.3
    }

    function handleTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return
      const scrollTop = containerRef.current?.scrollTop ?? 0
      if (scrollTop > 0) return
      const touch = e.touches[0]
      if (!touch) return
      startYRef.current = touch.clientY
      pullingRef.current = true
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pullingRef.current || refreshingRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      const dy = touch.clientY - startYRef.current
      if (dy <= 0) {
        setPullDistance(0)
        setPullState("idle")
        return
      }
      e.preventDefault()
      const distance = applyFriction(dy)
      setPullDistance(distance)
      setPullState(distance >= threshold ? "threshold" : "pulling")
    }

    async function handleTouchEnd() {
      if (!pullingRef.current || refreshingRef.current) return
      pullingRef.current = false
      if (pullDistance >= threshold) {
        setPullState("refreshing")
        refreshingRef.current = true
        try {
          await onRefresh()
        } finally {
          refreshingRef.current = false
          setPullState("idle")
          setPullDistance(0)
        }
      } else {
        setPullState("idle")
        setPullDistance(0)
      }
    }

    React.useEffect(() => {
      if (!isTouch) return
      const el = containerRef.current
      if (!el) return
      el.addEventListener("touchstart", handleTouchStart, { passive: true })
      el.addEventListener("touchmove", handleTouchMove, { passive: false })
      el.addEventListener("touchend", handleTouchEnd, { passive: true })
      el.addEventListener("touchcancel", handleTouchEnd, { passive: true })
      return () => {
        el.removeEventListener("touchstart", handleTouchStart)
        el.removeEventListener("touchmove", handleTouchMove)
        el.removeEventListener("touchend", handleTouchEnd)
        el.removeEventListener("touchcancel", handleTouchEnd)
      }
    }, [isTouch, pullDistance, threshold, onRefresh])

    return (
      <div ref={ref} className={cn("relative overflow-hidden", className)}>
        <div
          ref={containerRef}
          className="relative max-h-full overflow-auto"
          style={{ overscrollBehavior: isTouch ? "contain" : undefined }}
        >
          <div
            className="pointer-events-none absolute left-0 right-0 z-50 flex items-center justify-center transition-[transform,opacity] duration-200 ease-out"
            style={{
              top: 0,
              height: `${indicatorHeight}px`,
              transform: `translateY(${indicatorHeight > 0 ? 0 : -100}%)`,
              opacity: pullState !== "idle" ? 1 : 0,
            }}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {pullState === "refreshing" ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{loadingText}</span>
                </>
              ) : (
                <>
                  <svg
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      pullState === "threshold" && "rotate-180"
                    )}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                  <span>
                    {pullState === "threshold" ? releaseText : pullText}
                  </span>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              transform: `translateY(${indicatorHeight}px)`,
              transition:
                pullState === "pulling"
                  ? "none"
                  : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    )
  }
)
PullToRefresh.displayName = "PullToRefresh"

export { PullToRefresh }
export type { PullToRefreshProps }
