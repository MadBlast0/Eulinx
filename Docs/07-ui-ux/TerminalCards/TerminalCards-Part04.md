---
title: TerminalCards Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - terminal-cards
  - interaction
related:
  - "[[07-ui-ux/README]]"
  - "[[TerminalCards-Part03]]"
  - "[[TerminalCards-Part05]]"
  - "[[TerminalCards-Diagrams]]"
  - "[[KeyboardShortcuts-Part02]]"
---

# TerminalCards Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Cards as Previews, Surface Registry
Part 02 - Card Model, Lifecycle, and the Preview Buffer
Part 03 - Card Layout, Grid, and Thumbnail Rendering
Part 04 - Card Interactions: Focus, Expand, and Dismiss
Part 05 - Card Status, Notifications, and the Badge System
Part 06 - Performance, Virtualization, and the Checklist
Diagrams - TerminalCards-Diagrams.md

# Purpose of This Part

This part specifies how a user interacts with a card: focusing it, expanding it into a live TerminalView, and dismissing/removing it from the grid. A card is a launch point; the meaningful terminal work happens after expand. Cards never hold workflow state of their own.

# Focus and Navigation

Cards are in the tab order of their surface. Arrow keys move between cards (roving tabindex pattern), Enter expands the focused card.

```text
Tab:                  enter the card grid (first card focused)
Arrows:               move focus between cards (roving tabindex)
Enter / Space:        expand focused card -> TerminalView
Delete / Backspace:   dismiss focused card from grid (keeps terminal)
```

Roving tabindex means only one card has `tabindex=0` at a time; the rest are `-1`. This keeps the grid a single tab stop, matching the surface-registry rule in [[Accessibility-Part01]].

# Expand Into a Live Terminal

Expanding a card opens (or focuses) the corresponding TerminalView tab ([[TerminalView-Part03]]). The card does not become live; it hands off to the live view.

```ts
async function expandCard(terminalId: string) {
  await invoke("Eulinx://terminal/focus", { terminalId });  // ensures tab exists/focused
  setActiveSurface("terminal");                          // Tier 2 view switch
}
```

If the terminal was exited, expand triggers `restart` first so the user lands in a live shell. The card stays in the grid (it is a preview, independent of whether the terminal is open).

# Dismiss vs Close

A card can be dismissed from the grid without closing the terminal. This is the key distinction from [[TerminalView-Part03]] close.

```text
dismiss card:    remove from grid view only (view state, Tier 2)
                 terminal keeps running; re-add via "show all"
close terminal:  invoke Eulinx://terminal/close { id }  (PTY killed)
```

Dismissing is a per-surface preference: "I don't want this one in my glance grid right now." It does not affect the workflow. Closing is destructive and goes through the runtime.

# Card Menu

A per-card menu (opened by a button or context key) offers: Expand, Refresh preview, Dismiss from grid, Close terminal. Each maps to the operations above.

```text
Expand:          -> expandCard
Refresh:         invoke Eulinx://terminal/preview { terminalId, force:true }
Dismiss:         view-state remove
Close terminal:  invoke Eulinx://terminal/close { id }  (confirm if running)
```

The menu is portaled (not clipped by the grid) and closes on action/Escape, restoring focus to the card per [[KeyboardShortcuts-Part03]].

# Drag to Reorder

Cards may be dragged to reorder within the grid. Reordering updates the tab `order` ([[TerminalView-Part03]]) via `Eulinx://terminal/reorder` so the card grid and tab strip stay consistent.

```text
drag end:   invoke("Eulinx://terminal/reorder", { id, order })
            card grid re-sorts from mirrored order
```

The drag is a pointer affordance; the committed order is runtime truth. The UI does not keep a local array as the source of order.

# AI Notes

Do not make a card live in place. Expand hands off to TerminalView. A card that accepts input mid-grid breaks the "cards are read-only glances" rule and the focus model.

Do not confuse dismiss with close. Dismissing is view state; closing kills the PTY. Offering only "close" removes the user's ability to tidy the grid without ending shells.

Do not keep a local card order array as truth. Reorder goes through the runtime `order` field so the tab strip and grid agree. A local order desyncs the two surfaces.

Do not let the grid be multiple tab stops. Use roving tabindex — one stop for the whole grid. Many tab stops make the global focus cycle ([[KeyboardShortcuts-Part01]]) painful.

# Related Documents

- [[07-ui-ux/README]]
- [[TerminalCards-Part01]]
- [[TerminalCards-Part02]]
- [[TerminalCards-Part03]]
- [[TerminalCards-Part05]]
- [[TerminalCards-Diagrams]]
- [[TerminalView-Part02]]
- [[TerminalView-Part03]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part03]]
- [[Accessibility-Part01]]
