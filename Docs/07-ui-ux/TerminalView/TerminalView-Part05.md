---
title: TerminalView Specification - Part 05
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-view
  - interaction
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalView-Part04]]"
  - "[[TerminalView-Part06]]"
  - "[[TerminalView-Diagrams]]"
  - "[[Accessibility-Part02]]"
---

# TerminalView Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Terminal as a Runtime Surface, Surface Registry
Part 02 - The PTY Bridge, the Two Channels, and the Data Contract
Part 03 - Tab Model, Tab Strip, and Lifecycle States
Part 04 - Rendering xterm.js, Themes, and the Grid
Part 05 - Search, Copy/Paste, and Selection
Part 06 - Accessibility, Focus, and the Implementation Checklist
Diagrams - TerminalView-Diagrams.md

# Purpose of This Part

This part specifies search, copy, paste, and selection. These are the terminal's text interactions. Selection and copy read from xterm's cell model (the truth); paste writes to the PTY via `invoke`. The UI does not maintain its own text buffer — it queries xterm.

# Selection

Selection is owned by xterm. The UI only styles it via the `selectionBackground` theme token (Part 04) and reads it back for copy.

```text
user drags:           xterm tracks cell selection
selection visible:    token --terminal-selection
select all:           term.selectAll()  (command)
copy:                 term.getSelection() -> clipboard
```

The UI never computes which cells are selected; xterm's geometry engine does. A UI-side selection would diverge from what is actually painted and produce wrong copies.

# Copy

Copy reads xterm's current selection. If nothing is selected, copy is a no-op (or copies the last line per a setting, but default is no-op to avoid surprises).

```text
on copy command / Ctrl+Shift+C:
  const text = term.getSelection();
  if (text) navigator.clipboard.writeText(text);
```

Copy uses the system clipboard via Tauri's clipboard bridge, not `document.execCommand`. The content is exactly xterm's selection, with newlines preserved from the cell grid. The UI does not add or strip anything.

# Paste

Paste writes the clipboard to the PTY as if typed. It does NOT inject into xterm's display (the PTY will echo it). Bracketed paste is respected if the PTY advertised it.

```text
on paste command / Ctrl+Shift+V:
  const text = await navigator.clipboard.readText();
  invoke("Eulinx://terminal/write", { terminalId, data: text });
```

Pasting via `write` means the shell/PTY controls how the text appears (echo, bracketed paste, etc.). The UI must not also render the pasted text, or it would double-print. The UI is a pass-through.

# Search

xterm's addon (`@xterm/addon-search`) provides in-grid search. The UI provides the search box chrome and forwards queries.

```text
search box:           overlay input, token-styled
on query:             term.search.findNext(q) / findPrevious(q)
match highlight:      addon-rendered, theme-token colored
next/prev:            buttons + F3 / Shift+F3
```

Search operates on the rendered grid (truth), not on a UI buffer. The addon scans xterm's cell model. The UI only positions the box and routes keys.

# Right-Click Context

A right-click in the terminal opens a small menu: Copy (if selection), Paste, Select All, Clear, Search. These map to the operations above. The menu closes on action/Escape and restores focus to the terminal per [[KeyboardShortcuts-Part03]].

```text
Copy     -> getSelection + clipboard
Paste    -> clipboard + write
SelectAll-> term.selectAll()
Clear    -> invoke Eulinx://terminal/clear  (PTY clears, not UI)
Search   -> open search box
```

`Clear` is a runtime command (`Eulinx://terminal/clear`), not a UI wipe of the grid, because the scrollback lives in the PTY/xterm buffer and only the PTY's clear is authoritative.

# AI Notes

Do not maintain a UI text buffer for copy. Read xterm's selection. A second buffer diverges from the painted grid and copies the wrong text.

Do not render pasted text in the UI. Write it to the PTY and let the PTY echo. Double-printing pasted text is a visible, confusing bug.

Do not use `execCommand` for clipboard. Use the Tauri clipboard bridge. And do not strip or add newlines to copied text — preserve the cell grid exactly.

Do not let the UI clear the grid for "Clear." Issue `Eulinx://terminal/clear` so the PTY's buffer is the authority. A UI-side wipe leaves scrollback the PTY still holds.

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalView-Part03]]
- [[TerminalView-Part04]]
- [[TerminalView-Part06]]
- [[TerminalView-Diagrams]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part03]]
- [[Accessibility-Part02]]
- [[TerminalCards-Part02]]
- [[EventBus-Part01]]
