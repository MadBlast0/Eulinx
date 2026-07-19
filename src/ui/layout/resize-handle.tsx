/**
 * P18-UI-DASH — Region Resize Handle (WorkspaceLayout-Part03).
 *
 * A draggable splitter for one region. Uses pointer capture so the drag
 * continues even if the cursor leaves the window. During drag it only previews
 * new sizes (calling `onPreview`, never the store); on pointer-up it commits via
 * `onCommit`, which triggers the debounced persist. Keyboard resize via the
 * arrow keys is supported and goes straight through `onCommit`.
 *
 * The handle is the only `pointer-events: auto` strip in the gap; everything
 * else in the shell is non-interactive for drag purposes (Part03).
 */

import { useCallback, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { SPLITTER_WIDTH } from "./region-solver"
import { usePrefersReducedMotion } from "@/ui/responsive/use-breakpoint"

export type SizableId = "sidebar" | "inspector" | "panel"
export type SizeMap = Partial<Record<SizableId, number>>

export interface ResizeHandleProps {
  /** The axis this handle controls. */
  readonly axis: "width" | "height"
  /** The region being resized. */
  readonly regionId: SizableId
  /** Called on every pointer move with the new preview sizes. */
  readonly onPreview: (sizes: SizeMap) => void
  /** Called once on pointer-up / arrow-key with the committed sizes. */
  readonly onCommit: (sizes: SizeMap) => void
  /** Accessible label for the drag control. */
  readonly label: string
  /** The other sizable region on the same axis (for paired preview math). */
  readonly otherId?: SizableId
  /** Current size of the region, for keyboard step math. */
  readonly currentSize?: number
  /** Current size of the paired region, for paired preview math. */
  readonly otherSize?: number
  /** Inclusive clamp bounds for this region. */
  readonly min: number
  readonly max: number
}

/**
 * Build the preview/commit size delta for a drag delta given the starting sizes
 * and the per-region clamp bounds. Pure, so it can be unit-tested.
 */
export function computeDrag(
  regionId: SizableId,
  otherId: SizableId | undefined,
  startSize: number,
  otherStart: number,
  delta: number,
  bounds: { min: number; max: number },
): SizeMap {
  const maxDelta = bounds.max - startSize
  const minDelta = bounds.min - startSize
  const clamped = Math.max(minDelta, Math.min(maxDelta, delta))
  const result: SizeMap = {}
  result[regionId] = startSize + clamped
  if (otherId !== undefined) result[otherId] = otherStart - clamped
  return result
}

export function ResizeHandle({
  axis,
  regionId,
  onPreview,
  onCommit,
  label,
  otherId,
  currentSize,
  otherSize,
  min,
  max,
}: ResizeHandleProps): ReactNode {
  const dragging = useRef(false)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)
  const otherStartRef = useRef(0)
  const reducedMotion = usePrefersReducedMotion()

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (e.button !== 0) return
      dragging.current = true
      startPosRef.current = axis === "width" ? e.clientX : e.clientY
      startSizeRef.current = currentSize ?? 0
      otherStartRef.current = otherSize ?? 0

      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)

      const handleMove = (ev: PointerEvent) => {
        if (!dragging.current) return
        const pos = axis === "width" ? ev.clientX : ev.clientY
        const delta = pos - startPosRef.current
        onPreview(computeDrag(regionId, otherId, startSizeRef.current, otherStartRef.current, delta, { min, max }))
      }
      const handleUp = () => {
        dragging.current = false
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          /* pointer already released */
        }
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
        onCommit(computeDrag(regionId, otherId, startSizeRef.current, otherStartRef.current, 0, { min, max }))
      }
      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
    },
    [axis, regionId, otherId, currentSize, otherSize, min, max, onPreview, onCommit],
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 32 : 8
      let delta = 0
      if (axis === "width" && e.key === "ArrowLeft") delta = -step
      else if (axis === "width" && e.key === "ArrowRight") delta = step
      else if (axis === "height" && e.key === "ArrowUp") delta = -step
      else if (axis === "height" && e.key === "ArrowDown") delta = step
      else return
      e.preventDefault()
      onCommit(computeDrag(regionId, otherId, currentSize ?? 0, otherSize ?? 0, delta, { min, max }))
    },
    [axis, regionId, otherId, currentSize, otherSize, min, max, onCommit],
  )

  const style: CSSProperties = {
    position: "relative",
    flex: "0 0 auto",
    background: token("--Eulinx-color-border"),
    zIndex: 1,
    touchAction: "none",
    transition: reducedMotion
      ? "none"
      : `background-color ${token("--Eulinx-duration-hover")} var(--Eulinx-ease-standard)`,
  }

  if (axis === "width") {
    style.width = SPLITTER_WIDTH.width
    style.cursor = "col-resize"
  } else {
    style.height = SPLITTER_WIDTH.height
    style.cursor = "row-resize"
  }

  return (
    <div
      role="separator"
      aria-orientation={axis === "width" ? "vertical" : "horizontal"}
      aria-label={label}
      aria-valuenow={currentSize}
      tabIndex={0}
      data-eulinx-resize={regionId}
      className="group shrink-0 outline-none"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px ${token("--Eulinx-color-accent")}`
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none"
      }}
      style={style}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ color: token("--Eulinx-color-text-muted") }}
      >
        <Icon name={axis === "width" ? "domain.grip" : "nav.chevron.down"} size="xs" aria-hidden />
      </span>
    </div>
  )
}
