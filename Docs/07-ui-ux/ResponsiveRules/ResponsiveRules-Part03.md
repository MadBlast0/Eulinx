---
title: ResponsiveRules Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - responsive-rules
  - adaptation
related:
  - "[[07-ui-ux/README]]"
  - "[[ResponsiveRules-Part02]]"
  - "[[ResponsiveRules-Part04]]"
  - "[[ResponsiveRules-Diagrams]]"
  - "[[WorkspaceLayout-Part06]]"
  - "[[Sidebar-Part03]]
  - "[[TerminalCards-Part03]]
  - "[[Panels-Part03]]
---

# ResponsiveRules Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and the Surface-Agnostic Rule
Part 02 - Breakpoints, the Container Query Model, and the Grid
Part 03 - Per-Surface Adaptation and the Collapse Order
Part 04 - Density, Zoom, and the Implementation Checklist
Diagrams - ResponsiveRules-Diagrams.md

# Purpose of This Part

This part specifies how each surface adapts and, critically, the collapse order when space is scarce. The collapse order is the policy that [[WorkspaceLayout-Part06]]'s degradeAxis implements mechanically. Canvas is always last to shrink because it is the primary surface; optional surfaces yield first.

# The Collapse Order (Scarce Space)

When the window shrinks below what all visible regions need, surfaces collapse in this order (least essential first):

```text
1. panel        (bottom)    -> collapse to hidden
2. inspector    (right)     -> collapse to hidden
3. sidebar      (left)      -> rail, then hidden
4. canvas       (center)    -> shrink last; only below its floor as last resort
```

```text
rule:        canvas is never collapsed; it may shrink below floor only
             when even collapsing everything else is insufficient
rule:        focus moves to canvas when a focused region collapses (WorkspaceLayout-Part06)
```

This order encodes product priority: the graph (canvas) is the reason the app exists; panels/inspector/sidebar are supporting. Losing them is preferable to losing the graph.

# Per-Surface Adaptation

```text
Sidebar ([[Sidebar-Part03]]):
  >= bp-md:  expanded by default
  bp-sm..md: rails by default (icon strip)
  <  bp-sm:  hidden by default; toggle restores
Inspector:
  >= bp-lg:  visible if a selection exists
  <  bp-lg:  hidden by default; selection opens it (or docks as panel tab)
Panel:
  >= bp-md:  visible by default
  <  bp-md:  collapsed by default; terminal still reachable via card grid
Canvas:
  always visible; shrinks within [graph-min, container]
Card grid ([[TerminalCards-Part03]]):
  container-driven (minmax); 1 col when narrow, many when wide
```

These are defaults; the user's explicit state (expanded sidebar at small width) is preserved until the sum-invariant forces a collapse ([[WorkspaceLayout-Part03]]). User intent beats the default, but physics (minima) beats user intent.

# Inspector Docking

On narrow screens, the inspector does not just hide — its content can dock as a panel tab so the user still reaches Worker details without a right region.

```text
narrow:   inspector hidden; selecting a worker opens its inspector as a
          panel tab (Panels-Part04) instead of a right region
wide:     inspector shown as right region again
```

This keeps functionality available at all sizes; only the presentation moves. The content (Worker fields) is the same; the container changes.

# Terminal Adaptation

Terminals adapt by font/grid: as the panel narrows, cols/rows shrink ([[TerminalView-Part04]]). Below a usable terminal width, the card grid ([[TerminalCards-Part03]]) is the better glance surface, and the live terminal can be a panel tab opened on demand.

```text
narrow panel:   terminal cols shrink; if < ~40 cols, suggest card grid
very narrow:    terminal as panel tab; cards as primary glance
```

# Restore on Grow

When the window grows again, regions restore from their `restoreSize` ([[WorkspaceLayout-Part03]]), re-clamped to the new container. The user's arrangement returns; nothing is lost.

```text
grow:   solver re-runs; collapsed regions re-expand to restoreSize
        (respecting new container max)
```

# AI Notes

Do not collapse the canvas first. Canvas is last. Collapsing the graph to save space destroys the app's purpose and surprises users.

Do not drop inspector functionality on narrow screens. Dock it as a panel tab. Hiding the content entirely makes Worker details unreachable — a dead end.

Do not override user intent without the sum-invariant. If the user expanded the sidebar at small width, keep it until physics forces collapse. Arbitrary override ignores the user.

Do not let terminals become unusable silently. Below a usable width, surface the card grid as the glance path. A 20-col terminal is effectively unreadable.

# Related Documents

- [[07-ui-ux/README]]
- [[ResponsiveRules-Part01]]
- [[ResponsiveRules-Part02]]
- [[ResponsiveRules-Part04]]
- [[ResponsiveRules-Diagrams]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part06]]
- [[Sidebar-Part03]]
- [[TerminalCards-Part03]]
- [[TerminalView-Part04]]
- [[Panels-Part03]]
- [[Panels-Part04]]
