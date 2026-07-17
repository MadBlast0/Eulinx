---
title: WorkspaceLayout Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - workspace-layout
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[WorkspaceLayout-Part01]]"
  - "[[WorkspaceLayout-Part06]]"
---

# WorkspaceLayout Diagrams

These diagrams illustrate the region model, the resize solver, the focus cycle, and the window-too-small degrade path described in the WorkspaceLayout parts. All runtime interaction flows through the two channels defined in [[07-ui-ux/README]] and [[EventBus-Part01]].

## Region Layout Skeleton

```mermaid
graph TD
  W[AppShell / Tauri Window] --> T[titleBar]
  W --> B[Body Region]
  W --> S[statusBar]
  B --> SB[sidebar]
  B --> C[canvas]
  B --> I[inspector]
  B --> P[panel]
  C --> CS[canvas.size - derived, never stored]
  SB --> SBS[sidebar.size]
  I --> IS[inspector.size]
  P --> PS[panel.size]
```

## Resize Solver Invariant (Sum Preservation)

```mermaid
flowchart LR
  R[Resize Event / Container Change] --> S[Solver: compute target region size]
  S --> C{Within min/max?}
  C -->|Yes| A[Apply, recompute others to preserve sum]
  C -->|No| D[Clamp to constraint]
  D --> A
  A --> E[canvas.size derived from subtraction]
  E --> F[Emit Eulinx://layout/didChange only if changed]
```

## Focus Cycle (Tab Ring)

```mermaid
graph LR
  SB[sidebar] --> CV[canvas]
  CV --> IN[inspector]
  IN --> PN[panel]
  PN --> SB
  SH[titleBar / statusBar] -.->|controls only, not tab stops| SB
```

## Region Visibility and Focus Re-Home

```mermaid
stateDiagram-v2
  [*] --> Visible
  Visible --> Collapsed: user collapses region
  Collapsed --> Hidden: size reaches 0
  Hidden --> Visible: reopen tab / expand
  Collapsed --> Focused: region holds keyboard
  Focused --> CanvasFocus: Rule 1 - focused region collapsed, re-home to canvas
  CanvasFocus --> Visible
```

## Window-Too-Small Degrade Axis

```mermaid
flowchart TD
  WR[Eulinx://window/resized below MIN_WINDOW_SIZE] --> D1[sidebar -> rail]
  D1 --> D2[inspector -> hidden]
  D2 --> D3[panel -> hidden]
  D3 --> D4[canvas below floor as last resort]
  D4 --> O[window-too-small overlay if still below minimum]
  D1 -. restore on next resize .-> R[re-run solver, restore from restoreSize]
  D2 -. .-> R
  D3 -. .-> R
```

## DPI / Monitor Change Resize Sequence

```mermaid
sequenceDiagram
  participant OS as OS / Tauri
  participant WC as Window Controller
  participant SV as Solver
  participant SC as State (Tier 2)
  OS->>WC: scale factor changed
  WC->>WC: newContainerSize = innerSize * scaleFactor
  WC->>SV: solve(newContainerSize, layout)
  SV->>SC: canvas.size = newContainer - (sidebar + inspector + panel)
  WC->>WC: ResizeObserver reports new contentRect
  WC->>SV: ack (no change expected)
```

## Related Documents

- [[07-ui-ux/README]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part02]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[WorkspaceLayout-Part05]]
- [[WorkspaceLayout-Part06]]
- [[ResponsiveRules-Part01]]
- [[EventBus-Part01]]
