---
title: Sidebar Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - sidebar
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[Sidebar-Part01]]"
  - "[[Sidebar-Part04]]"
---

# Sidebar Diagrams

These diagrams show the navigation tree model, the selection-to-canvas flow, the collapse/rail states, and the state tiers for the sidebar.

## Navigation Tree (projected from Tier 1)

```mermaid
graph TD
  W[Workspace] --> G[Graphs]
  W --> WO[Workers]
  W --> R[Resources]
  W --> S[Settings]
  G --> GA[graph-a]
  G --> GB[graph-b]
  WO --> W1[worker-1]
  WO --> W2[worker-2]
```

## Selection Drives Shared Tier 1

```mermaid
flowchart LR
  SEL[Sidebar select] --> AG[set activeGraphId - Tier 1]
  SEL --> SS[set selectionSet - Tier 1]
  AG --> CANVAS[Canvas renders graph]
  SS --> INSPECT[Inspector shows worker]
```

## Collapse / Rail States

```mermaid
stateDiagram-v2
  [*] --> Expanded: full tree
  Expanded --> Rail: Ctrl+B (Tier 2)
  Rail --> Hidden: toggle
  Hidden --> Expanded: Ctrl+B
  Rail --> Expanded: icon click
```

## State Tiers

```mermaid
graph LR
  T1[Tier 1: tree + selection - mirror] --> M[(Runtime Mirror)]
  T2[Tier 2: section collapse, region mode] --> P[(SidebarPersist)]
  T3[Tier 3: focus, hover, anim] --> E[(ephemeral)]
```

## Badge Flow (metadata only)

```mermaid
flowchart LR
  BUS[EventBus: worker/status-changed] --> SIDE[Sidebar Workers badge]
  BUS -.->|NOT bytes| SIDE
```

## Related Documents

- [[07-ui-ux/README]]
- [[Sidebar-Part01]]
- [[Sidebar-Part02]]
- [[Sidebar-Part03]]
- [[Sidebar-Part04]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[Panels-Part05]]
- [[NodeGraph-Part01]]
- [[NodeGraph-Part03]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
