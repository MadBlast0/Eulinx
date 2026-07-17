---
title: ResponsiveRules Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - responsive-rules
  - breakpoints
related:
  - "[[07-ui-ux/README]]"
  - "[[ResponsiveRules-Part01]]"
  - "[[ResponsiveRules-Part03]]"
  - "[[ResponsiveRules-Diagrams]]"
  - "[[WorkspaceLayout-Part03]]"
  - "[[DesignTokens-Part02]]"
  - "[[TerminalCards-Part03]]
---

# ResponsiveRules Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and the Surface-Agnostic Rule
Part 02 - Breakpoints, the Container Query Model, and the Grid
Part 03 - Per-Surface Adaptation and the Collapse Order
Part 04 - Density, Zoom, and the Implementation Checklist
Diagrams - ResponsiveRules-Diagrams.md

# Purpose of This Part

This part specifies the breakpoints (window widths that trigger adaptation), the container-query model (regions adapting to their own size), and how fluid grids (cards, panel content) respond. Breakpoints are token-driven and few; the app adapts in a small number of steps, not continuously per pixel (except region sizes, which are fluid via the solver).

# The Breakpoint Steps

Eulinx uses a small set of window-width breakpoints. Between steps, region sizes are fluid (solver, [[WorkspaceLayout-Part03]]); at a step, a structural adaptation fires.

```text
--bp-sm:   720px    (small laptop / split screen)
--bp-md:   1024px   (standard laptop)
--bp-lg:   1440px   (desktop)
--bp-xl:   1920px   (wide)
```

```text
>= bp-lg:   full layout: sidebar expanded, inspector + panel visible
bp-md..lg: inspector/panel may start collapsed if space tight
bp-sm..md: sidebar rails by default; inspector hidden by default
<  bp-sm:   sidebar hidden by default; only canvas + statusBar + minimal
```

These are starting defaults; the solver still enforces minima, so a user who expands the sidebar at `bp-sm` keeps it until the sum-invariant forces a collapse ([[WorkspaceLayout-Part03]]).

# Window vs Container Queries

Two query types, two purposes:

```text
window query:    @media (min-width: var(--bp-md))  -> shell adaptation
container query: @container (min-width: 480px)     -> region-internal grid
```

```text
shell (window):  which regions are expanded/railed/hidden
region (container): card grid columns, panel content density, list vs compact
```

The card grid ([[TerminalCards-Part03]]) is a container query: it reflows by the panel's width, independent of the window. This lets a narrow panel show one column even on a wide monitor.

# Fluid Region Sizes

Between breakpoints, region widths are fluid, not stepped. The solver computes `canvas.size` as the remainder ([[WorkspaceLayout-Part03]]); only the structural adaptations (rail/hide) are stepped at breakpoints.

```text
fluid:     sidebar 180..320, inspector 240..420 (user-draggable, clamped)
stepped:   at bp-sm sidebar defaults to rail; at <bp-sm to hidden
```

This hybrid (fluid sizes + stepped structure) gives smooth dragging with predictable structural behavior at extremes.

# The Card/Grid Response

Fluid grids inside regions use `auto-fill minmax` driven by tokens, so they need no breakpoint of their own — they naturally reflow as the container changes.

```css
.card-grid {
  grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr));
}
```

```text
narrow container: 1 column
wide container:   many columns
no media query needed: intrinsic responsiveness via minmax
```

This is the preferred pattern: intrinsic responsiveness (minmax/container queries) over explicit width breakpoints, because it adapts to the actual container, not an assumed window.

# Zoom Consideration

OS/zoom scaling changes the effective CSS px of the window. Breakpoints use CSS px (post-DPR), so a 720px window at 200% OS zoom is still evaluated at 720 CSS px — the layout adapts to the logical size the user sees, which is correct.

```text
rule:        breakpoints in CSS px (logical), not device px
result:      high-DPI + OS zoom produce the same layout decisions
```

# AI Notes

Do not add many breakpoints. Keep the set small (4 steps). Many breakpoints mean many states to test and a cheap model will get one wrong. Fluid sizes + a few steps cover the range.

Do not drive internal grids with window media queries. Use container queries / minmax. A card grid keyed to window width breaks when the panel is narrow on a wide screen.

Do not make region sizes stepped. They are fluid (solver remainder). Only structural adaptations (rail/hide) are stepped. Stepped sizes fight the user's drag.

Do not evaluate breakpoints in device px. Use CSS px. Device-px evaluation makes OS zoom produce wrong layout decisions.

# Related Documents

- [[07-ui-ux/README]]
- [[ResponsiveRules-Part01]]
- [[ResponsiveRules-Part03]]
- [[ResponsiveRules-Part04]]
- [[ResponsiveRules-Diagrams]]
- [[WorkspaceLayout-Part03]]
- [[DesignTokens-Part02]]
- [[TerminalCards-Part03]]
- [[Panels-Part03]]
- [[TerminalView-Part03]]
