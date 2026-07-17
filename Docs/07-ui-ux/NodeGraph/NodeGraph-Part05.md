---
title: NodeGraph Specification - Part 05
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - connections
related:
  - "[[07-ui-ux/README]]"
  - "[[NodeGraph-Part02]]"
  - "[[NodeGraph-Part04]]"
  - "[[NodeGraph-Diagrams]]"
  - "[[EventBus-Part01]]"
---

# NodeGraph Specification (Part 05)

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

This part specifies how a connection is made: the drag from an output handle, the validation that decides whether a drop target is legal, and how a committed edge is rendered and stored. Connection validation is a UI concern that mirrors runtime type rules, but the UI NEVER invents types — it asks the runtime via `invoke` when it cannot decide locally from cached schema.

# Connection Drag Lifecycle

```text
1. pointerdown on an output handle        -> start pending connection
2. pointer moves over canvas              -> draw ghost bezier to cursor
3. pointer enters an input handle         -> validate(handlePair)
4a. valid    -> handle highlights accept
4b. invalid  -> handle highlights reject, drop is a no-op
5. pointerup on valid input handle        -> commit edge via invoke
5. pointerup elsewhere                    -> discard ghost
```

The pending connection is Tier 3 ephemeral. It is never mirrored and never persisted. If the user reloads mid-drag, the connection is simply gone — there is nothing to restore.

# Validation Rules

Validation answers: "can `source.out` legally feed `target.in`?" The UI holds a cached type schema (a Tier 2 projection of runtime schema) for fast local checks, but defers to `invoke` when the schema is missing or a custom validator is registered.

```text
local rules (instant, no IPC):
  - cannot connect a node to itself
  - output -> input direction only (never input -> input)
  - one edge per input handle (input is single-consumer)
  - type-compatible per cached schema

deferred rules (invoke Eulinx://graph/validate-connection):
  - custom runtime validators (e.g., schema-referenced types)
  - cross-graph references
  - when cached schema is stale/missing
```

The key clause: the UI may show a provisional accept from local rules, but a deferred reject overrides it. The UI must not present a connection as legal if the runtime later rejects it. This is the "UI never invents truth" rule applied to types.

# The Pending Edge Visual

While dragging, a ghost edge is drawn from the source handle to the cursor. It uses the `pending` token class, distinct from a committed edge.

```text
ghost edge:        dashed, --graph-edge-pending color, no arrowhead
accept highlight:  target handle gets --node-port-accept ring
reject highlight:  target handle gets --node-port-reject ring + shake
```

The shake is a token-driven micro-animation (see [[Animations-Part02]]) and is reduced/removed under `prefers-reduced-motion` per [[Accessibility-Part04]].

# Committing an Edge

On a valid drop, the UI issues a single command. It does NOT optimistically add the edge to the mirror; it waits for the runtime to confirm.

```ts
async function commitEdge(source: HandleId, target: HandleId) {
  const edge = await invoke("Eulinx://graph/connect", { source, target });
  // runtime returns the canonical edge; UI projects it into the mirror
  // optimistic paint only if runtime returns 202 + temp edge id
}
```

The non-optimistic default prevents the "phantom edge" bug where the UI shows a connection the runtime rejected for a reason the UI did not know. If the runtime supports optimistic temp ids, the UI may paint the temp edge and reconcile on confirm; if not, it waits. The UI never decides the edge exists.

# Edge Rendering

A committed edge is painted in the SVG layer (Layer 0 of Part 03). Its appearance is a pure projection of `edge.runtimeState`.

```text
edge base:        solid bezier, --graph-edge stroke
edge running:     animated dash flow (Eulinx-edge-running class)
edge error:       solid red (--graph-edge-error) + tooltip on hover
edge selected:    thicker stroke from Tier 1 selection set
edge label:       optional type label at midpoint, token font
```

Edge endpoints are recomputed by React Flow from `source`/`target` handle ids; Eulinx never manually positions edge control points. If a node moves, the edge follows automatically because the handle ids are stable.

# Reconnection and Deletion

Dragging an existing edge's endpoint re-runs the same validation as a new connection. Deleting an edge issues `Eulinx://graph/disconnect { edgeId }`; the edge disappears from the mirror when the runtime confirms removal.

```text
reconnect start:  pointerdown on edge endpoint handle
reconnect drop:   validate new pair, commit via Eulinx://graph/reconnect
delete:           select edge + Delete key, or context menu -> disconnect
```

Multi-edge selection deletion (Part 06) batches all `disconnect` calls into one command invocation where the runtime supports it; otherwise it fires them in a single frame.

# AI Notes

Do not let the UI invent connection legality. Local rules are a fast path, but a deferred runtime reject must win. The UI presenting a connection as valid that the runtime rejects is the exact "UI invents truth" failure the architecture forbids.

Do not optimistically commit edges by default. Wait for the runtime. Phantom edges that vanish a frame later destroy user trust in the graph. Optimistic paint is allowed only with a runtime-issued temp id.

Do not store the pending connection. It is a drag affordance, Tier 3. Persisting it would create half-made edges on reload.

Do not manually position edge paths. Let React Flow derive geometry from stable handle ids. Manual control points break the moment a node moves and produce detached edges.

# Related Documents

- [[07-ui-ux/README]]
- [[NodeGraph-Part02]]
- [[NodeGraph-Part03]]
- [[NodeGraph-Part04]]
- [[NodeGraph-Part06]]
- [[NodeGraph-Diagrams]]
- [[EventBus-Part01]]
- [[Animations-Part02]]
- [[Accessibility-Part04]]
- [[DesignTokens-Part03]]
