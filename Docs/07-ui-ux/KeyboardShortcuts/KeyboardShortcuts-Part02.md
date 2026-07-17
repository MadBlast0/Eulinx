---
title: KeyboardShortcuts Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - keyboard-shortcuts
  - binding
related:
  - "[[07-ui-ux/README]]"
  - "[[KeyboardShortcuts-Part01]]"
  - "[[KeyboardShortcuts-Part03]]"
  - "[[KeyboardShortcuts-Diagrams]]"
  - "[[NodeGraph-Part04]]"
  - "[[TerminalView-Part03]]"
  - "[[Panels-Part02]]"
---

# KeyboardShortcuts Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Global Cycle and the Two Tiers
Part 02 - The Binding Registry, Scopes, and the Default Map
Part 03 - Modals, Focus Restoration, and Conflict Resolution
Part 04 - Customization, Discovery, and the Checklist
Diagrams - KeyboardShortcuts-Diagrams.md

# Purpose of This Part

This part specifies the binding registry: how shortcuts are defined, scoped, and the default map shipped with Eulinx. Shortcuts are data, not hardcoded handlers — they live in a registry so they can be customized (Part 04) and discovered (the command palette). The global cycle from Part 01 is realized here as concrete key bindings.

# The Binding Registry

A shortcut binds a key chord to a command id. The registry is the single source; components dispatch commands by id, never by key.

```ts
interface Binding {
  command: string;          // "view.focusGraph"
  chord: string;            // "Ctrl+1" or "g then f" (sequence)
  scope: Scope;             // "global" | "graph" | "terminal" | "panel"
  when?: string;            // context expr, e.g. "panelFocused"
  default: boolean;         // true if shipped default
}
```

```text
rule:        components call dispatch(commandId); never key listeners
rule:        chord strings are normalized (case-insensitive mods)
```

Because components dispatch by command id, the same command can have different chords per scope or per user, and the command palette ([[Sidebar-Part03]]) lists commands independent of keys.

# Scopes

Scopes decide which bindings are active. Global bindings work everywhere; surface bindings only when that surface is focused.

```text
global:     app-level (focus cycle, command palette, new terminal)
graph:      active when canvas focused (Part of NodeGraph)
terminal:   active when terminal grid focused (TerminalView-Part06)
panel:      active when a panel tab focused (Panels-Part02)
```

```text
precedence: more specific scope wins (terminal > global)
escape:     always resolves to "close/dismiss current overlay"
```

Scope precedence prevents a global `Ctrl+C` from clobbering the terminal's copy (the terminal scope wins because copy is the PTY semantics there). This is the crux of the "two tiers" from Part 01.

# The Default Map (selection)

```text
Global:
  Ctrl/Cmd+K        command.palette.open
  Ctrl/Cmd+B        view.toggleSidebar
  Ctrl/Cmd+1..9     view.focusTerminalN  (or graph if no terminals)
  Ctrl/Cmd+`        view.cyclePanel
  Ctrl/Cmd+T        terminal.spawn
  Ctrl/Cmd+W        tab.close (panel/terminal)
  Ctrl/Cmd+,        settings.open

Focus cycle:
  Tab / Shift+Tab   focus.next / focus.prev (WorkspaceLayout-Part06)

Graph scope:
  F2                node.rename
  Delete/Backspace  selection.delete
  Ctrl/Cmd+D        selection.duplicate
  Ctrl/Cmd+G        selection.group
  Ctrl/Cmd+=        view.zoomIn (NodeGraph-Part04)
  Ctrl/Cmd+-        view.zoomOut
  Shift+1           view.fitView

Terminal scope:
  Ctrl/Cmd+C        copy (if selection) / else send to PTY
  Ctrl/Cmd+V        paste
  Ctrl/Cmd+F        search.open (TerminalView-Part05)

Panel scope:
  Ctrl/Cmd+PageUp   tab.prev
  Ctrl/Cmd+PageDown tab.next
```

This is a representative subset; the full map is in the command registry. The point: every common action has a key, and the global cycle is `Tab`.

# Chord Normalization

```text
mods:    Ctrl (Cmd on macOS), Shift, Alt(Opt), Meta
order:   Ctrl/Cmd + Alt + Shift + key
case:    key letters lowercased; "Esc", "Tab", "Enter" named
sequence: "g f" means press g then f (vim-style, optional)
```

On macOS, `Ctrl` in the chord map resolves to the Cmd key automatically so the same binding works cross-platform. The registry stores the logical chord; the platform maps the physical key.

# AI Notes

Do not put key listeners in components. Dispatch by command id. Hardcoded `keydown` handlers make shortcuts uncustomizable and undiscoverable, and they fight the scope system.

Do not let global bindings clobber surface semantics. Terminal `Ctrl+C` means copy/send, not "app copy." Specific scope wins. Ignoring scope precedence produces the classic "my copy shortcut did something else" bug.

Do not hardcode Ctrl vs Cmd per platform. Store logical chords; resolve physically. Hardcoded `e.ctrlKey` breaks on macOS where users expect Cmd.

Do not make a command keyless. Every common action has a binding so keyboard users are not dead-ended ([[Accessibility-Part01]]).

# Related Documents

- [[07-ui-ux/README]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part03]]
- [[KeyboardShortcuts-Part04]]
- [[KeyboardShortcuts-Diagrams]]
- [[WorkspaceLayout-Part06]]
- [[NodeGraph-Part04]]
- [[NodeGraph-Part06]]
- [[TerminalView-Part03]]
- [[TerminalView-Part05]]
- [[TerminalView-Part06]]
- [[Panels-Part02]]
- [[Sidebar-Part03]]
- [[Accessibility-Part01]]
