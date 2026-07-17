import * as React from "react"
import { cn } from "@/utils/cn"

interface VirtualScrollerProps {
  items: unknown[]
  itemHeight: number
  renderItem: (item: unknown, index: number) => React.ReactNode
  overscan?: number
  className?: string
  containerHeight?: string
}

const VirtualScroller = React.forwardRef<HTMLDivElement, VirtualScrollerProps>(
  (
    {
      items,
      itemHeight,
      renderItem,
      overscan = 5,
      className,
      containerHeight = "100%",
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [scrollTop, setScrollTop] = React.useState(0)

    const totalHeight = items.length * itemHeight

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + (containerRef.current?.clientHeight ?? 0)) / itemHeight) + overscan
    )

    const visibleItems = items.slice(startIndex, endIndex)

    function handleScroll() {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop)
      }
    }

    return (
      <div
        ref={(node) => {
          containerRef.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node
        }}
        className={cn("overflow-auto will-change-scroll", className)}
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div
          className="relative w-full"
          style={{ height: `${totalHeight}px` }}
        >
          <div
            className="absolute left-0 right-0"
            style={{
              top: `${startIndex * itemHeight}px`,
            }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={startIndex + index}
                className="will-change-transform"
                style={{ height: `${itemHeight}px` }}
              >
                {renderItem(item, startIndex + index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
)
VirtualScroller.displayName = "VirtualScroller"

export { VirtualScroller }
export type { VirtualScrollerProps }
