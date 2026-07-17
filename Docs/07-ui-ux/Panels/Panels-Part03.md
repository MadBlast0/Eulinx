---
title: Panels Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - panels
  - layout
related:
  - "[[07-ui-ux/README]]"
  - "[[Panels-Part01]]"
  - "[[Panels-Part02]]"
  - "[[Panels-Diagrams]]"
  - "[[WorkspaceLayout-Part03]]"
  - "[[TerminalView-Part03]]"
---

# Panels Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Panel as a Surface, Surface Registry
Part 02 - Panel Model, Groups, and the Tab Strip
Part 03 - Split Layouts, Stacking, and Resize Within Panels
Part 04 - Panel Content Types and the Content Contract
Part 05 - Panel State, Persistence, and Focus
Part 06 - Performance, Accessibility, and the Checklist
Diagrams - Panels-Diagrams.md

# Purpose of This Part

This part specifies how panels subdivide their region: horizontal/vertical splits, stacked tab groups, and resize handles that live *inside* the panel region (distinct from the shell-level region resize in [[WorkspaceLayout-Part03]]). Panel splits are workflow arrangement truth and are mirrored, unlike region resize which is Tier 2.

# Split Model

A panel region can contain one or more split cells arranged in a tree. Each leaf cell hosts a tab group. Splits are expressed as a nested structure mirrored in Tier 1.

```ts
type PanelNode =
  | { type: "group"; tabs: PanelTab[]; activeTabId: string }
  | { type: "split"; dir: "row" | "col"; children: PanelNode[]; sizes: number[] };
```

```text
row split:    children side by side, vertical resize handles between
col split:    children stacked, horizontal resize handles between
sizes:        flex weights (sum normalized), persisted per workspace
```

The split tree is workflow truth because it is the user's arrangement of tools (terminals, logs, AI chat). It must survive reload, so it is mirrored and persisted, unlike the shell region sizes which are Tier 2 ([[WorkspaceLayout-Part04]]).

# Split Operations

```text
split active group:   invoke Eulinx://panel/split { groupId, dir }
                     -> wraps group in a split with a new empty group
close split child:    when a group empties, its split node collapses
resize handle:        drag updates sizes[] weights (mirrored, debounced)
```

Closing a child that empties its group removes the child from the split; if the split then has one child, the split node is replaced by that child (no degenerate single-child split). This mirrors the group-deletion invariant from [[WorkspaceLayout-Part01]].

# Resize Inside Panels

Resize handles inside a split update flex weights. They use the same clamp-and-preserve-sum solver as the shell ([[WorkspaceLayout-Part03]]) but operate on `sizes[]` weights.

```text
on drag:    delta applied to adjacent weights, clamped to min weight
commit:     invoke Eulinx://panel/resize { splitId, sizes } (debounced 200ms)
recompute:  flex layout from weights; canvas-independent
```

The minimum weight corresponds to a pixel floor derived from token `--panel-min`. A split cannot collapse a child below the floor; it clamps. This prevents a panel from vanishing and stranding its content.

# Stacking (Tab Groups)

A leaf group stacks its tabs; only the active tab's content is painted. The tab strip ([[Panels-Part02]]) switches the active tab. Stacking is the default when a panel has multiple contents but no split.

```text
group.tabs:      ordered list of PanelTab
activeTabId:     which tab content is shown
switch:          set activeTabId (Tier 1; shared so AI can focus a tab)
```

Switching is instant (no IPC) because it is a view of already-loaded content; the content itself was loaded by a runtime command when the tab was created.

# Split vs Shell Region

It is important to distinguish the two resize systems:

```text
Shell region resize  (WorkspaceLayout):  canvas/sidebar/inspector/panel sizes
                                        Tier 2, NOT persisted as workflow truth
Panel split resize    (this part):        within-panel child weights
                                        Tier 1, persisted per workspace
```

Mixing them up leads to persisting viewport arrangement as if it were workflow, or losing the user's tool layout on reload. Keep the boundary: regions are view chrome; panel splits are the user's workspace.

# AI Notes

Do not persist panel region size as workflow truth. Region size is Tier 2 ([[WorkspaceLayout-Part04]]). Only the panel *split tree* is Tier 1. Persisting region size pollutes workflow state with view preference.

Do not leave degenerate single-child splits. Collapse them. A split with one child is a no-op wrapper that confuses serialization and resize math.

Do not let a panel child collapse below its pixel floor. Clamp the weight. A vanished panel strands the user's terminal/log and looks like data loss.

Do not treat split resize as a shell concern. It is mirrored workflow arrangement. Debounce the commit, but the weights are truth, not a view hint.

# Related Documents

- [[07-ui-ux/README]]
- [[Panels-Part01]]
- [[Panels-Part02]]
- [[Panels-Part04]]
- [[Panels-Diagrams]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[TerminalView-Part03]]
- [[DesignTokens-Part01]]
