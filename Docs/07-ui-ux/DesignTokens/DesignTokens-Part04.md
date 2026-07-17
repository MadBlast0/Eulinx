---
title: DesignTokens Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - design-tokens
  - typography
related:
  - "[[07-ui-ux/README]]"
  - "[[DesignTokens-Part03]]"
  - "[[DesignTokens-Part05]]"
  - "[[DesignTokens-Diagrams]]"
  - "[[Typography-Part01]]"
  - "[[Typography-Part02]]"
---

# DesignTokens Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Tokens as the Single Source of Style
Part 02 - Spacing, Radius, and Layout Tokens
Part 03 - Color Tokens, the Status Ramp, and the Terminal Palette
Part 04 - Typography and Font Tokens
Part 05 - Motion, Shadow, and Z-Index Tokens
Part 06 - Naming, Migration, and the Implementation Checklist
Diagrams - DesignTokens-Diagrams.md

# Purpose of This Part

This part specifies the typography tokens: font families, the size scale, weights, and line-heights. Typography is shared across light/dark ([[Themes-Part02]]) and is the backbone of readability. The terminal monospace token is defined here and consumed by [[TerminalView-Part04]].

# Font Families

Two families: a UI sans and a mono. Content prose may use the sans; code and terminal use mono.

```text
--font-sans:   "Inter", system-ui, -apple-system, sans-serif
--font-mono:   "JetBrains Mono", "Cascadia Code", ui-monospace, monospace
--font-read:   same as sans by default; overridable for docs
```

Fonts are loaded via the app bundle (Tauri serves local fonts, no network). The fallback chain ensures text renders even if a font fails to load. The mono stack is what keeps terminal and code blocks aligned to a grid.

# The Size Scale

A type scale with named steps. Components use the step name, not a px size.

```text
--font-size-xs:   11px
--font-size-sm:   12px
--font-size-md:   13px   (base UI text)
--font-size-lg:   15px
--font-size-xl:   18px
--font-size-2xl:  22px
--font-size-3xl:  28px
```

```text
base UI:          var(--font-size-md)
secondary text:   var(--font-size-sm)
headings:         var(--font-size-xl .. 3xl)
terminal:         var(--font-size-md) or --terminal-font-size (TerminalView-Part04)
```

The base is 13px (not 14/16) because the app is information-dense (terminals, graphs, panels). It is still ≥ the 12px minimum for body text ([[Accessibility-Part05]]).

# Weights and Line Height

```text
--font-weight-regular: 400
--font-weight-medium:  500
--font-weight-semibold:600
--font-weight-bold:    700

--leading-tight:  1.25   // headings
--leading-normal: 1.5    // body
--leading-relaxed:1.65   // docs/prose
```

Weights are limited to four to keep the bundle small and the hierarchy clear. Line-height tokens pair with the size scale: headings tight, body normal, prose relaxed.

# Tabular and Code

Numbers in tables/status must be tabular so columns align. Code uses mono with its own relaxed line-height.

```text
--font-variant-numeric: tabular-nums;   // applied to numeric status
--code-line-height: 1.5;                // mono blocks
```

Tabular numerals prevent the "numbers jiggle as they change" problem in live status displays ([[NodeGraph-Part07]]).

# Density and Type

Density can nudge the base size down one step (compact = `sm` base) but never below the 12px floor. This is a re-point of `--font-size-md`, not a per-component change.

```text
compact:   --font-size-md = 12px (still >= floor)
comfortable: --font-size-md = 13px
```

# AI Notes

Do not hardcode font-size in components. Use the scale. Hardcoded 14px drifts from the scale and breaks density and consistency.

Do not drop below 12px for body text. The contrast/readability floor ([[Accessibility-Part05]]) requires it. Compact mode re-points the scale, never goes under.

Do not use more than four weights. Extra weights bloat the font bundle and muddle hierarchy. medium/semibold/bold cover emphasis needs.

Do not use proportional numerals for live status. Use tabular-nums so changing numbers don't reflow columns. This is a small token that prevents jitter in busy status views.

# Related Documents

- [[07-ui-ux/README]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part02]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part05]]
- [[DesignTokens-Diagrams]]
- [[Themes-Part02]]
- [[Typography-Part01]]
- [[Typography-Part02]]
- [[TerminalView-Part04]]
- [[NodeGraph-Part07]]
- [[Accessibility-Part05]]
