---
title: NodeGraph Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[NodeGraph-Part01]]"
  - "[[NodeGraph-Part08]]"
---

# NodeGraph Diagrams

These diagrams illustrate the mirror-and-project model, the connection lifecycle, the event diff path, and the performance coalescing strategy from the NodeGraph parts.

## Tier 1 Mirror -> Projection -> React Flow

```mermaid
graph LR
  RT[(Runtime)] -->|Eulinx://graph/* events| BUS[EventBus]
  BUS --> MIR[Runtime Mirror - Tier 1]
  MIR -->|project per node| PROJ[Projected RFNodes/RFEdges]
  PROJ -->|reference-stable| RF[React Flow Render]
  RF -->|onNodeDragStop| INV[invoke Eulinx://graph/move]
  INV --> RT
```

## Connection Drag Lifecycle

```mermaid
flowchart TD
  A[pointerdown on output handle] --> B[pending connection - Tier 3]
  B --> C[pointer over input handle]
  C --> D{validate pair}
  D -->|local + deferred pass| E[accept highlight]
  D -->|reject| F[reject highlight + shake]
  E --> G[pointerup -> invoke Eulinx://graph/connect]
  F --> H[pointerup -> discard ghost]
  G --> M[(Mirror updated by runtime)]
```

## Event Diff and Paint (per frame)

```mermaid
sequenceDiagram
  participant RT as Runtime
  participant BUS as EventBus
  participant MIR as Mirror
  participant CO as Coalescer (1/frame)
  participant RF as React Flow
  RT->>BUS: node-updated x30 (one tick)
  BUS->>MIR: apply 30 deltas (seq-checked)
  BUS->>CO: scheduleFrame
  CO->>CO: rafPending? no -> requestAnimationFrame
  CO->>MIR: read
  CO->>RF: project (memoized) + render once
```

## Node Status Paint Layers

```mermaid
graph TD
  L0[Layer 0 - Edge SVG] --> L1[Layer 1 - Node Card]
  L1 --> L2[Layer 2 - Status Overlay]
  L2 --> L3[Layer 3 - Selection Ring - Tier 1]
  SRC[(node.status from mirror)] --> L2
  SEL[(selectionSet from Tier 1)] --> L3
```

## Viewport Culling

```mermaid
flowchart LR
  ALL[All projected nodes - in mirror] --> CULL{In viewport + margin?}
  CULL -->|yes| DOM[Rendered DOM nodes]
  CULL -->|no| SKIP[Skipped paint, still in mirror]
  DOM --> RF[React Flow]
```

## Bulk Operation Flow

```mermaid
flowchart TD
  U[User multi-select - Tier 1 set] --> CMD[invoke Eulinx://graph/bulk-delete ids]
  CMD --> RT[(Runtime applies atomically)]
  RT --> EV[Eulinx://graph/node-removed xN]
  EV --> MIR[Mirror prunes]
  MIR --> PROJ[Re-project + paint]
```

## Related Documents

- [[07-ui-ux/README]]
- [[NodeGraph-Part01]]
- [[NodeGraph-Part02]]
- [[NodeGraph-Part03]]
- [[NodeGraph-Part04]]
- [[NodeGraph-Part05]]
- [[NodeGraph-Part06]]
- [[NodeGraph-Part07]]
- [[NodeGraph-Part08]]
- [[EventBus-Part01]]
- [[DesignTokens-Part03]]
