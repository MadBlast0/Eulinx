---
title: WorkspaceLayout Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - workspace-layout
  - architecture
related:
  - "[[07-ui-ux/README]]"
  - "[[WorkspaceLayout-Part01]]"
  - "[[WorkspaceLayout-Part02]]"
  - "[[WorkspaceLayout-Part04]]"
  - "[[ResponsiveRules-Part01]]"
---

# WorkspaceLayout Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Region Model, and the Object Model
Part 02 - The Window Shell, Tauri Window Configuration, and Mount Order
Part 03 - Resizable and Collapsible Panes, Constraints, and the Resize Algorithm
Part 04 - Layout Persistence, Migration, and the Workspace Binding
Part 05 - Multi-Tab and Multi-Workspace Handling
Part 06 - The Focus Model, Checklist, and Worked Examples
Diagrams - WorkspaceLayout-Diagrams.md

# Purpose of This Part

This part specifies the resize and collapse math. It is the single place where the sum-invariants from Part 01 are enforced by construction. Any component that wants to change a region size MUST call the solver; it MUST NOT set `size` on a `RegionState` directly.

# The Solver

The solver runs in one pass over one axis. It takes the container size and the current `RegionState` set, and returns a corrected set where every constraint holds and the sum equals the container.

```text
solveAxis(containerSize, regions, axis):
  splitter = SPLITTER_WIDTH[axis]                 // 4px per splitter
  free    = containerSize - splittersTotal

  // 1. Pin every non-collapsed, non-flex region to its current size,
  //    clamped to [minSize, maxSize].
  for r in sizableRegions where not r.collapsed:
     r.size = clamp(r.size, r.minSize, r.maxSize)

  // 2. Sum the claimed pixels of the pinned sizable regions.
  claimed = sum(r.size for r in sizableRegions if not r.collapsed)
  collapsedPx = sum(r.railSize or 0 for r in sizableRegions if r.collapsed)
  claimed += collapsedPx

  // 3. canvas is flex. It gets whatever is left.
  canvasSize = free - claimed
  if canvasSize >= canvasMin:
      canvas.size = canvasSize
      return regions            // invariants hold
  else:
      // 4. Under width pressure. Take from collapsible regions in order.
      return degradeAxis(free, regions, axis)
```

`degradeAxis` is the degradation ladder. It is the only path that may violate a preferred constraint, and it does so in a fixed order:

```text
degradeAxis(free, regions, axis):
  // Order is normative. Do not reorder.
  ORDER = [sidebar, inspector, panel]   // panel is height, applied in its own axis pass
  1. Collapse "rail" regions to railSize (sidebar).
  2. Collapse "hidden" regions to 0 (inspector, panel) if still short.
  3. Violate canvas.minSize last: set canvas = canvasMin_only_if_possible,
     otherwise canvas = max(free - claimedAfterCollapses, ABSOLUTE_MIN_CANVAS=320).
  4. If still short (container below MIN_WINDOW_SIZE), clamp every region to
     its floor and let the shell show the "window too small" overlay.
```

The reason the order is fixed: the canvas must stay usable as long as physically possible because it hosts the graph (Part 01). A 480px canvas floor is the minimum at which NodeGraph can render one node plus its inspector affordance. We sacrifice side regions before we sacrifice the canvas.

# Splitter Geometry

Every resizable region has exactly one splitter on the side facing `canvas`. Splitters are 4px wide/high and live in the gaps the sum equation accounts for.

```ts
export const SPLITTER_WIDTH = { width: 4, height: 4 } as const;
```

The splitter element is a `pointer-events: auto` strip. Everything else in `AppShell` is `pointer-events: none` for drag purposes except the strip. Pointer capture is acquired on pointerdown so the drag continues even if the cursor leaves the window.

# The Resize Interaction

