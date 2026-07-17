---
title: Sidebar Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - sidebar
  - interaction
related:
  - "[[07-ui-ux/README]]"
  - "[[Sidebar-Part02]]"
  - "[[Sidebar-Part04]]"
  - "[[Sidebar-Diagrams]]"
  - "[[WorkspaceLayout-Part03]]"
  - "[[KeyboardShortcuts-Part02]]"
---

# Sidebar Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Sidebar as Navigation, Surface Registry
Part 02 - Navigation Tree, Sections, and the Selection Model
Part 03 - Collapse, Badges, and the Command Palette Entry
Part 04 - State, Persistence, and the Implementation Checklist
Diagrams - Sidebar-Diagrams.md

# Purpose of This Part

This part specifies the sidebar's collapse behavior (region-level, Tier 2), the badge system that surfaces runtime attention, and the command-palette entry point that lives in the sidebar header. These are the sidebar's "chrome" interactions distinct from tree navigation (Part 02).

# Region Collapse

The sidebar is a collapsible region ([[WorkspaceLayout-Part03]]). It can collapse to a rail (icons only) or fully hidden. Collapse state is Tier 2 per workspace.

```text
expanded:    full tree, width = sidebar.size
rail:        icon strip only, width = railSize (token), labels hidden
hidden:      region not rendered, width 0
toggle:      invoke Eulinx://layout/sidebar-toggle (or local, Tier 2)
```

In rail mode, the tree is replaced by a vertical icon list (one icon per section). Clicking an icon expands to that section or toggles full expand. The rail preserves the navigation entry point when space is tight ([[ResponsiveRules-Part01]]).

# Badges on Sections

Sections can show a badge indicating pending attention, projected from runtime events (not computed by the UI).

```text
workers badge:     count of workers in error state (from mirror)
resources badge:   count of unread resource events
graphs badge:      none by default (graphs don't "alert")
```

Badges are metadata only. They subscribe to the lightweight events (e.g. `Eulinx://worker/state_changed`), never to content bytes. An error worker shows a red dot on the Workers section until the user navigates there or acknowledges.

# The Command Palette Entry

The sidebar header hosts the command palette trigger — a button (and the global shortcut) that opens the palette. The palette itself is a modal ([[KeyboardShortcuts-Part03]]); the sidebar only provides the entry point and the search-looking input.

```text
header:    [command input placeholder "Search or run command…"]
click:     open palette modal
shortcut:  Cmd/Ctrl+K (global, KeyboardShortcuts-Part02)
```

The header input is a visual affordance; typing in it opens the modal rather than filtering the tree inline. This keeps one search surface (the palette) rather than two.

# Footer Actions

The sidebar footer holds global actions: settings, help, and account. These open panel tabs ([[Panels-Part04]]) or external surfaces; they do not mutate workflow truth directly.

```text
settings:  open settings panel tab
help:      open help/docs panel tab
account:   open account panel tab (or external)
```

Footer items are static (not from the runtime tree); they are app chrome, not navigation into workflow objects.

# Rail Interaction

```text
rail icon click:     if collapsed -> expand to section / toggle full
rail tooltip:        section label on hover/focus (token --tooltip)
rail keyboard:       Tab reaches rail icons; Enter expands
```

The rail must be keyboard-operable. A rail that only responds to click is an a11y failure for the collapsed state. Tooltips use the token system and respect reduced-motion ([[Animations-Part03]]).

# AI Notes

Do not make region collapse Tier 1. It is view state (Tier 2), per [[WorkspaceLayout-Part04]]. Persisting collapse as workflow truth would force every workspace into the same width.

Do not compute badges in the UI. Project from runtime status events. A badge the UI guesses ("this worker looks busy") is invented truth and will disagree with the inspector.

Do not put two search surfaces. The sidebar header opens the command palette; it does not also filter the tree. Two search boxes confuse users about scope.

Do not make the rail click-only. It must be keyboard-operable with tooltips. A collapsed sidebar that traps mouse users only fails the "no dead ends" rule.

# Related Documents

- [[07-ui-ux/README]]
- [[Sidebar-Part01]]
- [[Sidebar-Part02]]
- [[Sidebar-Part04]]
- [[Sidebar-Diagrams]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[Panels-Part04]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part03]]
- [[ResponsiveRules-Part01]]
- [[Animations-Part03]]
