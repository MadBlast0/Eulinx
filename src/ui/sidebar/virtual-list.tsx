/**
 * Eulinx Sidebar — reusable windowed (virtualized) list.
 *
 * Renders only the rows intersecting the viewport plus `overscan` rows above
 * and below, using two spacer divs and absolutely-positioned rows. Implements
 * the exact technique from Sidebar-Part01 §Mermaid / §AI Notes: never create
 * the off-screen DOM nodes.
 *
 * Pure and headless: it owns scroll + windowing math; the caller supplies a
 * `renderRow` that maps a flat item + index to a row element. `itemHeight` is a
 * fixed constant (row height is uniform). Overscan defaults to the Sidebar's
 * `TREE_OVERSCAN_ROWS`.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type UIEvent,
} from "react"
import { TREE_OVERSCAN_ROWS, TREE_ROW_HEIGHT } from "./use-sidebar"

export interface VirtualListProps<T> {
  readonly items: readonly T[]
  readonly itemHeight?: number
  readonly overscan?: number
  /** Viewport height in px. When 0 the list measures its own container. */
  readonly viewportHeight?: number
  readonly getKey: (item: T, index: number) => string
  readonly renderRow: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  /** Fired when the scroll container scrolls. */
  readonly onScroll?: (scrollTop: number) => void
  /** Accessible role for the scroll viewport. */
  readonly role?: string
  readonly className?: string
  readonly style?: React.CSSProperties
  /** Render a header (e.g. section header) pinned outside the scroll area. */
  readonly ariaLabel?: string
  /** The element that should receive roving focus; forwarded to the viewport. */
  readonly tabIndex?: number
}

export interface VirtualListHandle {
  /** Scroll a row into view, preserving it within the viewport. */
  scrollToIndex: (index: number) => void
  /** The scroll viewport element, for focus/query delegation. */
  readonly scrollEl: HTMLDivElement | null
  /** Current scrollTop. */
  readonly scrollTop: number
}

export const VirtualList = forwardRef(function VirtualList<T>(
  {
    items,
    itemHeight = TREE_ROW_HEIGHT,
    overscan = TREE_OVERSCAN_ROWS,
    viewportHeight = 0,
    getKey,
    renderRow,
    onScroll,
    role = "list",
    className,
    style,
    ariaLabel,
    tabIndex,
  }: VirtualListProps<T>,
  ref: React.Ref<VirtualListHandle>,
): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [measuredHeight, setMeasuredHeight] = useState(viewportHeight)

  // Measure the container when no explicit viewport height is provided.
  useLayoutEffect(() => {
    if (viewportHeight > 0 || !scrollRef.current) return
    const el = scrollRef.current
    setMeasuredHeight(el.clientHeight)
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setMeasuredHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [viewportHeight])

  useEffect(() => {
    if (typeof ref !== "object" || ref === null) return
    const api: VirtualListHandle = {
      scrollTop,
      scrollToIndex: (index: number) => {
        const el = scrollRef.current
        if (!el) return
        const top = index * itemHeight
        const bottom = top + itemHeight
        if (top < el.scrollTop) {
          el.scrollTop = top
        } else if (bottom > el.scrollTop + el.clientHeight) {
          el.scrollTop = bottom - el.clientHeight
        }
      },
      get scrollEl() {
        return scrollRef.current
      },
    }
    ref.current = api
  }, [ref, scrollTop, itemHeight])

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const top = e.currentTarget.scrollTop
      setScrollTop(top)
      onScroll?.(top)
    },
    [onScroll],
  )

  const height = measuredHeight || viewportHeight || 0
  const rowCount = items.length
  const totalHeight = rowCount * itemHeight

  const firstIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const lastIndex = Math.min(
    rowCount - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan,
  )

  const visible: React.ReactNode[] = []
  for (let i = firstIndex; i <= lastIndex; i++) {
    const item = items[i]
    if (item === undefined) continue
    const rowStyle: React.CSSProperties = {
      position: "absolute",
      top: i * itemHeight,
      left: 0,
      right: 0,
      height: itemHeight,
    }
    visible.push(
      <div key={getKey(item, i)} role="listitem" style={{ position: "absolute", left: 0, right: 0, top: i * itemHeight, height: itemHeight }}>
        {renderRow(item, i, rowStyle)}
      </div>,
    )
  }

  return (
    <div
      ref={scrollRef}
      role={role}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      className={className}
      onScroll={handleScroll}
      style={{ position: "relative", overflowY: "auto", overflowX: "hidden", ...style }}
    >
      <div style={{ position: "relative", height: totalHeight, width: "100%" }}>{visible}</div>
    </div>
  )
}) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> },
) => React.ReactElement
