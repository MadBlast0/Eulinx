import * as React from "react"
import { cn } from "@/utils/cn"

interface SwipeAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: "default" | "destructive" | "primary"
}

interface SwipeActionsProps {
  children: React.ReactNode
  actions: SwipeAction[]
  side?: "left" | "right" | "both"
  threshold?: number
  className?: string
}

const actionVariantStyles: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  primary: "bg-primary text-primary-foreground",
}

const SwipeActions = React.forwardRef<HTMLDivElement, SwipeActionsProps>(
  ({ children, actions, side = "right", threshold = 80, className }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [translateX, setTranslateX] = React.useState(0)
    const [isRevealed, setIsRevealed] = React.useState(false)
    const startXRef = React.useRef(0)
    const swipingRef = React.useRef(false)

    const rightActions =
      side === "right" || side === "both" ? actions : []
    const leftActions =
      side === "left" || side === "both" ? actions : []

    const leftActionWidth = leftActions.length * 64
    const rightActionWidth = rightActions.length * 64

    const maxTranslateLeft = rightActionWidth
    const maxTranslateRight = -leftActionWidth

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      if (!touch) return
      startXRef.current = touch.clientX
      swipingRef.current = true
    }

    function handleTouchMove(e: TouchEvent) {
      if (!swipingRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      const dx = touch.clientX - startXRef.current
      const absDx = Math.abs(dx)
      if (absDx < 10) return
      e.preventDefault()

      let newTranslate: number
      if (isRevealed) {
        newTranslate = translateX + dx * 0.5
        if (translateX > 0) {
          newTranslate = Math.min(maxTranslateLeft, Math.max(0, newTranslate))
        } else {
          newTranslate = Math.max(-maxTranslateRight, Math.min(0, newTranslate))
        }
      } else {
        const rawDx = dx * 0.5
        newTranslate =
          rawDx > 0
            ? Math.min(maxTranslateLeft, Math.max(0, rawDx))
            : Math.max(-maxTranslateRight, Math.min(0, rawDx))
      }
      setTranslateX(newTranslate)
      startXRef.current = touch.clientX
    }

    function handleTouchEnd() {
      swipingRef.current = false
      if (translateX > threshold) {
        setTranslateX(maxTranslateLeft)
        setIsRevealed(true)
      } else if (translateX < -threshold) {
        setTranslateX(-maxTranslateRight)
        setIsRevealed(true)
      } else {
        setTranslateX(0)
        setIsRevealed(false)
      }
    }

    React.useEffect(() => {
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
    }, [translateX, threshold, maxTranslateLeft, maxTranslateRight, isRevealed])

    function close() {
      setTranslateX(0)
      setIsRevealed(false)
    }

    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden", className)}
      >
        <div
          ref={containerRef}
          className="relative touch-pan-y"
        >
          {leftActions.length > 0 && (
            <div className="absolute inset-y-0 right-full flex">
              {leftActions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    action.onClick()
                    close()
                  }}
                  className={cn(
                    "flex w-16 flex-col items-center justify-center gap-1 p-2 text-xs font-medium",
                    actionVariantStyles[action.variant ?? "default"]
                  )}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {rightActions.length > 0 && (
            <div className="absolute inset-y-0 left-full flex">
              {rightActions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    action.onClick()
                    close()
                  }}
                  className={cn(
                    "flex w-16 flex-col items-center justify-center gap-1 p-2 text-xs font-medium",
                    actionVariantStyles[action.variant ?? "default"]
                  )}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          <div
            className="relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              transform: `translateX(${translateX}px)`,
              transition: swipingRef.current ? "none" : undefined,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    )
  }
)
SwipeActions.displayName = "SwipeActions"

export { SwipeActions }
export type { SwipeActionsProps, SwipeAction }
