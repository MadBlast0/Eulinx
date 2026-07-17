---
title: TerminalCards Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-cards
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalCards-Part01]]"
  - "[[TerminalCards-Part06]]"
---

# TerminalCards Diagrams

These diagrams show the card-as-preview model, the metadata-only event subscription, the expand handoff, and the virtualization boundary.

## Card Is a Preview, Not a PTY

```mermaid
graph TD
  PTY[(PTY)] -->|data bytes| TV[TerminalView - live]
  PTY -->|snapshot frame| PREV[Preview Cache]
  PREV --> CARD[TerminalCard - read-only glance]
  CARD -->|expand| TV
```

## Metadata-Only Subscription

```mermaid
flowchart LR
  BUS[EventBus] -->|Eulinx://terminal/data (bytes)| TV[TerminalView]
  BUS -->|Eulinx://terminal/exit| CARD[Card - badge]
  BUS -->|Eulinx://terminal/alert| CARD
  BUS -->|Eulinx://terminal/title| CARD
  CARD -.->|NOT subscribed to bytes| BUS
```

## Expand Handoff

```mermaid
stateDiagram-v2
  [*] --> Card: shown in grid (preview)
  Card --> Expand: Enter / Expand action
  Expand --> TerminalView: invoke Eulinx://terminal/focus
  TerminalView --> Card: dismiss card (terminal keeps running)
  TerminalView --> [*]: close terminal
```

## Virtualization Boundary

```mermaid
flowchart LR
  MIRROR[Card models in mirror] --> WIN[Visible window + buffer]
  WIN --> MOUNT[Mounted cards - painted]
  MIRROR --> OFF[Off-screen cards]
  OFF -.->|scroll into view| MOUNT
```

## Status Projection (single source)

```mermaid
graph TD
  TAB[Tier 1 Tab Lifecycle] --> TV[TerminalView status]
  TAB --> CARD[Card status dot]
  TAB --> BADGE[Card badges]
```

## Related Documents

- [[07-ui-ux/README]]
- [[TerminalCards-Part01]]
- [[TerminalCards-Part02]]
- [[TerminalCards-Part03]]
- [[TerminalCards-Part04]]
- [[TerminalCards-Part05]]
- [[TerminalCards-Part06]]
- [[TerminalView-Part01]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[NodeGraph-Part08]]
- [[EventBus-Part01]]
