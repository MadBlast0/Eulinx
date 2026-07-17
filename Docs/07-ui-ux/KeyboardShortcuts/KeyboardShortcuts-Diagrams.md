---
title: KeyboardShortcuts Diagrams
status: draft
version: 1.0
tags:
  - ui-ux
  - keyboard-shortcuts
  - diagrams
related:
  - "[[07-ui-ux/README]]"
  - "[[KeyboardShortcuts-Part01]]"
  - "[[KeyboardShortcuts-Part04]]"
---

# KeyboardShortcuts Diagrams

These diagrams show the binding registry, scope precedence, the modal/focus-restore flow, and conflict resolution.

## Binding Registry (data, not handlers)

```mermaid
graph LR
  COMP[Component] -->|dispatch(commandId)| REG[Binding Registry]
  REG -->|chord| KEY[Key Event]
  REG -->|command| ACT[Action]
  USER[User overrides] -->|by commandId| REG
```

## Scope Precedence

```mermaid
graph TD
  G[global] --> P[panel]
  P --> GR[graph]
  GR --> T[terminal - wins]
  T --> EX[Ctrl+C = copy/send]
```

## Modal Focus / Restore

```mermaid
stateDiagram-v2
  [*] --> Open: capture previousFocus
  Open --> Trap: focus inside modal
  Trap --> Close: Escape / run
  Close --> Restore: focus -> trigger or command target
  Restore --> [*]
```

## Conflict Resolution

```mermaid
flowchart TD
  TIE[chord claimed by 2 bindings] --> S[most specific scope wins]
  S --> U[user override beats default]
  U --> F[first-registered wins - deterministic]
  F --> LOG[log conflict]
```

## Discovery Surfaces

```mermaid
graph TD
  PAL[Command Palette Ctrl+K] --> D[shows command + chord]
  HELP[Shortcuts Help View] --> D
  TIP[Tooltips on icon buttons] --> D
  MENU[Menu accelerators] --> D
```

## Related Documents

- [[07-ui-ux/README]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part03]]
- [[KeyboardShortcuts-Part04]]
- [[Accessibility-Part01]]
- [[Accessibility-Part03]]
- [[Sidebar-Part03]]
- [[WorkspaceLayout-Part06]]
- [[TerminalView-Part06]]
- [[Icons-Part03]]
