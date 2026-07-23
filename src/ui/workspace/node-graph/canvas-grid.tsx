import { useEffect, useRef } from "react"

// ---------------------------------------------------------------------------
// Infinite procedural dot grid with adaptive Level-of-Detail.
//
// The illusion: dots ALWAYS appear to be at the same screen-space density
// (~24px apart) regardless of zoom. In reality, multiple world-space grids
// crossfade — a coarser grid fades out while a finer grid fades in.
//
// At any zoom, exactly TWO adjacent levels render with complementary opacity.
// The viewer never notices the grid changing.
//
// Dots are locked to world coordinates. Camera moves, dots never move.
// ---------------------------------------------------------------------------

// ── Configuration ──

/** Target screen-space spacing between dots (pixels). */
const TARGET_SCREEN_SPACING = 24

/** World-space grid levels — powers of 2, covering zoom 0.1 to 4.0. */
const WORLD_SPACINGS: readonly number[] = [
  256, 128, 64, 32, 16, 8, 4,
]

/** Peak opacity for the primary (closest-to-target) grid. */
const PRIMARY_ALPHA = 0.15

/** Maximum opacity for the secondary (adjacent) grid. */
const SECONDARY_ALPHA = 0.06

/** Dot color — light gray for dark backgrounds. */
const DOT_COLOR = "180, 180, 180"

/** Base dot radius — nearly constant while zooming. */
const BASE_RADIUS = 1.5

// ── Algorithm ──

/**
 * For each world grid level, compute how close its screen-space spacing
 * is to the target. Return the two levels that should render, with
 * complementary opacity.
 *
 * The "closeness" metric uses log2 ratio:
 *   ratio = target / screenSpacing
 *   closeness = 1 - |log2(ratio)|
 *
 * This gives a smooth bell curve: 1.0 at perfect match, 0 at 1 octave away.
 */
function getActiveLevels(zoom: number): ReadonlyArray<{
  readonly spacing: number
  readonly alpha: number
}> {
  const levels: { spacing: number; alpha: number; closeness: number }[] = []

  for (const worldSpacing of WORLD_SPACINGS) {
    const screenSpacing = worldSpacing * zoom

    // Skip if dots would be invisible on screen
    if (screenSpacing < 3 || screenSpacing > 600) continue

    // How close is this level's screen spacing to the target?
    const ratio = TARGET_SCREEN_SPACING / screenSpacing
    const closeness = Math.max(0, 1 - Math.abs(Math.log2(ratio)))

    if (closeness > 0.01) {
      levels.push({
        spacing: worldSpacing,
        alpha: PRIMARY_ALPHA * closeness,
        closeness,
      })
    }
  }

  // Sort by closeness — primary level first
  levels.sort((a, b) => b.closeness - a.closeness)

  // Cap secondary level opacity
  if (levels.length >= 2 && levels[1]) {
    levels[1].alpha = Math.min(levels[1].alpha, SECONDARY_ALPHA)
  }

  // Return top 2 at most
  return levels.slice(0, 2).map(({ spacing, alpha }) => ({ spacing, alpha }))
}

function dotRadius(_zoom: number): number {
  // Nearly constant — eye perceives density through opacity, not size
  return BASE_RADIUS
}

// ── Component ──

export interface GridViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

interface CanvasGridProps {
  readonly viewport: GridViewport
}

export function CanvasGrid({ viewport }: CanvasGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { width, height } = container.getBoundingClientRect()
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const vw = canvas.width / dpr
    const vh = canvas.height / dpr

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, vw, vh)

    const { x: offsetX, y: offsetY, zoom } = viewport

    // Visible world-space bounds
    const worldMinX = -offsetX / zoom
    const worldMinY = -offsetY / zoom
    const worldMaxX = (vw - offsetX) / zoom
    const worldMaxY = (vh - offsetY) / zoom

    const r = dotRadius(zoom)
    const activeLevels = getActiveLevels(zoom)

    for (const level of activeLevels) {
      if (level.alpha <= 0.001) continue

      const spacing = level.spacing
      const startX = Math.floor(worldMinX / spacing) * spacing
      const startY = Math.floor(worldMinY / spacing) * spacing

      const cols = Math.ceil((worldMaxX - startX) / spacing) + 1
      const rows = Math.ceil((worldMaxY - startY) / spacing) + 1

      ctx.fillStyle = `rgba(${DOT_COLOR}, ${level.alpha})`
      ctx.beginPath()

      for (let row = 0; row < rows; row++) {
        const wy = startY + row * spacing
        const sy = wy * zoom + offsetY
        if (sy < -2 || sy > vh + 2) continue

        for (let col = 0; col < cols; col++) {
          const wx = startX + col * spacing
          const sx = wx * zoom + offsetX
          if (sx < -2 || sx > vw + 2) continue

          ctx.moveTo(sx + r, sy)
          ctx.arc(sx, sy, r, 0, Math.PI * 2)
        }
      }

      ctx.fill()
    }
  }, [viewport])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  )
}
