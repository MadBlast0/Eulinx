---
title: NodeGraph Specification - Part 06
status: draft
version: 1.0
tags:
  - ui-ux
  - node-graph
  - interaction
related:
  - "[[07-ui-ux/README]]"
  - "[[NodeGraph-Part02]]"
  - "[[NodeGraph-Part05]]"
  - "[[NodeGraph-Diagrams]]"
  - "[[KeyboardShortcuts-Part02]]"
---

# NodeGraph Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, Surface Registry, and the Graph as a View
Part 02 - The Node Model, the Edge Model, and the Selection Contract
Part 03 - Rendering Pipeline, Viewport, and the React Flow Contract
Part 04 - Pan/Zoom, Minimap, and the Node Toolbar
Part 05 - Connection Dragging, Validation, and Edge Rendering
Part 06 - Context Menus, Multi-Select, and Bulk Operations
Part 07 - Diffing, Live Status, and the Runtime Mirror
Part 08 - Performance, Virtualization, and the Implementation Checklist
Diagrams - NodeGraph-Diagrams.md

# Purpose of This Part

This part specifies the right-click context menu, multi-select mechanics, and bulk operations (delete, duplicate, group, align). All bulk operations are commands issued to the runtime; the UI never mutates multiple nodes locally and calls it done. The selection set that drives these operations lives in Tier 1 so an AI-initiated selection looks identical to a user selection.

# The Context Menu

Right-click (or `Shift+F10` / context-menu key) on a node, edge, or empty canvas opens a context menu. The menu content depends on the target and on the selection set.

```text
on node (selected):   run, duplicate, group, align, add-note, inspect, delete
on node (unselected): select-only, then same as above
on edge:              delete, reverse-info, inspect
on empty canvas:      paste, add-node (submenu), fit-view, select-all
```

The menu is a floating panel rendered outside the canvas DOM (portaled) so it is not clipped by the graph viewport. It closes on outside-click, Escape, or action. Closing restores focus to the previously focused node per [[KeyboardShortcuts-Part03]].

# Multi-Select Mechanics

Selection is a Tier 1 set, updated through the selection controller, never directly through React Flow local state (see Part 03).

```text
click node:            replace selection with { nodeId }
ctrl/cmd+click node:   toggle nodeId in set
shift+click node:      range-select from anchor to nodeId (by paint order)
drag box on canvas:    add all intersected nodes to set
Esc:                   clear selection
Select All:            set = all node ids (command)
```

Range-select by "paint order" means the order nodes were added to the graph, not spatial order, to keep it deterministic and independent of viewport. The anchor is the last singly-selected node.

# Bulk Operations

Every bulk op issues one command carrying the full id list. The runtime applies it atomically and emits the resulting mirror delta. The UI does not loop individual `invoke`s per node for structural ops.

```ts
await invoke("Eulinx://graph/bulk-delete", { nodeIds, edgeIds });
await invoke("Eulinx://graph/bulk-duplicate", { nodeIds, offset: {x:24,y:24} });
await invoke("Eulinx://graph/group", { nodeIds, groupName });
await invoke("Eulinx://graph/align", { nodeIds, axis: "x" | "y" });
```

`bulk-duplicate` offset is applied by the runtime; the UI passes a hint offset and the runtime decides final positions (it may avoid overlaps). The UI does not compute collision-free layouts — that is runtime truth.

# Grouping

Grouping wraps selected nodes in a visual group frame. The group is a runtime concept (so a Worker can reference it), but its painted bounds are derived from member node positions.

```text
group.id           runtime-issued
group.memberIds    Tier 1
group.bounds       derived = union(member bounds) + padding (never stored)
group.collapsed    view toggle; when collapsed, members hidden, label shown
```

Collapsing a group is a view action (Tier 3) but the membership is truth. Collapsing hides members in the projection; un-collapsing restores them at their real positions. The runtime holds membership; the UI holds collapse state per session.

# Align and Distribute

Align snaps selected nodes to a shared edge/center along one axis. Distribute spaces them evenly. Both are runtime commands because final positions are truth.

```text
align left/right/top/bottom:   match extremal coordinate
align center-x / center-y:     match midpoints
distribute-h / distribute-v:   equal gaps between sorted extremals
```

Align operates on the selection set. With fewer than two nodes it is a no-op with a quiet toast. The UI shows a preview ghost only if the runtime returns a 202 with projected positions; otherwise it waits for the committed mirror update.

# Selection and the AI

Because selection is Tier 1, an AI can request `Eulinx://graph/select { nodeIds }` and the user sees the same ring a shift-click produces. Conversely, a user multi-select that an AI then acts on shares the identical set. This symmetry is the payoff of the State Ownership Model — there is one selection, not a user selection and an AI selection.

# AI Notes

Do not mutate multiple nodes locally for bulk ops. Issue one command with the id list and let the runtime apply it atomically. Local looped mutations desync the mirror and produce partial graphs on failure.

Do not drive selection from React Flow local state. Selection is Tier 1. A local selection that an AI cannot see, or that the AI's selection cannot reproduce, breaks the shared-selection guarantee.

Do not compute collision-free layouts in the UI. Final positions are runtime truth. The UI passes a hint and renders what the runtime returns.

Do not let context-menu actions be the only path. Every context-menu item must also exist as a command and, where possible, a keyboard shortcut ([[KeyboardShortcuts-Part02]]). A right-click-only action is an accessibility dead end.

# Related Documents

- [[07-ui-ux/README]]
- [[NodeGraph-Part02]]
- [[NodeGraph-Part03]]
- [[NodeGraph-Part05]]
- [[NodeGraph-Part07]]
- [[NodeGraph-Diagrams]]
- [[KeyboardShortcuts-Part02]]
- [[KeyboardShortcuts-Part03]]
- [[Accessibility-Part02]]
- [[EventBus-Part01]]
