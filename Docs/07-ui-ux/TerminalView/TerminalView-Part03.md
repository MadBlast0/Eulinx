---
title: TerminalView Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-view
  - tabs
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalView-Part02]]"
  - "[[TerminalView-Part04]]"
  - "[[TerminalView-Diagrams]]"
  - "[[KeyboardShortcuts-Part02]]"
---

# TerminalView Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Terminal as a Runtime Surface, Surface Registry
Part 02 - The PTY Bridge, the Two Channels, and the Data Contract
Part 03 - Tab Model, Tab Strip, and Lifecycle States
Part 04 - Rendering xterm.js, Themes, and the Grid
Part 05 - Search, Copy/Paste, and Selection
Part 06 - Accessibility, Focus, and the Implementation Checklist
Diagrams - TerminalView-Diagrams.md

# Purpose of This Part

This part specifies the terminal tab model: how tabs are identified, ordered, and lifecycle-tracked, and how the tab strip presents them. Tabs are Tier 1 workflow truth (the user's open shells matter to the workflow), but the active-tab pointer is Tier 2 view state. The tab strip is the user's primary terminal navigation surface.

# The Tab Model

Each tab is backed by exactly one PTY (Part 02). The tab record is held in the Tier 1 runtime mirror so an AI can enumerate and address terminals.

```ts
interface TerminalTab {
  id: string;             // stable, runtime-issued
  title: string;          // from Eulinx://terminal/title, or "Terminal N"
  shell: string;          // e.g. "bash", "pwsh"
  cwd: string;            // last known working directory
  status: TabStatus;      // see lifecycle below
  order: number;          // position in the strip
}
```

`order` is the only mutable position field; the strip renders tabs sorted by `order`. Reordering is a `Eulinx://terminal/reorder` command that renumbers `order`, not a local array splice that the runtime does not know about.

# Lifecycle States

```text
spawning   invoke sent, PTY not yet producing output
running    PTY alive, data flowing
exited     PTY closed (code), overlay shown, tab still restorable
killing    kill invoked, awaiting exit event
detached   tab moved to a different panel group (Part of Panels)
```

A tab in `exited` is NOT deleted. The user can restart it (`Eulinx://terminal/restart`) or copy its scrollback. Deletion is explicit (`Eulinx://terminal/close`). This prevents the "I closed the terminal by accident and lost my scrollback" failure.

# The Tab Strip

The strip is a horizontal row above the terminal grid. It holds one chip per tab plus an overflow menu when tabs exceed the width.

```text
chip content:   status dot + title (truncated) + close affordance
active chip:    token --tab-active background, bottom border accent
overflow:       "+N" menu listing hidden tabs, keyboard reachable
add button:     far right, invokes Eulinx://terminal/spawn
```

The close affordance is a button, never the chip itself, so a misclick does not kill a shell. The active chip is driven by the Tier 2 active-tab pointer, not by DOM focus — a tab can be focused (keyboard) without being the "shown" terminal, though normally they coincide.

# Tab Operations

```text
new        invoke Eulinx://terminal/spawn   -> new tab appended
close      invoke Eulinx://terminal/close   { id }  (after confirm if running)
select     set activeTabId (Tier 2)      -> shows that terminal
reorder    invoke Eulinx://terminal/reorder { id, order }
restart    invoke Eulinx://terminal/restart { id }  (from exited)
split      invoke Eulinx://terminal/split   { id }  -> side-by-side in panel
```

`select` is view state and is instant (no IPC). `close`/`restart`/`reorder`/`split` are runtime commands because they alter PTY or layout truth. `split` is a layout op owned by [[Panels-Part03]] but initiated here.

# Scrollback and Exit Overlay

When a tab is `exited`, the grid freezes and a translucent overlay appears with the exit code and a "Restart" / "Close" action. Scrollback remains interactive (select/copy) underneath the overlay.

```text
overlay shows:   "Process exited with code N"  + actions
scrollback:      still selectable, copyable (Part 05)
restart:         clears overlay, re-spawns PTY, keeps tab id
```

The overlay is UI chrome, not PTY output. It is rendered above the grid, never injected into it, preserving the truth boundary from Part 02.

# AI Notes

Do not delete a tab on exit. Keep `exited` tabs so scrollback survives. Accidental loss of a terminal's history is a top user complaint in terminal apps; the freeze-and-restart pattern avoids it.

Do not make the close affordance the whole chip. A single misclick killing a live shell is unacceptable. Separate the close control.

Do not let local array order be the source of truth for tab position. `order` is mirrored; reordering must go through the runtime so an AI and the panel layout agree on positions.

Do not inject exit/status text into the PTY grid. That is synthesized content. Render overlays as chrome above xterm, keeping the byte stream pure.

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalView-Part01]]
- [[TerminalView-Part02]]
- [[TerminalView-Part04]]
- [[TerminalView-Part05]]
- [[TerminalView-Diagrams]]
- [[Panels-Part03]]
- [[KeyboardShortcuts-Part02]]
- [[TerminalCards-Part01]]
- [[EventBus-Part01]]
