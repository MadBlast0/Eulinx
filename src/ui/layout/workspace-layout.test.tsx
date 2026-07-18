/**
 * WorkspaceLayout — solver + provider behaviour tests (Part03 / Part06).
 *
 * Covers:
 *  - region-solver constraints (min/max clamp, canvas floor, sum invariant)
 *  - collapse order (degrade ladder: sidebar rail -> inspector hidden -> panel)
 *  - provider behaviour: toggling a region changes its visibility
 *  - focus model: cycle skips invisible regions; collapsed focused region re-homes
 */

import { describe, it, expect, beforeEach } from "vitest"
import { useState } from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { useLayoutStore, REGION_CONSTRAINTS, type LayoutState, type RegionId, type RegionState } from "@/stores/layout-store"
import {
  solveLayout,
  solveWidth,
  solveHeight,
  clamp,
  ABSOLUTE_MIN_CANVAS,
  FOCUS_CYCLE,
} from "./region-solver"
import { WorkspaceLayoutProvider, useWorkspaceLayout } from "./workspace-layout"
import { useRegionFocus } from "./use-region-focus"
import { buildDefaultLayout, buildDefaultRegionStates, LAYOUT_SCHEMA_VERSION, validateAndRepair } from "./layout-store-adapter"

// RegionState.size/collapsed/visible are readonly; tests mutate via a local
// writable view so the solver inputs stay editable without type errors.
type WritableRegion = { id: RegionId; visible: boolean; collapsed: boolean; size: number; restoreSize: number }

function regions(): Record<RegionId, RegionState> {
  const base = buildDefaultRegionStates()
  const out = {} as Record<RegionId, WritableRegion>
  for (const key of Object.keys(base) as RegionId[]) {
    const r = base[key]!
    out[key] = { id: r.id, visible: r.visible, collapsed: r.collapsed, size: r.size, restoreSize: r.restoreSize }
  }
  // The solver accepts RegionState; a writable view is assignable to it.
  return out as unknown as Record<RegionId, RegionState>
}

/** Mutate a region's size on the writable view. */
function setSize(r: Record<RegionId, RegionState>, id: RegionId, size: number): void {
  ;(r[id] as WritableRegion).size = size
}
/** Mutate a region's collapsed/visible flags on the writable view. */
function setCollapsed(r: Record<RegionId, RegionState>, id: RegionId, collapsed: boolean, visible: boolean): void {
  const w = r[id] as WritableRegion
  w.collapsed = collapsed
  w.visible = visible
}

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------

