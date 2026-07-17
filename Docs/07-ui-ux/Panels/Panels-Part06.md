---
title: Panels Specification - Part 06
status: draft
version: 1.0
tags:
  - ui-ux
  - panels
  - accessibility
related:
  - "[[07-ui-ux/README]]"
  - "[[Panels-Part05]]"
  - "[[Panels-Diagrams]]"
  - "[[Accessibility-Part01]]"
  - "[[KeyboardShortcuts-Part01]]"
---

# Panels Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, the Panel as a Surface, Surface Registry
Part 02 - Panel Model, Groups, and the Tab Strip
Part 03 - Split Layouts, Stacking, and Resize Within Panels
Part 04 - Panel Content Types and the Content Contract
Part 05 - Panel State, Persistence, and Focus
Part 06 - Performance, Accessibility, and the Checklist
Diagrams - Panels-Diagrams.md

# Purpose of This Part

This part specifies the performance contract, accessibility rules, and the implementation checklist for panels. Panels host the heaviest content (terminals, logs, chats), so their virtualization and focus behavior decide whether the app stays responsive with many open tools. The accessibility bar: a keyboard user must reach any panel tab and any content without a mouse.

# Performance Budget

```text
panel switch (tab):      < 4ms (content already mounted, just shown)
split resize drag:      maintains 60fps (weights only, no remount)
hidden tab CPU:         ~0 (paused via onTabSwitchAway, Part 04)
many panels (8 groups): no main-thread jank from idle panels
```

The budget depends on the content contract's `onTabSwitchAway` pause. A panel with 8 terminals but only one visible must not have 7 PTYs burning CPU on autoscroll. The terminal PTY still runs (it is a process), but the *view* pauses tailing.

# Virtualization of Content Lists

Log and chat content must virtualize their message/list rendering so a long thread does not mount thousands of DOM nodes.

```text
log:       virtualized list, windowed by scroll position
chat:      virtualized message list, windowed + anchored to bottom
terminal:  xterm owns its own canvas (inherently bounded)
```

Virtualization is the content's responsibility (Part 04 contract), but the panel guarantees only the active tab paints — hidden tabs are not in the DOM at all (they are unmounted or `display:none` with paused work).

# Accessibility Rules

```text
tab strip:          roving tabindex, single stop per group
Arrow keys:         move between tabs; Enter/Space activates
panel region:       one stop in the global cycle (KeyboardShortcuts-Part01)
content focus:      content's own rules once inside (e.g. TerminalView-Part06)
close tab:          keyboard reachable (context menu or Ctrl+W equivalent)
split handles:      focusable, Arrow adjusts weight, aria-label "resize"
```

The panel must not create a focus trap. A keyboard user enters the panel, navigates tabs, enters content, and can always leave via the global shortcut. See [[Accessibility-Part03]] for the focus-ring contract and [[KeyboardShortcuts-Part02]] for panel bindings.

# Resize Handle Accessibility

The in-panel split handles (Part 03) must be keyboard-operable, not pointer-only.

```text
handle:    role="separator", aria-orientation, aria-valuenow = weight%
focus:     Tab reaches handle between tabs (or via shortcut)
Arrow:     adjust weight by step; clamps at min
announce:  aria-valuetext "left 40%, right 60%"
```

A resize handle that only responds to mouse drag is an accessibility failure for a core layout control.

# The Implementation Checklist

```text
[ ] Split tree is Tier 1, persisted per workspace, separate from region size.
[ ] Single-child splits collapse; no degenerate wrappers.
[ ] Panel resize commits weights via invoke, debounced.
[ ] Content implements mount/onFocusIn/onTabSwitchAway/onClose.
[ ] Hidden tabs pause non-essential work (no CPU burn).
[ ] Log/chat content virtualized; terminal uses xterm canvas.
[ ] Tab strip is roving tabindex, single stop per group.
[ ] Panel is one stop in the global focus cycle.
[ ] Split handles keyboard-operable with aria-valuenow.
[ ] Collapse unmounts DOM, preserves Tier 1 arrangement.
[ ] Workspace switch swaps root atomically, no empty flash.
[ ] prefers-reduced-motion honored on tab/content transitions.
```

# Known Limitations (v1)

```text
- Deeply nested splits (e.g. 4+ levels) are allowed but untested
  for a11y beyond 2 levels; deeper nesting is a future ADR.
- Panel content that ignores onTabSwitchAway will burn CPU; this
  is enforced by review, not runtime, in v1.
```

# AI Notes

Do not let hidden panels burn CPU. Enforce `onTabSwitchAway` pause. Eight open terminals all tailing is the classic "why is my laptop fan on" bug; pause the non-visible ones.

Do not make split handles mouse-only. They are core layout controls and must be keyboard-operable with `aria-valuenow`. A pointer-only resize handle fails accessibility for a primary surface.

Do not flash an empty panel. Swap the root atomically on workspace switch. The empty flash reads as lost tools.

Do not mix panel persistence tiers. Split tree (Tier 1) separate from region size (Tier 2). Persisting them together corrupts reload behavior.

# Related Documents

- [[07-ui-ux/README]]
- [[Panels-Part01]]
- [[Panels-Part02]]
- [[Panels-Part03]]
- [[Panels-Part04]]
- [[Panels-Part05]]
- [[Panels-Diagrams]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[WorkspaceLayout-Part06]]
- [[TerminalView-Part06]]
- [[Accessibility-Part01]]
- [[Accessibility-Part03]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
