import type { Placement, PlacementResult } from "@/types/design-system"

const PLACEMENT_AXIS: Record<Placement, "vertical" | "horizontal"> = {
  top: "vertical",
  "top-start": "vertical",
  "top-end": "vertical",
  bottom: "vertical",
  "bottom-start": "vertical",
  "bottom-end": "vertical",
  left: "horizontal",
  "left-start": "horizontal",
  "left-end": "horizontal",
  right: "horizontal",
  "right-start": "horizontal",
  "right-end": "horizontal",
}

function getAlignment(placement: Placement): "start" | "end" | "center" {
  if (placement.endsWith("-start")) return "start"
  if (placement.endsWith("-end")) return "end"
  return "center"
}

function getPrimaryDirection(placement: Placement): "top" | "bottom" | "left" | "right" {
  if (placement.startsWith("top")) return "top"
  if (placement.startsWith("bottom")) return "bottom"
  if (placement.startsWith("left")) return "left"
  return "right"
}

function getDefaultBoundary(): DOMRect {
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
}

function getOverlayRect(anchor: DOMRect, overlay: DOMRect, placement: Placement): DOMRect {
  const axis = PLACEMENT_AXIS[placement]
  const align = getAlignment(placement)
  const dir = getPrimaryDirection(placement)

  let top = 0
  let left = 0

  if (axis === "vertical") {
    if (dir === "top") {
      top = anchor.top - overlay.height
    } else {
      top = anchor.bottom
    }

    switch (align) {
      case "start":
        left = anchor.left
        break
      case "end":
        left = anchor.right - overlay.width
        break
      case "center":
        left = anchor.left + (anchor.width - overlay.width) / 2
        break
    }
  } else {
    if (dir === "left") {
      left = anchor.left - overlay.width
    } else {
      left = anchor.right
    }

    switch (align) {
      case "start":
        top = anchor.top
        break
      case "end":
        top = anchor.bottom - overlay.height
        break
      case "center":
        top = anchor.top + (anchor.height - overlay.height) / 2
        break
    }
  }

  return new DOMRect(left, top, overlay.width, overlay.height)
}

function rectWithinBoundary(rect: DOMRect, boundary: DOMRect): boolean {
  return (
    rect.left >= boundary.left &&
    rect.top >= boundary.top &&
    rect.right <= boundary.right &&
    rect.bottom <= boundary.bottom
  )
}

function clampWithinBoundary(top: number, left: number, overlay: DOMRect, boundary: DOMRect): { top: number; left: number } {
  return {
    top: Math.max(boundary.top, Math.min(top, boundary.bottom - overlay.height)),
    left: Math.max(boundary.left, Math.min(left, boundary.right - overlay.width)),
  }
}

function flipPlacement(placement: Placement): Placement {
  const flipMap: Record<Placement, Placement> = {
    top: "bottom",
    "top-start": "bottom-start",
    "top-end": "bottom-end",
    bottom: "top",
    "bottom-start": "top-start",
    "bottom-end": "top-end",
    left: "right",
    "left-start": "right-start",
    "left-end": "right-end",
    right: "left",
    "right-start": "left-start",
    "right-end": "left-end",
  }
  return flipMap[placement]
}

function toStyle(top: number, left: number): React.CSSProperties {
  return {
    position: "fixed",
    top: `${top}px`,
    left: `${left}px`,
  } as React.CSSProperties
}

export function detectCollision(anchor: DOMRect, overlay: DOMRect, placement: Placement, boundary?: DOMRect): PlacementResult {
  const b = boundary ?? getDefaultBoundary()
  const targetRect = getOverlayRect(anchor, overlay, placement)

  if (rectWithinBoundary(targetRect, b)) {
    return {
      placement,
      style: toStyle(targetRect.top, targetRect.left),
      collision: false,
    }
  }

  const clamped = clampWithinBoundary(targetRect.top, targetRect.left, overlay, b)
  return {
    placement,
    style: toStyle(clamped.top, clamped.left),
    collision: true,
  }
}

export function getAvailablePlacement(anchor: DOMRect, overlay: DOMRect, preferred: Placement, boundary?: DOMRect): PlacementResult {
  const b = boundary ?? getDefaultBoundary()

  const preferredRect = getOverlayRect(anchor, overlay, preferred)
  if (rectWithinBoundary(preferredRect, b)) {
    return {
      placement: preferred,
      style: toStyle(preferredRect.top, preferredRect.left),
      collision: false,
    }
  }

  const flipped = flipPlacement(preferred)
  const flippedRect = getOverlayRect(anchor, overlay, flipped)
  if (rectWithinBoundary(flippedRect, b)) {
    return {
      placement: flipped,
      style: toStyle(flippedRect.top, flippedRect.left),
      collision: false,
    }
  }

  const clamped = clampWithinBoundary(preferredRect.top, preferredRect.left, overlay, b)
  return {
    placement: preferred,
    style: toStyle(clamped.top, clamped.left),
    collision: true,
  }
}
