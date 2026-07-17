---
title: TerminalView Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-view
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalView-Part01]]"
  - "[[TerminalView-Part06]]"
---

# TerminalView Diagrams

These diagrams show the PTY byte path over the two channels, the tab lifecycle, the grid/resize flow, and the accessibility boundary for the terminal surface.

## Two-Channel PTY Path

```mermaid
graph LR
  UI[Terminal UI] -->|invoke Eulinx://terminal/write| RS[Rust PTY Bridge]
  RS -->|spawn/resize/kill| PTY[(PTY Process)]
  PTY -->|stdout/stderr bytes| RS
  RS -->|listen Eulinx://terminal/data| UI
  UI -->|xterm.write bytes| GRID[xterm.js Grid]
```

## Tab Lifecycle

```mermaid
stateDiagram-v2
  [*] --> spawning: invoke spawn
  spawning --> running: first data event
  running --> exited: Eulinx://terminal/exit
  running --> killing: invoke kill
  killing --> exited: exit event
  exited --> running: restart (keeps id)
  exited --> [*]: close
  running --> detached: moved to panel group
  detached --> running: returned
```

## Grid Resize Flow

```mermaid
flowchart TD
  RO[ResizeObserver] --> M[measure container]
  M --> C[cols = floor(w / cellW), rows = floor(h / cellH)]
  C --> X[xterm.resize cols,rows - immediate]
  C --> D[debounce 150ms]
  D --> I[invoke Eulinx://terminal/resize]
  I --> P[PTY winsize updated]
  P --> O[next output confirms geometry]
```

## Copy / Paste Direction

```mermaid
flowchart LR
  SEL[xterm selection] --> COPY[getSelection -> clipboard]
  CLIP[clipboard] --> PASTE[invoke Eulinx://terminal/write]
  PASTE --> PTY[(PTY echoes)]
```

## Accessibility Boundary

```mermaid
graph TD
  CHROME[Accessible Chrome: tabs, search, controls] --> A11Y[aria-label, tabindex, aria-live]
  GRID[xterm canvas - opaque to SR] --> SR[last-line snapshot + status announce]
  SHORTCUT[Global focus shortcuts] -->|captured at shell| ESC[leave terminal]
```

## Related Documents

- [[07-ui-ux/README]]
- [[TerminalView-Part01]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[TerminalView-Part04]]
- [[TerminalView-Part05]]
- [[TerminalView-Part06]]
- [[TerminalCards-Part01]]
- [[Panels-Part01]]
- [[EventBus-Part01]]
- [[Accessibility-Part01]]
