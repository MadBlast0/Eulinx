---
title: NodeGraph Specification - Part 07
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - runtime-mirror
related:
  - "[[07-ui-ux/README]]"
  - "[[NodeGraph-Part03]]"
  - "[[NodeGraph-Part06]]"
  - "[[NodeGraph-Diagrams]]"
  - "[[EventBus-Part01]]"
---

# NodeGraph Specification (Part 07)

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

This part is the heart of the "UI renders backend truth" rule for the graph. It specifies how the EventBus feeds the runtime mirror, how the projection diffs, and how live status (running/idle/error) reaches the paint without a full re-render. The graph is a read-only view of the runtime; this part says exactly how that view stays live.

# The Mirror Update Path

The runtime never pushes the whole graph. It emits granular events. The UI applies them to the Tier 1 mirror and re-projects only what changed.

```text
Eulinx://graph/node-added      -> mirror.nodes.set(id, node)
Eulinx://graph/node-removed    -> mirror.nodes.delete(id); edges pruned
Eulinx://graph/node-moved      -> mirror.nodes.update(id, { position })
Eulinx://graph/node-updated    -> mirror.nodes.update(id, { data, status })
Eulinx://graph/edge-added      -> mirror.edges.set(id, edge)
Eulinx://graph/edge-removed    -> mirror.edges.delete(id)
Eulinx://graph/edge-updated    -> mirror.edges.update(id, { runtimeState })
Eulinx://graph/selection-set   -> mirror.selection = set (AI or remote)
Eulinx://graph/replaced        -> mirror.replace(graph) full swap (rare)
```

Each handler mutates the mirror immutably (new node object, same map reference pattern the projection memoizes on) and schedules one projection pass. The full-swap event is reserved for load and for undo/redo of large structural changes; it is not used for incremental edits.

# Diffing for Paint

Projection is keyed so that an unchanged node yields the same `RFNode` reference. The diff that matters is between the previous projection and the new one.

```text
for each node id in union(prev, next):
  if prev[id] === next[id]: React Flow sees no change (reference equal)
  else:                    React Flow re-paints that node only
```

This is why memoization in Part 03 exists. A `node-moved` event changes only that node's position; the other 200 nodes keep their references and are skipped by React Flow's reconciler. The graph stays at 60fps with hundreds of nodes because only the moved node re-renders.

# Live Status Projection

Node and edge status come from the mirror, not from a polling timer. The UI subscribes to `node-updated` and `edge-updated` and re-projects the affected item with its new status token.

```text
node.status:     idle | queued | running | success | error | paused
edge.runtimeState: idle | running | error

running node:    --node-status-running token, pulsing border (Animations)
error node:      --node-status-error token, solid red ring + tooltip
running edge:    animated dash, --graph-edge-running
```

The pulse is token-driven and respects `prefers-reduced-motion` ([[Accessibility-Part04]]). Status is never computed by the UI from a guess — it is always the value the runtime emitted. A node the runtime says is `idle` is painted idle even if the UI "thinks" it should be running.

# Structural Edits from the Runtime

Sometimes a Worker or a remote session changes the graph structure (adds a node, reconnects an edge). The UI reacts identically to a user action: apply to mirror, project, paint. There is no "user-made vs AI-made" branch in the paint path. This is the payoff of the mirror model — the graph does not care who moved the node.

```text
Worker adds node  -> Eulinx://graph/node-added -> mirror -> project -> paint
User  adds node   -> invoke returns node    -> mirror -> project -> paint
```

Both paths end in the same mirror mutation. The only difference is the trigger; the render path is one.

# Selection Echo

When the runtime emits `Eulinx://graph/selection-set` (an AI or another client selected nodes), the UI updates the Tier 1 selection set and the rings re-paint. No local state change is needed because the ring already reads from Tier 1 (Part 03). This is how an AI "pointing at" nodes is visible to the user with zero special-casing.

# Conflict and Ordering

Events can arrive out of order over the bus. The mirror handler is last-writer-wins per field but guarded so a stale `node-moved` (older timestamp) does not overwrite a newer one.

```text
apply(mirror, event):
  if event.seq <= mirror.lastSeq[nodeId]: drop (stale)
  else: apply; mirror.lastSeq[nodeId] = event.seq
```

Sequence numbers are runtime-issued. The UI never generates them. A dropped stale event is silent — the newer truth stands. This prevents the "node jumped back" flicker when a late packet arrives.

# AI Notes

Do not poll the runtime for graph state. Subscribe to EventBus events and apply granular deltas. Polling re-sends the whole graph on every tick and defeats the mirror's incremental design.

Do not let the UI compute node status. Status is runtime-emitted truth. Painting a "running" pulse because the UI inferred it from a local timer is exactly the invented-truth failure.

Do not branch the paint path on who made the edit. User edit and AI edit both end in a mirror mutation. A separate AI render path doubles the surface area for bugs.

Do not re-project the whole graph per event. Use reference-stable projection and per-node diffing. And do not apply stale events — drop by sequence number so late packets cannot move a node backward.

# Related Documents

- [[07-ui-ux/README]]
- [[NodeGraph-Part03]]
- [[NodeGraph-Part04]]
- [[NodeGraph-Part06]]
- [[NodeGraph-Part08]]
- [[NodeGraph-Diagrams]]
- [[EventBus-Part01]]
- [[Animations-Part02]]
- [[Accessibility-Part04]]
- [[DesignTokens-Part03]]
