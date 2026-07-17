---
title: DesignTokens Specification - Part 02
status: draft
version: 1.0
tags:
  - ui-ux
  - design-tokens
  - spacing
related:
  - "[[07-ui-ux/README]]"
  - "[[DesignTokens-Part01]]"
  - "[[DesignTokens-Part03]]"
  - "[[DesignTokens-Diagrams]]"
  - "[[Themes-Part02]]"
  - "[[ResponsiveRules-Part03]]"
---

# DesignTokens Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, Tokens as the Single Source of Style
Part 02 - Spacing, Radius, and Layout Tokens
Part 03 - Color Tokens, the Status Ramp, and the Terminal Palette
Part 04 - Typography and Font Tokens
Part 05 - Motion, Shadow, and Z-Index Tokens
Part 06 - Naming, Migration, and the Implementation Checklist
Diagrams - DesignTokens-Diagrams.md

# Purpose of This Part

This part specifies the spacing, radius, and layout tokens. These are the structural tokens: they decide sizes and gaps, not colors. They are theme-independent (shared across light/dark per [[Themes-Part02]]) unless a theme chooses to override them. Consistent spacing is what makes the app feel designed rather than assembled.

# The Spacing Scale

Spacing uses a 4px base scale. Every gap, padding, and margin reads from a scale token — never a hardcoded pixel value in component code.

```text
--space-0:  0
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  24px
--space-6:  32px
--space-7:  48px
--space-8:  64px
```

```text
component rule:   padding: var(--space-3);  gap: var(--space-2);
forbidden:        padding: 12px;  (hardcoded, breaks theming/scale)
```

The scale is geometric-ish but rounded to the 4px grid so it always aligns to the pixel grid on standard DPI. Non-scale values (e.g. 10px) are prohibited in component CSS; if a need arises, a scale step is added, not an ad-hoc value.

# Semantic Spacing

On top of the raw scale, semantic tokens name common roles so related surfaces share spacing intent.

```text
--space-surface-pad:    var(--space-4)   // panel/card inner padding
--space-section-gap:    var(--space-5)   // between major sections
--space-control-gap:    var(--space-2)   // between controls in a row
--space-stack:          var(--space-3)   // vertical stack between rows
```

Semantic tokens may be re-pointed by a theme or a density setting ([[TerminalCards-Part03]]) without touching every component. A "compact" density sets `--space-control-gap` to `--space-1`.

# Radius Tokens

Corner radii follow a small set. Sharp UIs use 0; Eulinx uses a mild rounding for friendliness without bubble aesthetics.

```text
--radius-none:   0
--radius-sm:     4px
--radius-md:     8px
--radius-lg:     12px
--radius-full:   9999px   // pills, avatars
```

```text
cards/panels:    var(--radius-lg)
buttons/inputs:  var(--radius-md)
chips/badges:    var(--radius-full) or --radius-sm
```

Radius is theme-neutral; a theme could ship a "sharp" variant by overriding these to `none`, but built-ins keep the values above.

# Layout Tokens

Layout tokens encode the shell's structural constants so components and the solver agree on sizes ([[WorkspaceLayout-Part03]]).

```text
--layout-titlebar-h:    36px
--layout-statusbar-h:   24px
--layout-sidebar-min:   180px
--layout-sidebar-rail:  48px
--layout-inspector-min: 240px
--layout-panel-min:     120px
--layout-graph-min:     480px
```

These are the floors the resize solver clamps against. A component must read `--layout-sidebar-min`, never hardcode 180, so a theme or a future change updates both the solver and the UI in one place.

# Density and Scaling

Density is a view setting that scales a subset of spacing/layout tokens. It does not change color or theme.

```text
comfortable:  --space-control-gap = --space-2 (default)
compact:      --space-control-gap = --space-1; --layout-titlebar-h = 30px
```

Density is Tier 2 ([[Themes-Part03]] is app-level; density is per-surface view state). It is applied by re-pointing semantic tokens, not by editing every component.

# AI Notes

Do not hardcode spacing pixels in components. Read scale/semantic tokens. Hardcoded 12px silently breaks density and theming and produces misaligned grids.

Do not invent off-scale spacing values. Add a scale step if needed. Ad-hoc values (10px, 14px) drift from the 4px grid and misalign across surfaces.

Do not hardcode layout floors. Read `--layout-*` tokens so the solver and UI agree. A component with its own 180 hardcode will fight the resize clamp.

Do not put density in color themes. Density scales spacing/layout only (Tier 2 view state), not color (which is theme). Mixing them couples two independent concerns.

# Related Documents

- [[07-ui-ux/README]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part04]]
- [[DesignTokens-Diagrams]]
- [[Themes-Part02]]
- [[WorkspaceLayout-Part03]]
- [[TerminalCards-Part03]]
- [[ResponsiveRules-Part03]]
- [[Accessibility-Part01]]