```ts
function onSplitterDown(axis, regionId, e) {
  e.preventDefault();
  const startPos = axis === "width" ? e.clientX : e.clientY;
  const startSize = regions[regionId].size;
  const otherId = axis === "width"
    ? (regionId === "sidebar" ? "inspector" : "sidebar")
    : "panel";
  const otherStart = regions[otherId].size;
  const maxDelta = computeMaxDelta(); // from solver clamp on both sides

  function onMove(ev) {
    const delta = (axis === "width" ? ev.clientX : ev.clientY) - startPos;
    const clamped = clamp(delta, -startSize + min, maxDelta);
    pendingSizes = { [regionId]: startSize + clamped,
                     [otherId]: otherStart - clamped };
    // Apply visually WITHOUT persisting. Solver runs to keep canvas correct.
    applyPreview(pendingSizes);
  }
  function onUp() {
    releaseCapture();
    commitSizes(pendingSizes);   // writes store; triggers debounced persist (Part 04)
    removeListeners();
  }
  setPointerCapture(e.pointerId);
  addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
}
```

Key rule: `onMove` calls the solver on every pointermove but writes only to a transient preview layer, NEVER to the persisted store, and NEVER to SQLite. Persistence is debounced and flushed on `onUp`, per Part 01 AI Notes and Part 04.

# Collapse and Restore

Collapse is a solver operation, not a CSS class.

```text
collapse(regionId):
  r = regions[regionId]
  if r.collapseMode == "none": return        // titleBar/statusBar/canvas cannot collapse
  if r.collapseMode == "rail":
      r.restoreSize = r.size                  // remember pre-collapse size
      r.size = r.railSize
      r.collapsed = true
  if r.collapseMode == "hidden":
      r.restoreSize = r.size
      r.size = 0
      r.collapsed = true
      r.visible = false
  runSolver()                                // reallocate freed px to canvas in same pass

restore(regionId):
  r = regions[regionId]
  r.size = clamp(r.restoreSize, min, max)    // restoreSize is always in range
  r.collapsed = false
  r.visible = true
  runSolver()
```

`restoreSize` is written at the moment of collapse, so a region restored after the window was resized returns to a size that is valid for the new container, not the old one.

# Invariants Enforced Here

```text
After every solveAxis pass:
  sum of all region sizes along an axis + splitters == container size
  every sizable region within [min,max] OR collapsed == true
  collapsed "rail" region size == railSize
  collapsed "hidden" region size == 0 and visible == false
  canvas.size >= ABSOLUTE_MIN_CANVAS UNLESS container < MIN_WINDOW_SIZE
```

# Rules

WorkspaceLayout solver MUST:

- run in one pass, never incrementally adjust one region then another
- clamp before summing, never sum then clamp
- reallocate freed pixels to `canvas` inside the same pass that collapses a region
- clamp `restoreSize` to the new container on restore
- ignore fractional sub-pixel drift by rounding only at the canvas assignment

WorkspaceLayout solver MUST NOT:

- let a region land outside `[minSize, maxSize]` while not collapsed
- leave `canvas` uncomputed
- persist during a drag (preview only)
- collapse a `collapseMode: "none"` region

# AI Notes

Do not adjust two regions by writing them individually and hope the canvas follows. Write `pendingSizes` for the two neighbors and let the solver recompute `canvas`. The moment you set `canvas.size` yourself, you have a second source of truth.

Do not store the drag delta in React state on every pointermove. That re-renders the whole shell at 240Hz. Write to a mutable ref and call the solver, which mutates the store's region sizes; subscribe the splitter's neighbors only.

Do not collapse by toggling a CSS class and leaving `size` unchanged. The sum equation then says the region is still 240px, the solver never reclaims the pixels, and `canvas` is 240px too small. Collapse is a solver op.

Do not let `restoreSize` drift. It is captured at collapse time and clamped at restore time. An implementer who writes `restoreSize = size` on every render will capture a half-collapsed value and restore into a broken state.

# Related Documents

- [[07-ui-ux/README]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part02]]
- [[WorkspaceLayout-Part04]]
- [[WorkspaceLayout-Part05]]
- [[WorkspaceLayout-Part06]]
- [[WorkspaceLayout-Diagrams]]
- [[ResponsiveRules-Part01]]
- [[Animations-Part01]]
- [[DesignTokens-Part01]]
- [[Panels-Part01]]
