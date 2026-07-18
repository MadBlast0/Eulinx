/**
 * P18-UI-DASH — ResponsiveRules tests
 *
 * Asserts:
 *  - collapse order: sidebar rails before inspector hides before panel hides
 *  - canvas floor (480) protected until last resort
 *  - window-too-small overlay triggers below hard min (940x560)
 */

import { describe, expect, it } from "vitest"
import {
  computeCollapsePlan,
  type CollapsePlan,
  type RequestedRegions,
} from "./collapse-orchestrator"
import {
  ABSOLUTE_MIN_CANVAS,
  BREAKPOINTS,
  MIN_WINDOW_SIZE,
  aggregateMinWidth,
  isWindowTooSmall,
} from "./breakpoints"
import { REGION_CONSTRAINTS } from "@/stores/layout-store"

const ALL_VISIBLE = { sidebar: true, inspector: true, panel: true }

/** Build requested regions with explicit sizes (defaults: 240 / 320 / 220). */
function regions(
  sidebar: number,
  inspector: number,
  panel: number,
  vis = ALL_VISIBLE,
): RequestedRegions {
  return {
    sidebar: { visible: vis.sidebar, size: sidebar },
    inspector: { visible: vis.inspector, size: inspector },
    panel: { visible: vis.panel, size: panel },
  }
}

function plan(
  width: number,
  height: number,
  sidebar: number,
  inspector: number,
  panel: number,
  vis = ALL_VISIBLE,
): CollapsePlan {
  return computeCollapsePlan({ width, height }, regions(sidebar, inspector, panel, vis))
}

/** Index of when a region degrades in the order [sidebar, inspector, panel]. */
function degradeStep(p: CollapsePlan): { sidebar: number; inspector: number; panel: number } {
  return {
    sidebar: p.sidebar === "rail" ? 1 : 0,
    inspector: p.inspector === "hidden" ? 2 : 0,
    panel: p.panel === "hidden" ? 3 : 0,
  }
}

describe("computeCollapsePlan — collapse order", () => {
  it("keeps everything visible when the window comfortably holds the regions", () => {
    const p = plan(1600, 900, 240, 320, 220)
    expect(p.sidebar).toBe("visible")
    expect(p.inspector).toBe("visible")
    expect(p.panel).toBe("visible")
    expect(p.degraded).toBe(false)
    expect(p.tooSmall).toBe(false)
  })

  it("rails the sidebar before hiding the inspector (width 940, default sizes)", () => {
    // At the hard-min width 940 with default sizes, the canvas falls below its
    // 480 floor, so the sidebar rails; the inspector still fits.
    const p = plan(940, 900, 240, 320, 220)
    expect(p.sidebar).toBe("rail")
    expect(p.inspector).toBe("visible")
  })

  it("hides the inspector before hiding the panel (width 940, expanded regions)", () => {
    // Expanded sidebar (480) + inspector (560) at 940 forces sidebar rail then
    // inspector hidden; panel still fits vertically.
    const p = plan(940, 900, 480, 560, 220)
    expect(p.sidebar).toBe("rail")
    expect(p.inspector).toBe("hidden")
    expect(p.panel).toBe("visible")
  })

  it("sidebar rails BEFORE inspector hides BEFORE panel hides (normative order)", () => {
    // Drive degradations by widening region sizes at a fixed 940 window and
    // confirm the order is never violated.
    const sizes = [240, 300, 360, 420, 480, 540]
    for (const s of sizes) {
      const p = plan(940, 900, s, s, 220)
      const step = degradeStep(p)
      if (step.inspector > 0) expect(step.sidebar).toBeGreaterThan(0)
      if (step.panel > 0) expect(step.inspector).toBeGreaterThan(0)
    }
  })

  it("panel (height-axis) is the last to degrade and only under height pressure", () => {
    // The planner encodes panel as the final degrade step. At any width/height
    // that is NOT tooSmall, the panel may only hide once the inspector would
    // already be hidden; verify the post-condition across the degrade sweep.
    const sizes = [240, 300, 360, 420, 480, 540, 600]
    for (const s of sizes) {
      const p = plan(940, 900, s, s, 220)
      if (p.panel === "hidden") {
        expect(p.inspector).toBe("hidden")
        expect(p.sidebar).toBe("rail")
      }
    }
  })
})

describe("computeCollapsePlan — canvas floor protection", () => {
  it("assigns a non-negative canvas and respects the floor when feasible", () => {
    for (let w = 1400; w >= MIN_WINDOW_SIZE.width; w -= 20) {
      const p = plan(w, 900, 240, 320, 220)
      expect(p.tooSmall).toBe(false)
      expect(p.canvasWidth).toBeGreaterThanOrEqual(0)
      const nothingDegraded =
        p.sidebar === "visible" && p.inspector === "visible" && p.panel === "visible"
      if (nothingDegraded) {
        expect(p.canvasWidth).toBeGreaterThanOrEqual(REGION_CONSTRAINTS.canvas.minSize)
      }
    }
  })

  it("at width 940 with default sizes the canvas still meets the 480 floor after railing", () => {
    const p = plan(940, 900, 240, 320, 220)
    expect(p.sidebar).toBe("rail")
    expect(p.inspector).toBe("visible")
    expect(p.canvasWidth).toBeGreaterThanOrEqual(REGION_CONSTRAINTS.canvas.minSize)
  })

  it("absolute floor (320) is strictly below the functional floor (480)", () => {
    expect(ABSOLUTE_MIN_CANVAS).toBeLessThan(REGION_CONSTRAINTS.canvas.minSize)
  })

  it("aggregate-min uses region minima: sidebar 180 + inspector 260 + 2 splitters (8)", () => {
    expect(REGION_CONSTRAINTS.sidebar.minSize).toBe(180)
    expect(REGION_CONSTRAINTS.inspector.minSize).toBe(260)
    expect(aggregateMinWidth(ALL_VISIBLE)).toBe(180 + 260 + 8)
  })
})

describe("computeCollapsePlan — window too small overlay", () => {
  it("flags tooSmall below MIN_WINDOW_SIZE (940x560)", () => {
    expect(isWindowTooSmall({ width: 939, height: 560 })).toBe(true)
    expect(isWindowTooSmall({ width: 940, height: 559 })).toBe(true)
    expect(isWindowTooSmall({ width: 940, height: 560 })).toBe(false)
  })

  it("returns a tooSmall plan that does not collapse regions", () => {
    const p = computeCollapsePlan(
      { width: 800, height: 500 },
      regions(240, 320, 220),
    )
    expect(p.tooSmall).toBe(true)
    expect(p.sidebar).toBe("visible")
    expect(p.inspector).toBe("visible")
    expect(p.panel).toBe("visible")
  })

  it("breakpoints resolve at the nominal Part 02 steps", () => {
    expect(BREAKPOINTS.sm).toBe(720)
    expect(BREAKPOINTS.md).toBe(1024)
    expect(BREAKPOINTS.lg).toBe(1440)
    expect(BREAKPOINTS.xl).toBe(1920)
  })
})
