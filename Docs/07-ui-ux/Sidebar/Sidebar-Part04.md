---
title: Sidebar Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - sidebar
  - state
related:
  - "[[07-ui-ux/README]]"
  - "[[Sidebar-Part03]]"
  - "[[Sidebar-Diagrams]]"
  - "[[Accessibility-Part01]]"
  - "[[KeyboardShortcuts-Part01]]"
---

# Sidebar Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Sidebar as Navigation, Surface Registry
Part 02 - Navigation Tree, Sections, and the Selection Model
Part 03 - Collapse, Badges, and the Command Palette Entry
Part 04 - State, Persistence, and the Implementation Checklist
Diagrams - Sidebar-Diagrams.md

# Purpose of This Part

This part specifies sidebar state ownership, persistence, the keyboard map, and the implementation checklist. The sidebar mixes tiers: the tree is Tier 1 (it reflects runtime objects), section collapse and region width are Tier 2, and focus/hover are Tier 3. Holding that line is what makes reload restore navigation without restoring volatile view state.

# State Tiers in the Sidebar

```text
Tier 1 (mirror):      tree structure, item statuses, active selection
Tier 2 (view state):  section collapsed flags, region collapse/rail,
                      width (sidebar.size via WorkspaceLayout)
Tier 3 (ephemeral):   focused row, hover, expand/collapse animation state
```

The tree comes from the runtime mirror, so it is Tier 1 by definition — the sidebar renders it, it does not store it. Section collapse and rail state are Tier 2 and persisted per workspace alongside panel state ([[Panels-Part05]]), but separately from region size logic.

# Persistence

```ts
interface SidebarPersist {
  workspaceId: string;
  sectionCollapsed: Record<SectionId, boolean>;  // Tier 2
  regionMode: "expanded" | "rail" | "hidden";     // Tier 2
  version: number;
}
```

```text
save:      debounce 400ms after toggle; single-flight
load:      on workspace open, apply regionMode + section flags
migrate:   forward-only; missing flag defaults to expanded
```

Region width (`sidebar.size`) is owned by [[WorkspaceLayout-Part04]] (Tier 2 there). The sidebar's own persist only covers collapse mode and section flags. Keeping them separate avoids one blob overwriting the other.

# Keyboard Map

```text
Global:
  Ctrl/Cmd+K          open command palette (from sidebar header)
  Ctrl/Cmd+B          toggle sidebar collapse (rail/expanded)
In tree (roving tabindex, one stop):
  ArrowUp/Down        move row focus
  ArrowRight          expand / enter children
  ArrowLeft           collapse / parent
  Enter / Space       navigate (select)
  *                   type-ahead filter (optional)
In rail:
  Tab                 reach rail icons
  Enter               expand section / toggle full
```

The sidebar is one tab stop in the global cycle ([[KeyboardShortcuts-Part01]]). The full global map is in [[KeyboardShortcuts-Part02]].

# The Implementation Checklist

```text
[ ] Tree projected from Tier 1 mirror; no invented entries.
[ ] Selecting a graph/worker sets shared Tier 1 (canvas/inspector).
[ ] Tree virtualized; children lazy-loaded on expand.
[ ] Section collapse is Tier 2, persisted per workspace.
[ ] Region collapse/rail is Tier 2, separate from width.
[ ] Badges from runtime status events, metadata only.
[ ] Rail is keyboard-operable with token tooltips.
[ ] Header opens command palette (single search surface).
[ ] Sidebar is one global tab stop; roving tabindex in tree.
[ ] prefers-reduced-motion honored on expand/collapse.
[ ] Persist debounced, single-flight, forward-migrate.
```

# Known Limitations (v1)

```text
- Type-ahead filtering of the tree is optional; if absent, the
  command palette is the primary search surface.
- Rail tooltips use the token system; very long labels truncate
  with ellipsis rather than wrapping.
```

# AI Notes

Do not store the tree in the sidebar. It is Tier 1 mirror; the sidebar renders it. Storing a copy desyncs navigation from the canvas the moment the runtime changes the tree.

Do not persist section collapse as Tier 1. View preference only. And do not fold it into the region-width blob — keep the sidebar persist separate from [[WorkspaceLayout-Part04]].

Do not create a second search box. The header opens the command palette. Two searches split the user's mental model of "where do I look for X."

Do not make the sidebar multiple tab stops. One stop, roving tabindex inside. Many stops make the global cycle ([[KeyboardShortcuts-Part01]]) painful to traverse.

# Related Documents

- [[07-ui-ux/README]]
- [[Sidebar-Part01]]
- [[Sidebar-Part02]]
- [[Sidebar-Part03]]
- [[Sidebar-Diagrams]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[Panels-Part05]]
- [[NodeGraph-Part01]]
- [[NodeGraph-Part03]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part03]]
- [[Accessibility-Part01]]
- [[Animations-Part03]]
