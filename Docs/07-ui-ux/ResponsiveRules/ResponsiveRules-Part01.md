---
title: ResponsiveRules Specification - Part 01
status: draft
version: 1.0
tags:
  - ui-ux
  - responsive-rules
  - philosophy
related:
  - "[[07-ui-ux/README]]"
  - "[[ResponsiveRules-Part02]]"
  - "[[ResponsiveRules-Diagrams]]"
  - "[[WorkspaceLayout-Part01]]"
  - "[[WorkspaceLayout-Part03]]"
  - "[[DesignTokens-Part02]]"
---

# ResponsiveRules Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and the Surface-Agnostic Rule
Part 02 - Breakpoints, the Container Query Model, and the Grid
Part 03 - Per-Surface Adaptation and the Collapse Order
Part 04 - Density, Zoom, and the Implementation Checklist
Diagrams - ResponsiveRules-Diagrams.md

# Purpose of This Part

This part specifies how the Eulinx UI adapts to window size. Unlike a website, Eulinx is a desktop app with a fixed six-region shell ([[WorkspaceLayout-Part01]]); "responsive" here means how those regions reflow, collapse, and shrink as the window resizes — not a full redesign per device. The governing principle: the layout must stay usable from a small laptop window to a wide monitor, and never let a region drop below its functional minimum ([[WorkspaceLayout-Part03]]).

# Philosophy: One Shell, Adaptive Regions

Eulinx does NOT have separate mobile/desktop layouts. It has one shell whose regions adapt. This is a deliberate choice: the app is a desktop power tool, and a divergent mobile layout would double the surface area a cheap coding model ([[07-ui-ux/README]]) must maintain correctly.

```text
NOT:     mobile layout vs desktop layout (two designs)
YES:     one shell; regions collapse/rail/shrink by available space
```

Adaptation is driven by available container space (the Tauri window inner size), not by device type. A narrow window on a wide monitor behaves like a small laptop window — the same rules apply.

# The Two Drivers

Responsive behavior is driven by two inputs:

```text
1. window inner size   (from Tauri resize event, WorkspaceLayout-Part03)
2. container queries   (a region's own size, for nested adaptation)
```

The shell-level regions react to the window size (breakpoints in Part 02). Content inside a region (cards, panel splits) reacts to its container via container queries (Part 02), so a panel can adapt independently of the window.

# The Functional Minimum

Every region has a functional minimum (token `--layout-*-min`, [[DesignTokens-Part02]]). Below the aggregate minimum, the window is "too small" and the app shows a degraded state rather than a broken one ([[WorkspaceLayout-Part06]]).

```text
aggregate min:   sidebar-min + graph-min + statusbar-h + titlebar-h
                 (+ inspector/panel if visible)
if window < aggregate min:  degrade (collapse optional regions)
if window < hard min:       window-too-small overlay
```

This is the sum-invariant from [[WorkspaceLayout-Part03]] applied to responsiveness: regions never overlap; they collapse instead.

# Calm, Not Jarring

Adaptation is calm: regions collapse to rails or hide; they do not animate dramatically on every resize ([[Animations-Part01]]). A resize is a layout change, and per [[Themes-Part03]]/[[Animations-Part03]], layout changes are instant, not cross-faded.

```text
rule:        collapse/rail transitions are instant or token-fast
rule:        no content reflow jank during drag (solver, WorkspaceLayout-Part03)
```

# Relationship to Other Surfaces

ResponsiveRules coordinates with, but does not own, the per-surface behavior:

```text
WorkspaceLayout: owns region sizes + solver (the mechanism)
Sidebar:         owns rail/expanded states (Part 03)
TerminalCards:  owns card grid reflow (Part 03)
Panels:          owns split resize (Part 03)
ResponsiveRules: owns WHEN each adaptation triggers (the policy)
```

This part is the policy layer; the others are the mechanisms. Keeping them separate means a change to "at what width does the sidebar rail" lives here, not in the Sidebar files.

# AI Notes

Do not build separate mobile/desktop layouts. One shell, adaptive regions. A second layout doubles maintenance and confuses the cheap model about which is canonical.

Do not let regions overlap when space is tight. Collapse them. Overlap is a layout bug; the solver's sum-invariant ([[WorkspaceLayout-Part03]]) prevents it.

Do not animate resizes dramatically. Calm by default ([[Animations-Part01]]). A resize cross-fade is janky during a drag and contradicts the instant-layout rule.

Do not put the "when to collapse" rule inside the surface files. Policy lives here; mechanisms live in the surface parts. Mixing them means a width threshold is edited in two places and drifts.

# Related Documents

- [[07-ui-ux/README]]
- [[ResponsiveRules-Part02]]
- [[ResponsiveRules-Part03]]
- [[ResponsiveRules-Part04]]
- [[ResponsiveRules-Diagrams]]
- [[WorkspaceLayout-Part01]]
- [[WorkspaceLayout-Part03]]
- [[WorkspaceLayout-Part06]]
- [[Sidebar-Part03]]
- [[TerminalCards-Part03]]
- [[Panels-Part03]]
- [[DesignTokens-Part02]]
- [[Animations-Part01]]
- [[Themes-Part03]]
