/**
 * P18-UI-DASH — ResponsiveRules
 *
 * Container queries: nested adaptation driven by a region's OWN size, not the
 * window. Per ResponsiveRules-Part02 the card grid / panel splits reflow by
 * their container so a narrow panel shows one column even on a wide monitor.
 *
 * Provides:
 *   - <ContainerQuery>  declarative wrapper that reports its container tier
 *   - useContainerQuery  imperative hook for a measured element ref
 */

import {
  createElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import {
  matchesContainerWidth,
  resolveContainerTier,
  type ContainerThreshold,
  type ContainerTier,
} from "./breakpoints"

// ---------------------------------------------------------------------------
// useContainerQuery — measure an element's width via ResizeObserver
// ---------------------------------------------------------------------------

export interface ContainerQueryResult {
  readonly width: number
  readonly height: number
  readonly tier: ContainerTier
  /** True while the element has not yet been measured. */
  readonly ready: boolean
}

export function useContainerQuery(
  ref: RefObject<HTMLElement | null>,
): ContainerQueryResult {
  const [size, setSize] = useState<{ width: number; height: number; ready: boolean }>(
    { width: 0, height: 0, ready: false },
  )

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") {
      // No ResizeObserver (very old webview): fall back to offsetWidth.
      if (el) {
        setSize({ width: el.offsetWidth, height: el.offsetHeight, ready: true })
      }
      return
    }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const box = entry.contentRect
      setSize({ width: box.width, height: box.height, ready: true })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return {
    width: size.width,
    height: size.height,
    tier: resolveContainerTier(size.width),
    ready: size.ready,
  }
}

// ---------------------------------------------------------------------------
// useContainerTier — convenience: just the tier for a ref
// ---------------------------------------------------------------------------

export function useContainerTier(ref: RefObject<HTMLElement | null>): ContainerTier {
  return useContainerQuery(ref).tier
}

// ---------------------------------------------------------------------------
// <ContainerQuery> — declarative wrapper
// ---------------------------------------------------------------------------

export interface ContainerQueryProps {
  readonly children: ReactNode | ((state: ContainerQueryResult) => ReactNode)
  /** Extra className. */
  readonly className?: string
  /** Inline style (merged). The element is `container-type: inline-size`. */
  readonly style?: CSSProperties
  /** Called whenever the container crosses into a new tier/width. */
  readonly onBreakpoint?: (state: ContainerQueryResult) => void
  /** Optional explicit threshold test (defaults to tier). */
  readonly threshold?: ContainerThreshold
}

export function ContainerQuery({
  children,
  className,
  style,
  onBreakpoint,
  threshold,
}: ContainerQueryProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const result = useContainerQuery(ref)
  const lastKey = useRef<string>("")

  const fire = useCallback(
    (state: ContainerQueryResult) => {
      const key = threshold
        ? String(matchesContainerWidth(state.width, threshold))
        : state.tier
      if (key !== lastKey.current) {
        lastKey.current = key
        onBreakpoint?.(state)
      }
    },
    [onBreakpoint, threshold],
  )

  useLayoutEffect(() => {
    fire(result)
    // `result` is derived from width/height/tier; those drive the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.width, result.height, result.tier, fire])

  const content =
    typeof children === "function" ? children(result) : children

  return createElement(
    "div",
    {
      ref,
      className,
      "data-container-tier": result.tier,
      style: {
        containerType: "inline-size",
        ...style,
      },
    },
    content,
  )
}
