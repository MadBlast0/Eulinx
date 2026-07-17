---
title: KeyboardShortcuts Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - keyboard-shortcuts
  - modals
related:
  - "[[07-ui-ux/README]]"
  - "[[KeyboardShortcuts-Part02]]"
  - "[[KeyboardShortcuts-Part04]]"
  - "[[KeyboardShortcuts-Diagrams]]"
  - "[[Accessibility-Part03]]"
  - "[[Sidebar-Part03]]"
---

# KeyboardShortcuts Specification ( Part 03 )

## Document Index

Part 01 - Purpose, Philosophy, the Global Cycle and the Two Tiers
Part 02 - The Binding Registry, Scopes, and the Default Map
Part 03 - Modals, Focus Restoration, and Conflict Resolution
Part 04 - Customization, Discovery, and the Checklist
Diagrams - KeyboardShortcuts-Diagrams.md

# Purpose of This Part

This part specifies modal behavior, focus restoration, and how key conflicts are resolved. Modals (command palette, context menus, dialogs) are the one place focus is trapped ([[Accessibility-Part03]]); this part says exactly how they open, trap, and close, and how the registry breaks ties when two bindings claim the same chord.

# Modal Open and Trap

A modal captures keyboard until dismissed. The command palette ([[Sidebar-Part03]]) is the primary modal.

```text
on open:    previousFocus = document.activeElement
            move focus to first modal control (input or first action)
while open: all keys routed to modal scope; global cycle suspended
Escape:     close modal (always, highest priority)
on close:   restore focus to previousFocus
```

```text
rule:        Escape is reserved and always closes the topmost overlay
rule:        no modal opens another modal without closing the first
             (palette -> action; action may open a dialog, but palette closes first)
```

Escape being universally reserved prevents the "I can't get out" trap. It is handled at the shell level before any scope, so no surface can swallow it.

# Focus Restoration

Restoring focus to the trigger is mandatory — it is how a keyboard user doesn't lose their place ([[Accessibility-Part03]]).

```ts
function openModal(modal) {
  modal.returnFocusTo = activeElement;
  modal.focus();
}
function closeModal(modal) {
  modal.returnFocusTo?.focus();
}
```

```text
context menu:   closes -> focus returns to the node/control right-clicked
dialog:         closes -> focus returns to the trigger button
palette:        runs command -> focus goes to the command's target surface
```

The palette is special: running a command often moves focus intentionally (e.g. "focus graph" sends focus to canvas). In that case the command's target is the new focus, not the palette trigger.

# Conflict Resolution

When two bindings share a chord, the registry resolves by scope specificity and, within a scope, by a priority flag.

```text
tie-break order:
  1. most specific scope wins (terminal > panel > graph > global)
  2. within scope, explicit user override beats default
  3. otherwise, the binding registered first wins (deterministic)
```

```text
example:  Ctrl+C
  terminal scope:  copy/send-to-PTY   -> wins when terminal focused
  global scope:    edit.copy          -> wins elsewhere
```

Conflicts are logged at startup; a user override that collides with a default is flagged in settings so the user knows. The system never silently drops a binding without recording it.

# Sequence Chords

Optional vim-style sequences (`g f`) have their own resolution: a prefix starts a pending sequence that times out.

```text
on "g":        enter pending sequence (timeout 800ms)
on "f":        dispatch "g f" command; clear pending
on timeout:    clear pending; treat "g" as nothing (or its own binding)
```

A pending sequence must not swallow the next unrelated key if it times out. The timeout resets cleanly so a slow user isn't stuck.

# AI Notes

Do not let a surface swallow Escape. It is reserved for closing overlays. Handling Escape in a component prevents the user from leaving a modal — a trap, forbidden by [[Accessibility-Part03]].

Do not skip focus restoration. Restore to the trigger (or the command's target). Forgetting it strands the keyboard user mid-task.

Do not silently drop conflicting bindings. Log and flag them. A silent drop means a user's custom shortcut "doesn't work" with no explanation.

Do not open a modal on top of a modal. Close the first (palette) before the second (dialog) opens. Stacked modals confuse focus restoration and the Escape order.

# Related Documents

- [[07-ui-ux/README]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part04]]
- [[KeyboardShortcuts-Diagrams]]
- [[Accessibility-Part03]]
- [[Sidebar-Part03]]
- [[WorkspaceLayout-Part06]]
- [[TerminalView-Part05]]
- [[TerminalView-Part06]]
- [[Panels-Part02]]
- [[NodeGraph-Part04]]
