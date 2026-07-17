---
title: NodeGraph Specification - Part 08
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - performance
related:
  - "[[07-ui-ux/README]]"
  - "[[NodeGraph-Part03]]"
  - "[[NodeGraph-Part07]]"
  - "[[NodeGraph-Diagrams]]"
  - "[[DesignTokens-Part01]]"
---

# NodeGraph Specification (Part 08)

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

This part specifies the performance contract and the implementation checklist. A Eulinx graph must stay interactive at 500 nodes / 1000 edges on a mid-range laptop. The strategy is reference-stable projection (Part 03/07), per-frame coalescing, and viewport culling. No feature in Parts 01-07 is allowed to break these numbers.

# Performance Budget

```text
frame budget:        16.6ms (60fps)
node paint (single): < 1ms
graph idle CPU:      ~0 (no per-frame work without interaction)
event->paint latency:< 1 frame for a single node update
zoom/pan:            maintains 60fps at 500 nodes
```

These are measured on the reference hardware: integrated GPU, 4-core CPU, 16GB RAM. The cheap-coding-model constraint ([[07-ui-ux/README]]) means the implementation must be simple enough for a small model to get right; aggressive micro-optimization that a weak model cannot reproduce is explicitly rejected in favor of the structural wins (memoization, culling).

# Viewport Culling

Nodes fully outside the viewport (plus a margin) are not passed to React Flow. This keeps the rendered DOM node count proportional to what is visible, not to graph size.

```text
visibleNodes = projectedNodes.filter(inViewport(node, vp, margin))
margin = 200px (buffer so pan does not pop nodes)
culled nodes:  not in DOM, but still in mirror (selectable by AI)
```

Culling is a render decision only. Selection, AI queries, and bulk ops operate on the full mirror, never on the culled set. A node off-screen is still real.

# Coalescing

The EventBus handler batches mirror mutations and schedules exactly one projection + one React render per animation frame, regardless of how many events arrived.

```text
onEvent(e):  applyToMirror(e); scheduleFrame(projectAndRender)
scheduleFrame: if !rafPending: rafPending = true; requestAnimationFrame(flush)
flush: rafPending = false; project(); render()
```

Without coalescing, a Worker emitting 30 `node-updated` events in one tick would trigger 30 projections. With it, one. This is the single most important perf rule for a busy graph.

# Memoization Recap

```text
- Per-node projection memoized on (position, status, version)
- Reference-stable RFNode objects (Part 03)
- Per-node diff so unchanged nodes are skipped by React Flow
- Edge projection memoized on (endpoints, runtimeState)
```

This is restated here because it is load-bearing for the budget. If memoization is removed "for simplicity," the graph degrades to slideshow speeds at 100 nodes and a weak coding model will not notice until it is shipped.

# The Implementation Checklist

```text
[ ] React Flow used as renderer only; no truth in its node.data.
[ ] Viewport is Tier 3; never mirrored, never workflow truth.
[ ] Projection memoized per node; reference-stable objects.
[ ] Event handler coalesces to one project+render per frame.
[ ] Stale events dropped by sequence number.
[ ] Selection is Tier 1; ring reads from it; AI can echo it.
[ ] Connections validated locally fast, deferred to runtime on doubt.
[ ] Edges committed via invoke; no default optimistic commit.
[ ] Viewport culling active; culled nodes still in mirror.
[ ] Status painted only from runtime-emitted values.
[ ] prefers-reduced-motion respected on all status animations.
[ ] Bulk ops issue one command with id list, not per-node invokes.
[ ] 500 nodes / 1000 edges meet the frame budget on reference HW.
```

# Known Limitations (v1)

```text
- No off-screen WebGL rendering; DOM nodes cap practical size near
  ~2000 nodes before culling alone cannot hold 60fps. A future
  canvas renderer is an ADR, not a v1 change.
- Group collapse hides members but keeps them in the mirror; very
  large collapsed groups still cost mirror memory, not paint.
- Minimap renders all nodes (not culled) since it shows the whole
  graph; at 2000+ nodes the minimap itself may need culling later.
```

# AI Notes

Do not remove memoization to "simplify" the code. The cheap-model constraint cuts the other way: a simple, structural win (reference-stable projection) is exactly what a weak model can maintain. Hand-rolled per-node diffing is the thing to keep, not delete.

Do not project per event. Coalesce. A graph that re-renders on every `node-updated` will fall over the instant a Worker gets busy, which is the normal case for this app.

Do not cull from the mirror. Culling is a paint decision. A node off-screen is still selectable, still real, still queryable by an AI. Culling the mirror makes AI selections silently miss nodes.

Do not let status animation ignore reduced-motion. A graph full of pulsing nodes is unusable for many users. The token system provides the off-switch; use it.

# Related Documents

- [[07-ui-ux/README]]
- [[NodeGraph-Part03]]
- [[NodeGraph-Part04]]
- [[NodeGraph-Part05]]
- [[NodeGraph-Part06]]
- [[NodeGraph-Part07]]
- [[NodeGraph-Diagrams]]
- [[EventBus-Part01]]
- [[Animations-Part02]]
- [[Accessibility-Part04]]
- [[DesignTokens-Part03]]