describe("clamp", () => {
  it("clamps below min and above max", () => {
    expect(clamp(10, 50, 100)).toBe(50)
    expect(clamp(200, 50, 100)).toBe(100)
    expect(clamp(75, 50, 100)).toBe(75)
  })
  it("returns min on NaN", () => {
    expect(clamp(Number.NaN, 20, 100)).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// Solver: sum invariant + min/max
// ---------------------------------------------------------------------------

describe("solveWidth", () => {
  it("derives canvas as container minus sidebar/inspector/splitters", () => {
    const r = regions()
    const { sizes, degraded } = solveWidth(1280, r)
    const splitters = 2 * 4
    expect(sizes.canvas).toBe(1280 - r.sidebar!.size - r.inspector!.size - splitters)
    expect(sizes.sidebar).toBe(REGION_CONSTRAINTS.sidebar.defaultSize)
    expect(sizes.inspector).toBe(REGION_CONSTRAINTS.inspector.defaultSize)
    expect(degraded).toBe(false)
  })

  it("clamps a region above its max", () => {
    const r = regions()
    setSize(r, "sidebar", 9999)
    const { sizes } = solveWidth(2000, r)
    expect(sizes.sidebar).toBe(REGION_CONSTRAINTS.sidebar.maxSize)
  })

  it("keeps canvas >= floor when there is room", () => {
    const r = regions()
    setSize(r, "sidebar", 240)
    setSize(r, "inspector", 320)
    const { sizes, degraded } = solveWidth(1280, r)
    expect(sizes.canvas).toBeGreaterThanOrEqual(REGION_CONSTRAINTS.canvas.minSize)
    expect(degraded).toBe(false)
  })
})

describe("solveHeight", () => {
  it("derives canvas height from fixed + panel", () => {
    const r = regions()
    const { sizes } = solveHeight(900, r)
    const splitters = 1 * 4
    expect(sizes.canvas).toBe(900 - r.titleBar!.size - r.statusBar!.size - r.panel!.size - splitters)
    expect(sizes.titleBar).toBe(REGION_CONSTRAINTS.titleBar.minSize)
    expect(sizes.statusBar).toBe(REGION_CONSTRAINTS.statusBar.minSize)
  })
})

describe("solveLayout (sum invariant)", () => {
  it("width axis: sidebar + inspector + canvas + splitters === width", () => {
    const r = regions()
    const { sizes } = solveWidth(1280, r)
    const splitters = 2 * 4
    expect(sizes.sidebar + sizes.inspector + sizes.canvas + splitters).toBe(1280)
  })

  it("height axis: titleBar + panel + statusBar + canvas + splitter === height", () => {
    const r = regions()
    const { sizes } = solveHeight(900, r)
    const splitters = 1 * 4
    expect(sizes.titleBar + sizes.panel + sizes.statusBar + sizes.canvas + splitters).toBe(900)
  })

  it("solveLayout picks the smaller canvas of the two axes and preserves the winning axis sum", () => {
    const r = regions()
    const solved = solveLayout({ width: 1280, height: 900 }, r)
    const s = solved.sizes
    const heightSplitters = 1 * 4
    // The height axis wins here (panel eats vertical room), so its invariant holds.
    expect(s.titleBar + s.panel + s.statusBar + s.canvas + heightSplitters).toBe(900)
    // Canvas never exceeds either axis' available space.
    expect(s.canvas).toBeLessThanOrEqual(solveWidth(1280, r).sizes.canvas)
    expect(s.canvas).toBeLessThanOrEqual(solveHeight(900, r).sizes.canvas)
  })

  it("degrades sidebar to rail when width is too small for the canvas floor", () => {
    const r = regions()
    setSize(r, "sidebar", 240)
    setSize(r, "inspector", 320)
    // 240 + 320 + canvasFloor(480) = 1040 + 8 splitters = 1048; give less.
    const solved = solveLayout({ width: 1000, height: 900 }, r)
    expect(solved.degraded).toBe(true)
    expect(solved.sizes.sidebar).toBe(REGION_CONSTRAINTS.sidebar.railSize)
  })

  it("violates the functional canvas floor only down to the absolute floor", () => {
    const r = regions()
    setSize(r, "sidebar", 480)
    setSize(r, "inspector", 560)
    const solved = solveLayout({ width: 700, height: 900 }, r)
    expect(solved.sizes.canvas).toBeGreaterThanOrEqual(ABSOLUTE_MIN_CANVAS)
  })

  it("a collapsed hidden inspector contributes zero width and a single width splitter", () => {
    const r = regions()
    setCollapsed(r, "inspector", true, false)
    const solved = solveLayout({ width: 1280, height: 900 }, r)
    expect(solved.sizes.inspector).toBe(0)
    const widthSplitters = 1 * 4
    expect(solved.sizes.sidebar + solved.sizes.inspector + solved.sizes.canvas + widthSplitters).toBeLessThanOrEqual(1280)
    // The width axis now claims only sidebar + canvas + 1 splitter.
    const w = solveWidth(1280, r)
    expect(w.sizes.sidebar + w.sizes.inspector + w.sizes.canvas + 4).toBe(1280)
  })
})

// ---------------------------------------------------------------------------
// Focus model
// ---------------------------------------------------------------------------

describe("useRegionFocus", () => {
  function Harness({ visible }: { visible: (id: "sidebar" | "canvas" | "inspector" | "panel") => boolean }) {
    const focus = useRegionFocus({ isVisible: (id) => visible(id as never) })
    return (
      <div>
        <span data-testid="focused">{focus.focusedRegion}</span>
        <button onClick={() => focus.cycleNext()} data-testid="next">
          next
        </button>
        <button onClick={() => focus.focusRegion("inspector")} data-testid="to-inspector">
          to-inspector
        </button>
      </div>
    )
  }

  it("cycles canvas -> inspector -> panel -> sidebar", () => {
    render(<Harness visible={() => true} />)
    expect(screen.getByTestId("focused").textContent).toBe("canvas")
    fireEvent.click(screen.getByTestId("next"))
    expect(screen.getByTestId("focused").textContent).toBe("inspector")
    fireEvent.click(screen.getByTestId("next"))
    expect(screen.getByTestId("focused").textContent).toBe("panel")
    fireEvent.click(screen.getByTestId("next"))
    expect(screen.getByTestId("focused").textContent).toBe("sidebar")
  })

  it("skips an invisible region in the cycle", () => {
    render(
      <Harness
        visible={(id) => {
          if (id === "inspector") return false
          return true
        }}
      />,
    )
    fireEvent.click(screen.getByTestId("next")) // canvas -> (skip inspector) -> panel
    expect(screen.getByTestId("focused").textContent).toBe("panel")
  })

  it("re-homes focus when the focused region becomes invisible", () => {
    function Stateful() {
      const [inspectorVisible, setInspectorVisible] = useState(true)
      const focus = useRegionFocus({ isVisible: (id) => (id === "inspector" ? inspectorVisible : true) })
      return (
        <div>
          <span data-testid="focused">{focus.focusedRegion}</span>
          <button onClick={() => focus.focusRegion("inspector")} data-testid="focus-inspector">
            focus-inspector
          </button>
          <button onClick={() => setInspectorVisible(false)} data-testid="hide-inspector">
            hide
          </button>
        </div>
      )
    }
    render(<Stateful />)
    fireEvent.click(screen.getByTestId("focus-inspector"))
    expect(screen.getByTestId("focused").textContent).toBe("inspector")
    fireEvent.click(screen.getByTestId("hide-inspector"))
    expect(screen.getByTestId("focused").textContent).not.toBe("inspector")
    expect(FOCUS_CYCLE).toContain(screen.getByTestId("focused").textContent)
  })
})

// ---------------------------------------------------------------------------
// Provider behaviour: toggles change visibility
// ---------------------------------------------------------------------------

describe("WorkspaceLayout provider", () => {
  beforeEach(() => {
    // Reset the zustand store to a default layout before each test.
    const store = useLayoutStore
    act(() => {
      store.getState().resetLayout("test-ws")
    })
  })

  function Probe() {
    const api = useWorkspaceLayout()
    return (
      <div>
        <span data-testid="sidebar-visible">{String(api.visible.sidebar)}</span>
        <span data-testid="inspector-visible">{String(api.visible.inspector)}</span>
        <span data-testid="panel-visible">{String(api.visible.panel)}</span>
        <button onClick={() => api.toggleRegion("sidebar")} data-testid="toggle-sidebar">
          toggle-sidebar
        </button>
        <button onClick={() => api.toggleRegion("inspector")} data-testid="toggle-inspector">
          toggle-inspector
        </button>
        <button onClick={() => api.toggleRegion("panel")} data-testid="toggle-panel">
          toggle-panel
        </button>
      </div>
    )
  }

  function renderShell() {
    return render(
      <WorkspaceLayoutProvider workspaceId="test-ws" initialWindowSize={{ width: 1440, height: 900 }}>
        <Probe />
      </WorkspaceLayoutProvider>,
    )
  }

  it("starts with all sizable regions visible", () => {
    renderShell()
    expect(screen.getByTestId("sidebar-visible").textContent).toBe("true")
    expect(screen.getByTestId("inspector-visible").textContent).toBe("true")
    expect(screen.getByTestId("panel-visible").textContent).toBe("true")
  })

  it("toggling sidebar collapses then expands it", () => {
    renderShell()
    fireEvent.click(screen.getByTestId("toggle-sidebar"))
    expect(screen.getByTestId("sidebar-visible").textContent).toBe("false")
    fireEvent.click(screen.getByTestId("toggle-sidebar"))
    expect(screen.getByTestId("sidebar-visible").textContent).toBe("true")
  })

  it("toggling inspector hides it (hidden mode)", () => {
    renderShell()
    fireEvent.click(screen.getByTestId("toggle-inspector"))
    expect(screen.getByTestId("inspector-visible").textContent).toBe("false")
  })

  it("toggling panel hides it", () => {
    renderShell()
    fireEvent.click(screen.getByTestId("toggle-panel"))
    expect(screen.getByTestId("panel-visible").textContent).toBe("false")
  })
})

// ---------------------------------------------------------------------------
// Adapter: default layout + migration/repair never throws
// ---------------------------------------------------------------------------

describe("layout-store-adapter", () => {
  it("exposes the current schema version", () => {
    expect(LAYOUT_SCHEMA_VERSION).toBe(1)
  })

  it("builds a default layout with all six regions", () => {
    const layout = buildDefaultLayout("ws1")
    expect(Object.keys(layout.regions)).toHaveLength(6)
    expect(layout.regions.canvas.visible).toBe(true)
    expect(layout.regions.canvas.collapsed).toBe(false)
    // exactly one pinned tab
    const pinned = layout.canvasTabs.tabs.filter((t) => t.pinned)
    expect(pinned).toHaveLength(1)
  })

  it("validateAndRepair falls back to defaults for garbage input", () => {
    const repaired = validateAndRepair(null, { width: 1280, height: 900 }, "ws")
    expect(repaired.regions.sidebar.size).toBeGreaterThanOrEqual(REGION_CONSTRAINTS.sidebar.minSize)
    expect(repaired.regions.canvas.visible).toBe(true)
  })

  it("validateAndRepair clamps an out-of-range region size", () => {
    const adapter = { validateAndRepair }
    const blob = {
      schemaVersion: 1,
      workspaceId: "ws",
      regions: {
        ...buildDefaultRegionStates(),
        sidebar: { id: "sidebar", visible: true, collapsed: false, size: 99999, restoreSize: 99999 },
      },
      canvasTabs: { tabs: [], activeTabId: "", mruOrder: [] },
      lastWindowSize: { width: 1280, height: 900 },
      updatedAt: new Date().toISOString(),
    }
    const repaired: LayoutState = adapter.validateAndRepair(blob, { width: 1280, height: 900 }, "ws")
    expect(repaired.regions.sidebar.size).toBeLessThanOrEqual(REGION_CONSTRAINTS.sidebar.maxSize)
  })
})
