---
title: Panels Specification - Part 05
status: draft
version: 1.0
tags:
  - ui-ux
  - panels
  - state
related:
  - "[[07-ui-ux/README]]"
  - "[[Panels-Part04]]"
  - "[[Panels-Part06]]"
  - "[[Panels-Diagrams]]"
  - "[[WorkspaceLayout-Part04]]"
  - "[[KeyboardShortcuts-Part01]]"
---

# Panels Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Panel as a Surface, Surface Registry
Part 02 - Panel Model, Groups, and the Tab Strip
Part 03 - Split Layouts, Stacking, and Resize Within Panels
Part 04 - Panel Content Types and the Content Contract
Part 05 - Panel State, Persistence, and Focus
Part 06 - Performance, Accessibility, and the Checklist
Diagrams - Panels-Diagrams.md

# Purpose of This Part

This part specifies panel state ownership, persistence, and focus. The split tree and tab arrangement are Tier 1 (persisted per workspace). The active tab pointer and scroll positions are Tier 2/3 (view state). Focus within a panel follows the global cycle ([[KeyboardShortcuts-Part01]]). Getting these tiers right is what lets a reload restore the user's tool layout without restoring volatile view state.

# State Tiers in Panels

```text
Tier 1 (persisted):   split tree, group tabs, activeTabId per group,
                      content kind + tabId, panel region visibility
Tier 2 (view state):  scroll position per tab, log autoscroll pin,
                      panel collapsed/expanded (region level)
Tier 3 (ephemeral):   focus within content, hover, drag ghost
```

The active tab pointer is Tier 1 because which tool the user had open is workflow-relevant (they expect to return to their chat, not the terminal, after reload). Scroll position is Tier 2 because it is a viewing preference, restored when possible but not truth.

# Persistence

Panel state persists per `workspaceId`, alongside the layout ([[WorkspaceLayout-Part04]]) but as a distinct blob because it is Tier 1 workflow arrangement, not Tier 2 region size.

```ts
interface PanelPersist {
  workspaceId: string;
  root: PanelNode;           // split tree (Part 03)
  version: number;           // for migration
}
```

```text
save:      debounce 400ms after any structural change; single-flight
load:      on workspace open, replace panel root atomically
migrate:   forward-only; missing step -> load previous, mark degraded
validate:  repair (drop orphan tabs, fix weights sum) silently
```

The persistence rules are identical in spirit to [[WorkspaceLayout-Part04]]: debounce, single-flight, forward migration, silent repair. The two blobs are separate so region size (Tier 2) and panel arrangement (Tier 1) evolve independently.

# Focus Within a Panel

A panel participates in the global focus cycle as one region ([[KeyboardShortcuts-Part01]]). Inside it, focus moves among the tab strip and the active content.

```text
enter panel:     focus the tab strip (first tab)
Tab in strip:    move to active content
Tab in content:  content handles internally; global shortcut exits panel
Arrow in strip:  move between tabs (roving tabindex)
```

The panel content's own focus rules apply once inside (e.g., terminal grid per [[TerminalView-Part06]]). The panel controller only owns the strip-to-content boundary.

# Collapse and Restore

A panel region can collapse to hidden ([[WorkspaceLayout-Part03]]). When collapsed, its content is unmounted but its Tier 1 arrangement is preserved, so re-expanding restores exactly the user's layout.

```text
collapse:   unmount contents, keep PanelPersist, set region visible=false
expand:     remount from PanelPersist (no data loss)
focus rule: if focused panel collapses, focus -> canvas (WorkspaceLayout-Part06)
```

This is why collapse is safe: nothing Tier 1 is lost, only the painted DOM. The split tree lives on in the mirror.

# Cross-Workspace

Switching workspaces swaps the entire panel root atomically (no second root, per [[WorkspaceLayout-Part02]]). The old workspace's panel state is flushed to its own persist blob before the swap.

```text
on switch:   flush current PanelPersist -> old workspaceId
             load PanelPersist -> new workspaceId
             replace root in one commit (no flash of empty panel)
```

# AI Notes

Do not persist scroll position as Tier 1. It is a view preference (Tier 2). Persisting it as truth pollutes workflow state and surprises the user who expects a fresh view.

Do not lose panel arrangement on collapse. Collapse unmounts DOM only; the split tree stays in the mirror. Unmounting the model on collapse is data loss.

Do not mix panel persist with region-size persist. They are different tiers (Tier 1 vs Tier 2) and must be separate blobs so they migrate and restore independently.

Do not flash an empty panel on workspace switch. Swap the root in one commit after flushing the old blob. A visible empty panel reads as "my tools vanished."

# Related Documents

- [[07-ui-ux/README]]
- [[Panels-Part01]]
- [[Panels-Part02]]
- [[Panels-Part03]]
- [[Panels-Part04]]
- [[Panels-Part06]]
- [[Panels-Diagrams]]
- [[WorkspaceLayout-Part02]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part04]]
- [[WorkspaceLayout-Part06]]
- [[KeyboardShortcuts-Part01]]
- [[TerminalView-Part06]]
