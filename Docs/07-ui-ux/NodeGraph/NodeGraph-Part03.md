---
title: NodeGraph Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - rendering
related:
  - "[[07-ui-ux/README]]"
  - "[[NodeGraph-Part01]]"
  - "[[NodeGraph-Part02]]"
  - "[[NodeGraph-Diagrams]]"
  - "[[DesignTokens-Part01]]"
  - "[[EventBus-Part01]]"
---

# NodeGraph Specification (Part 03)

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

This part specifies how the graph is actually painted: the React Flow contract, the viewport state, and the rendering pipeline. The graph is a Tier 2 view of a Tier 1 runtime mirror. React Flow owns the pixels; Eulinx owns the truth. This part nails down which of React Flow's state Eulinx is allowed to keep and which it must compute from the runtime mirror.

# The React Flow Contract

React Flow is a rendering library, not a state store. Eulinx uses it for node/edge painting, pan/zoom, and interaction hit-testing. Eulinx does NOT use React Flow's internal node data as the source of truth. Every node rendered is projected from `graphState` in the Tier 1 runtime mirror.

```text
React Flow owns:  viewport transform, internal hit regions, drag math,
                 edge path geometry, zoom-to-fit math, selection box UI

Eulinx owns:        node positions (projected), node data (projected),
                 edge endpoints (projected), selection set (Tier 1),
                 everything that a Worker Agent could change
```

The forbidden pattern: storing node `data` inside React Flow and reading it back to decide what an AI sees. If a Worker moves a node, the runtime mirror changes; the projection re-renders. The AI never reads the DOM.

# The Viewport State

The viewport (pan + zoom) is Tier 3 ephemeral per the State Ownership Model — it is a viewing preference, not workflow truth. It is kept in a local store but is NOT persisted to the runtime mirror and NOT persisted to disk unless the user explicitly saves the view.

```ts
interface Viewport {
  x: number;       // translation X in flow coords
  y: number;       // translation Y in flow coords
  zoom: number;    // 0.2 .. 2.5 clamp, see Part 04
}
```

The viewport is the one graph property that is NOT projected from the runtime. It is computed by the user's hands and by `fitView`. On workspace switch it resets to the stored per-graph view (see Part 08).

# The Rendering Pipeline

```text
runtimeMirror.graphState
        |
        v  (project)
projectedNodes = graphState.nodes.map(projectNode)
projectedEdges = graphState.edges.map(projectEdge)
        |
        v
<ReactFlow nodes={projectedNodes} edges={projectedEdges}
           onNodesChange={localOnly} onEdgesChange={localOnly}
           onNodeDragStop={commitPosition}
           fitView={!hasStoredView} />
        |
        v
paint (edges: SVG layer, nodes: DOM layer)
```

`projectNode` is a pure function: `RuntimeNode -> RFNode`. It never mutates the runtime mirror. If a Worker changes `node.status`, the mirror updates, the projection re-runs, the node re-paints with the new status token. The mapping is memoized on `node.id` plus a version field so unrelated node changes do not re-render the whole graph.

# Node Paint Layers

A node is painted in two stacked layers so that edges stay behind nodes and the status ring stays above content.

```text
Layer 0  edge SVG layer (painted by React Flow, below all nodes)
Layer 1  node card (background token, border, header, ports)
Layer 2  status overlay (running pulse, error ring, hover toolbar)
Layer 3  selection ring (driven by Tier 1 selection set, never local)
```

The status overlay reads `node.status` from the projection. It does not subscribe to React Flow internals; it reads the same mirror the projection used. This is how live status (Part 07) updates without a full graph re-render.

# Edge Paint and Handles

Edges connect output handles to input handles. A handle is identified by `nodeId::handleId`. The edge model from Part 02 carries both endpoint ids. React Flow uses them to compute the bezier; Eulinx uses them to validate reconnection (Part 05).

```text
edge.source     = "worker-3::out-0"
edge.target     = "worker-7::in-0"
edge.animated   = projected from edge.runtimeState (running/idle)
edge.className  = edge.status === "error" ? "rf-edge-error" : ""
```

The `animated` flag is a view signal derived from the runtime, not gameplay truth. A running edge pulses; an errored edge paints solid red with the error token. Neither is stored in React Flow's edge object as truth — both are projected.

# The Selection Ring

The selection ring is the only node decoration driven by the Tier 1 selection set rather than by React Flow's local selection. This is deliberate: multi-select that an AI triggers (Part 06) must look identical to a user shift-click, and only a shared Tier 1 set gives that.

```text
selectionRingVisible(nodeId) = selectionSet.has(nodeId)   // Tier 1
```

React Flow's `selected` prop is reconciled to this set on every projection. Local drag-select updates the set through the controller, not through React Flow's own state, so the AI and the user share one source.

# Projection Memoization

Re-projecting the entire graph on every mirror tick is the standard way to make a node graph feel like a slideshow. The contract:

```text
- Memoize each node projection on (position, status, version).
- Memoize each edge projection on (endpoints, runtimeState).
- Reuse the same RFNode object reference when unchanged so React
  Flow's reconciliation is a no-op.
- Batch mirror updates: the EventBus handler coalesces
  Eulinx://graph/node-updated into one projection pass per frame.
```

The coalescing matters because the runtime can emit many `node-updated` events in a single tick (a Worker stepping through sub-steps). One projection per frame, not one per event.

# AI Notes

Do not store workflow truth in React Flow. The moment `node.data` becomes the source an AI reads, the UI has inverted the ownership model and the runtime mirror is bypassed. Project from the mirror; treat React Flow as a pure renderer.

Do not persist the viewport as if it were the graph. Pan and zoom are the user's eyes, not the workflow. Persisting them is harmless only when explicitly saved; never treat them as workflow state.

Do not let the selection ring read from React Flow local state. The ring is Tier 1. A ring driven by local selection breaks the "AI and user share one selection" rule in Part 06.

Do not re-project the whole graph per event. Coalesce to one pass per frame. A graph that re-renders 40 nodes because one Worker changed status will drop frames the instant the workflow gets busy.

# Related Documents

- [[07-ui-ux/README]]
- [[NodeGraph-Part01]]
- [[NodeGraph-Part02]]
- [[NodeGraph-Part04]]
- [[NodeGraph-Diagrams]]
- [[EventBus-Part01]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part03]]
- [[Accessibility-Part02]]
