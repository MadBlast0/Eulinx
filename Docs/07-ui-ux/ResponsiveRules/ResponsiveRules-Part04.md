---
title: ResponsiveRules Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - responsive-rules
  - checklist
related:
  - "[[07-ui-ux/README]]"
  - "[[ResponsiveRules-Part03]]"
  - "[[ResponsiveRules-Diagrams]]"
  - "[[WorkspaceLayout-Part03]]"
  - "[[DesignTokens-Part02]]
  - "[[Accessibility-Part04]]
---

# ResponsiveRules Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and the Surface-Agnostic Rule
Part 02 - Breakpoints, the Container Query Model, and the Grid
Part 03 - Per-Surface Adaptation and the Collapse Order
Part 04 - Density, Zoom, and the Implementation Checklist
Diagrams - ResponsiveRules-Diagrams.md

# Purpose of This Part

This part specifies density behavior under responsiveness, interaction with OS zoom, and the implementation checklist. Density (compact/comfortable) is a user view preference ([[DesignTokens-Part02]], [[TerminalCards-Part03]]); responsiveness is automatic. They are independent but must compose: a compact density at a small width must still respect minima and remain usable.

# Density vs Responsiveness

Density and responsiveness are orthogonal:

```text
density:      user choice (compact/comfortable) -> spacing/type scale
responsive:   automatic (window size) -> region collapse/rail/grid
```

```text
compose:      at bp-sm the sidebar rails REGARDLESS of density
compose:      compact density shrinks paddings REGARDLESS of width
```

Neither overrides the other. A compact user at a wide width still gets compact spacing; a comfortable user at a narrow width still gets the rail. They multiply, they don't conflict.

# Density Thresholds

Density is not breakpoint-driven; it is a manual toggle. But it has a safe floor so responsiveness can't make it unusable:

```text
comfortable:  --space-control-gap = --space-2 (default), --font-size-md 13
compact:      --space-control-gap = --space-1, --font-size-md 12 (>= floor)
```

```text
rule:        compact never drops type below 12px (Accessibility-Part05)
rule:        compact never makes a control < --control-min (Accessibility-Part04)
```

So even compact + small window, controls stay tappable and readable. Density scales within safe bounds; responsiveness moves structure.

# OS Zoom Interaction

OS text/dpi scaling changes effective CSS px. The app must remain usable:

```text
rule:        layout uses tokens + flex/grid (no fixed px that clips)
rule:        at 200% OS zoom, breakpoints evaluate on logical px (Part 02)
rule:        min control size preserved under zoom (Accessibility-Part04)
```

Because responsiveness uses logical px and token spacing, OS zoom scales the whole UI coherently; the breakpoints fire at the same logical widths the user perceives.

# The Implementation Checklist

```text
[ ] One shell; regions adapt, no separate mobile layout.
[ ] Breakpoints token-driven, few (sm/md/lg/xl); sizes fluid between.
[ ] Container queries for internal grids (cards, panel content).
[ ] Collapse order: panel -> inspector -> sidebar -> canvas last.
[ ] Canvas never collapsed; shrinks below floor only as last resort.
[ ] Focus moves to canvas when a focused region collapses.
[ ] Inspector docks as panel tab when窄; content not lost.
[ ] Terminals shrink grid; card grid as glance when unusable.
[ ] Restore on grow from restoreSize, re-clamped.
[ ] Density orthogonal to responsiveness; both respect minima.
[ ] Compact never below 12px type / --control-min.
[ ] Breakpoints in CSS px; usable at 200% OS zoom.
[ ] Adaptations instant (no dramatic resize animation).
```

# Known Limitations (v1)

```text
- True "phone" layout (touch-first, bottom tabs) is out of scope;
  Eulinx is desktop. Very small windows degrade to canvas-only, not a
  touch layout.
- Density is manual; no automatic density-by-width (future ADR).
- Container queries require a modern webview (Tauri v2 ships one);
  if unavailable, fallback to window queries for internal grids.
```

# AI Notes

Do not tie density to breakpoints. Density is manual; responsiveness is automatic. Coupling them means a user's compact preference vanishes at certain widths.

Do not let compact break minima. Compact stays >= 12px type and >= control-min. A compact mode that makes controls unclickable fails [[Accessibility-Part04]].

Do not evaluate breakpoints in device px under OS zoom. Use CSS px. Otherwise zoom produces wrong layout decisions and the app looks broken at 200%.

Do not animate resizes dramatically. Calm by default. Instant structural adaptation; the solver keeps dragging smooth ([[WorkspaceLayout-Part03]]).

# Related Documents

- [[07-ui-ux/README]]
- [[ResponsiveRules-Part01]]
- [[ResponsiveRules-Part02]]
- [[ResponsiveRules-Part03]]
- [[ResponsiveRules-Diagrams]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part06]]
- [[DesignTokens-Part02]]
- [[TerminalCards-Part03]]
- [[TerminalView-Part04]]
- [[Panels-Part03]]
- [[Panels-Part04]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
