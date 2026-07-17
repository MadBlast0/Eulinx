---
title: NodeGraph Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - viewport
related:
  - "[[07-ui-ux/README]]"
  - "[[NodeGraph-Part03]]"
  - "[[NodeGraph-Part05]]"
  - "[[NodeGraph-Diagrams]]"
  - "[[Animations-Part01]]"
---

# NodeGraph Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Surface Registry, and the Graph as a View
Part 02 - The Node Model, the Edge Model, and the Selection Contract
Part 03 - Rendering Pipeline, Viewport, and the React Flow Contract
Part 04 - Pan/Zoom, Minimap, and the Node Toolbar
Part 05 - Connection Dragging, Validation, and Edge Rendering
Part 06 - Context Menus, Multi-Select, and Bulk Operations
Part 07 - Diffing, Live Status, and the Runtime Mirror
Part 08 - Performance, Virtualization, and the Implementation Checklist
Diagrams - NodeGraph-Diagrams.md

# Purpose of This Part

This part specifies pan/zoom behavior, the minimap, and the per-node floating toolbar. These are pure view controls. None of them change workflow truth. Panning moves the viewport (Tier 3). Zooming changes the viewport scale. The minimap is a compressed viewport widget. The node toolbar is a hover affordance that issues commands.

# Pan Behavior

```text
pan mode:          drag on empty canvas (pointer, not on a node)
pan speed:         viewport translate follows pointer 1:1
pan bounds:        soft limit at graphBounds * 2; hard stop at * 4
inertia:           none (design decision: deterministic, no drift)
pan while dragging  a node: disabled; node drag wins
```

Pan is committed to the Tier 3 viewport store on every move but is NOT projected and NOT mirrored. There is no `Eulinx://` event for pan; the backend neither knows nor cares where the user is looking. This keeps the runtime free of view noise.

# Zoom Behavior

```text
zoom range:        0.2 (min) .. 2.5 (max)
zoom step (wheel): 1.1x per notch, clamped
zoom to cursor:    yes - the point under the cursor stays fixed
zoom on pinch:     trackpad pinch maps to wheel-zoom with finer step
zoom buttons:      + / - / fit-view in the graph control cluster
fit-view:          frames all nodes with 80px padding, zoom clamped
```

Zoom-to-cursor is mandatory: zooming into the top-left corner while the user looked at the bottom-right is the classic "where did my graph go" bug. The transform math keeps the cursor's flow coordinate invariant across the zoom.

```ts
function zoomAt(cursor: Point, nextZoom: number, vp: Viewport): Viewport {
  const flowX = (cursor.x - vp.x) / vp.zoom;
  const flowY = (cursor.y - vp.y) / vp.zoom;
  return {
    zoom: nextZoom,
    x: cursor.x - flowX * nextZoom,
    y: cursor.y - flowY * nextZoom,
  };
}
```

# The Minimap

The minimap is a non-interactive overview rendered bottom-right, above the status bar but inside the canvas region. It shows node rectangles scaled to fit and a viewport rectangle showing the current view.

```text
minimap position:    canvas bottom-right, 8px inset
minimap size:        token --graph-minimap-size (default 200x140)
node color:          from node.status token, dimmed 40%
viewport rect:       live, follows viewport on every pan/zoom
click-to-pan:        disabled (prevents disorientation); drag scrolls
```

Click-to-pan is deliberately disabled. Users who click the minimap and land elsewhere report "the graph jumped." Drag-to-scroll the viewport rect is allowed because it is a continuous, predictable motion.

# The Graph Control Cluster

A small fixed cluster bottom-left holds zoom controls and view helpers. It is part of the canvas, not a separate region.

```text
[ - ]  zoom out
[ % ]  reset zoom to 100% (shows current %)
[ + ]  zoom in
[ ⤢ ]  fit view
[ ◳ ]  toggle minimap
[ ⊞ ]  toggle node-snap grid
```

These controls issue local viewport commands only. They never reach the runtime. They are keyboard-accessible (see [[KeyboardShortcuts-Part02]]) and carry `aria-label`s from [[Accessibility-Part02]].

# The Node Toolbar

Each node shows a floating toolbar on hover/focus. It is an overlay, not part of the node body, so it does not shift node layout when it appears.

```text
toolbar actions:
  - run        invoke Eulinx://graph/run-node { nodeId }
  - inspect    open inspector for nodeId (Part of Panels)
  - duplicate  invoke Eulinx://graph/duplicate-node { nodeId }
  - delete     invoke Eulinx://graph/delete-node { nodeId }
  - comment    toggle a sticky note attached to nodeId
```

The toolbar is keyboard-reachable: focusing a node (Tab into the canvas) reveals it and `Arrow`/`Enter` activates items. It must never be the only way to perform an action — every toolbar action has a context-menu and a keyboard equivalent. This satisfies the "no dead ends" accessibility rule.

# Snap Grid

When node-snap is enabled, dragged nodes settle to a grid defined by a token.

```text
grid size:         token --graph-grid (default 16px)
snap on drag:      node position rounded to nearest grid on dragStop
snap on paste:     pasted nodes offset to nearest free grid cell
visual grid:       faint dot layer when snap enabled, hidden otherwise
```

The grid is a view aid. Node positions in the mirror are still continuous floats; the grid is applied at commit time only. The backend never sees "snapped" coordinates as different from any other coordinates.

# AI Notes

Do not emit runtime events for pan/zoom. The backend does not need to know the user scrolled. Treat viewport as pure Tier 3. If you find yourself wanting `Eulinx://graph/viewport-changed`, stop — that is view noise leaking into the runtime.

Do not disable zoom-to-cursor for convenience. The math is a few lines; skipping it produces a disorienting zoom that users blame on the app, not on themselves.

Do not make the minimap clickable-to-jump. It reads as helpful but produces "the graph vanished" reports. Drag-scroll only.

Do not put actions only in the node toolbar. A toolbar that vanishes on blur with no keyboard or context-menu equivalent is an accessibility dead end. Every toolbar item is a command with at least two other entry points.

# Related Documents

- [[07-ui-ux/README]]
- [[NodeGraph-Part03]]
- [[NodeGraph-Part05]]
- [[NodeGraph-Diagrams]]
- [[Animations-Part01]]
- [[KeyboardShortcuts-Part02]]
- [[Accessibility-Part02]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part03]]
- [[Panels-Part01]]
