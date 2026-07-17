---
title: Panels Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - panels
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[Panels-Part01]]"
  - "[[Panels-Part06]]"
---

# Panels Diagrams

These diagrams show the split-tree model, the content contract, the persistence tiers, and the focus path inside a panel.

## Split Tree Model

```mermaid
graph TD
  ROOT[panel root] --> S1[split row]
  S1 --> G1[group: terminal]
  S1 --> S2[split col]
  S2 --> G2[group: chat]
  S2 --> G3[group: log]
  G1 --> T1[tab terminal-1]
  G2 --> T2[tab chat-1]
  G3 --> T3[tab log-1]
```

## Content Contract

```mermaid
graph TD
  P[Panel Tab] --> C[PanelContent]
  C --> M[mount]
  C --> F[onFocusIn]
  C --> A[onTabSwitchAway - pause]
  C --> X[onClose - cleanup]
  C --> R[ariaRole]
```

## State Tiers

```mermaid
graph LR
  T1[Tier 1 - persist: split tree, tabs, activeTabId] --> STORE[(PanelPersist per workspace)]
  T2[Tier 2 - view: scroll, autoscroll pin, collapsed] --> VIEW[(view state)]
  T3[Tier 3 - ephemeral: focus, hover, drag ghost] --> EP[(not stored)]
```

## Focus Path Inside a Panel

```mermaid
flowchart TD
  GLOBAL[Global cycle: ... -> panel -> ...] --> STRIP[Tab strip - roving]
  STRIP --> CONTENT[Active content focus]
  CONTENT -->|global shortcut| GLOBAL
  STRIP -->|Arrow| STRIP
```

## Collapse Preserves Tier 1

```mermaid
stateDiagram-v2
  [*] --> Expanded: content mounted
  Expanded --> Collapsed: region collapse (unmount DOM)
  Collapsed --> Expanded: expand (remount from PanelPersist)
  Collapsed --> [*]: Tier 1 arrangement preserved throughout
```

## Related Documents

- [[07-ui-ux/README]]
- [[Panels-Part01]]
- [[Panels-Part02]]
- [[Panels-Part03]]
- [[Panels-Part04]]
- [[Panels-Part05]]
- [[Panels-Part06]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[TerminalView-Part01]]
- [[Accessibility-Part01]]
- [[KeyboardShortcuts-Part01]]
