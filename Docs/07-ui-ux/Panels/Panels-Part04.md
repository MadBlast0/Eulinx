---
title: Panels Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - panels
  - content
related:
  - "[[07-ui-ux/README]]"
  - "[[Panels-Part03]]"
  - "[[Panels-Part05]]"
  - "[[Panels-Diagrams]]"
  - "[[TerminalView-Part01]]"
  - "[[NodeGraph-Part01]]"
---

# Panels Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Panel as a Surface, Surface Registry
Part 02 - Panel Model, Groups, and the Tab Strip
Part 03 - Split Layouts, Stacking, and Resize Within Panels
Part 04 - Panel Content Types and the Content Contract
Part 05 - Panel State, Persistence, and Focus
Part 06 - Performance, Accessibility, and the Checklist
Diagrams - Panels-Diagrams.md

# Purpose of This Part

This part specifies what can live inside a panel tab and the contract each content type obeys. Panels are generic containers; the content decides its own rules, but all content shares one contract: it renders backend truth, it receives focus predictably, and it never breaks the panel's tab model.

# Content Types

```text
terminal     a TerminalView instance ([[TerminalView-Part01]])
log          a streaming log view (runtime log events)
chat         an AI chat thread (Worker Agent conversation)
inspector    a Worker/Node inspector (often docked, may appear in panel)
graph        an embedded node graph tab (secondary graph view)
markdown     a rendered doc/note (read-only or editable via runtime)
webview      a sandboxed Tauri webview (external tool UI)
```

Each type is registered in a content registry so the panel can mount the right component by `tab.kind`. The registry is the panel's equivalent of the surface registry in [[Accessibility-Part01]].

# The Content Contract

Every content type implements the same interface so the panel can treat them uniformly.

```ts
interface PanelContent {
  kind: PanelKind;
  mount(tab: PanelTab, container: HTMLElement): void;
  onFocusIn(): void;          // report focus to panel controller
  onTabSwitchAway(): void;    // pause non-essential work (e.g. log tail)
  onClose(): void;            // cleanup, then invoke Eulinx://panel/close
  ariaRole(): string;         // for the panel's a11y tree
}
```

The contract guarantees the panel can switch tabs, report focus, and close any content without knowing its internals. A content that ignores `onTabSwitchAway` keeps burning CPU on a hidden tab — a performance bug.

# Terminal Content

A panel terminal tab hosts a full TerminalView ([[TerminalView-Part01]]). It is the same component as the dedicated terminal surface, just docked in a panel. The `terminalId` links it to the PTY bridge ([[TerminalView-Part02]]).

```text
panel terminal  == TerminalView with container = panel tab body
shared PTY:      same terminalId as a card/grid terminal
focus:           enters the terminal grid per TerminalView-Part06
```

This sharing is why a card can expand into a panel terminal and why the tab strip ([[TerminalView-Part03]]) and the panel tab agree on `order`.

# Log Content

A log view subscribes to runtime log events and renders them as a virtualized list. It does not poll; it listens.

```text
subscribe:   listen("Eulinx://log/line", { stream, line })
render:      virtualized list, newest at bottom, autoscroll if pinned
pause:       on tab switch away, stop autoscroll (keep buffering)
```

The log is a view of runtime log output (Tier 1 source), filtered by stream. It is read-only; the user does not type into a log.

# Chat Content

An AI chat thread shows a Worker Agent conversation. Messages arrive via EventBus; the UI renders them. The user's input is sent via `invoke` to the chat runtime.

```text
inbound:    listen("Eulinx://chat/message", { threadId, msg })
outbound:   invoke("Eulinx://chat/send", { threadId, text })
render:     message list, token-styled bubbles, code blocks via [[Typography-Part04]]
```

Chat content obeys the same "UI renders backend truth" rule: messages shown are exactly those the runtime emitted. The UI never fabricates a message to fill space.

# The No-Break Rule

No content type may break the panel tab model: it must not steal the global focus shortcuts, must not render outside its container, and must clean up on close. A content that violates this breaks every other tab in the panel.

```text
forbidden:  content that calls preventDefault on global shortcuts
forbidden:  content that portals to body without panel permission
forbidden:  content that leaks listeners after onClose
```

These are enforced by code review and the content contract's `onClose` cleanup requirement.

# AI Notes

Do not let panel content poll for data. Subscribe to EventBus events. Polling duplicates the mirror model and wastes the main thread, especially for logs and chat.

Do not fabricate chat/log content in the UI. Render exactly what the runtime emitted. A "typing…" placeholder is fine as a view hint, but a synthesized message is invented truth.

Do not skip `onTabSwitchAway` cleanup. A hidden terminal tail or log autoscroll keeps burning CPU. Pause non-essential work when not the active tab.

Do not let content steal global shortcuts. The panel content must yield focus-out shortcuts to the shell. A content that `preventDefault`s on Tab traps the user.

# Related Documents

- [[07-ui-ux/README]]
- [[Panels-Part01]]
- [[Panels-Part02]]
- [[Panels-Part03]]
- [[Panels-Part05]]
- [[Panels-Diagrams]]
- [[TerminalView-Part01]]
- [[TerminalView-Part02]]
- [[NodeGraph-Part01]]
- [[Typography-Part04]]
- [[Accessibility-Part01]]
- [[EventBus-Part01]]
