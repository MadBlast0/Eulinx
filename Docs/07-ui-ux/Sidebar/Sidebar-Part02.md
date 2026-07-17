---
title: Sidebar Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - sidebar
  - navigation
related:
  - "[[07-ui-ux/README]]"
  - "[[Sidebar-Part01]]"
  - "[[Sidebar-Part03]]"
  - "[[Sidebar-Diagrams]]"
  - "[[KeyboardShortcuts-Part01]]"
---

# Sidebar Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Sidebar as Navigation, Surface Registry
Part 02 - Navigation Tree, Sections, and the Selection Model
Part 03 - Collapse, Badges, and the Command Palette Entry
Part 04 - State, Persistence, and the Implementation Checklist
Diagrams - Sidebar-Diagrams.md

# Purpose of This Part

This part specifies the sidebar's navigation content: the tree of workspaces, graphs, workers, and resources; the section model; and how selection in the sidebar drives the rest of the app. The sidebar is a navigation surface — it selects things, it does not edit them. Selection made here is Tier 1 and is shared with the canvas and panels.

# The Navigation Tree

The sidebar presents a hierarchical tree projected from the runtime mirror (Tier 1). It never invents entries; every node corresponds to a runtime object.

```text
Workspace
  ├─ Graphs
  │    ├─ graph-a   (selects graph in canvas)
  │    └─ graph-b
  ├─ Workers
  │    ├─ worker-1  (selects worker, opens inspector)
  │    └─ worker-2
  ├─ Resources
  │    ├─ secrets
  │    └─ files
  └─ Settings
```

Each tree node carries an id that maps to a runtime object. Selecting a node issues a navigation command that the relevant surface reacts to (canvas shows the graph, inspector shows the worker). The sidebar does not itself render the graph — it points at it.

# Sections

The tree is grouped into collapsible sections. Section open/closed state is a view preference (Tier 2), not workflow truth.

```ts
interface SidebarSection {
  id: string;            // "graphs" | "workers" | "resources" | "settings"
  label: string;
  collapsed: boolean;    // Tier 2 view state, per workspace
  items: SidebarItem[];
}
```

```text
collapse toggle:   local view state, persisted per workspace (Tier 2)
default:           graphs + workers expanded, resources collapsed
```

Section collapse is Tier 2 because whether a user has "Resources" open is a viewing preference, not part of the workflow definition.

# The Selection Model

Selecting a sidebar item navigates. The selection is Tier 1 when it maps to a workflow object the user is "in" (active graph, selected worker). It drives the canvas and inspector.

```text
select graph:     set activeGraphId (Tier 1) -> canvas renders graph
select worker:    set selectionSet { workerId } (Tier 1) -> inspector
select resource:  open resource panel tab (Panels-Part04)
select settings:  open settings panel tab
```

The active graph selection is the same `activeGraphId` the canvas reads ([[NodeGraph-Part01]]). The worker selection is the same Tier 1 set the canvas ring reads ([[NodeGraph-Part03]]). The sidebar is one of several ways to set these; it is not the owner.

# Tree Virtualization

The tree can be large (hundreds of workers). It must virtualize so only visible rows mount.

```text
virtualize:       windowed rows, token --row-height
expand:           lazy-load children on first expand via invoke if needed
search:           filter tree by query (does not change Tier 1)
```

Lazy-loading children on expand keeps the initial tree cheap. The runtime answers `Eulinx://sidebar/children { nodeId }` only when the user opens a branch.

# Keyboard Navigation

The tree is a classic roving-tabindex tree: Arrow keys move, Right/Left expand/collapse, Enter navigates.

```text
ArrowUp/Down:     move focus between visible rows
ArrowRight:       expand node / move into children
ArrowLeft:        collapse node / move to parent
Enter / Space:    navigate (select)
```

The tree is one tab stop in the global cycle ([[KeyboardShortcuts-Part01]]). Full key map in [[Sidebar-Part04]] and [[KeyboardShortcuts-Part02]].

# AI Notes

Do not let the sidebar invent tree entries. Every node is a runtime object. A "frequently used" pseudo-node that is UI-only breaks the truth model and confuses navigation (clicking it goes nowhere real).

Do not make section collapse Tier 1. It is a viewing preference. Persisting it as workflow truth pollutes the workflow with view state.

Do not own the active-graph selection in the sidebar. The sidebar sets the shared Tier 1 `activeGraphId`; it does not keep a private copy. A private copy desyncs from canvas/inspector.

Do not mount the whole tree. Virtualize. A sidebar with 500 workers all in the DOM is a scroll-jank source. Window the rows.

# Related Documents

- [[07-ui-ux/README]]
- [[Sidebar-Part01]]
- [[Sidebar-Part03]]
- [[Sidebar-Part04]]
- [[Sidebar-Diagrams]]
- [[NodeGraph-Part01]]
- [[NodeGraph-Part03]]
- [[Panels-Part04]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part02]]
- [[EventBus-Part01]]
