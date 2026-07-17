---
title: Typography Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - typography
  - components
related:
  - "[[07-ui-ux/README]]"
  - "[[Typography-Part01]]"
  - "[[Typography-Part02]]"
  - "[[Typography-Diagrams]]"
  - "[[DesignTokens-Part04]]"
  - "[[Accessibility-Part05]]"
---

# Typography Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, Type as a Token-Driven System
Part 02 - The Type Scale, Fonts, and the Mono Contract
Part 03 - Component Typography: Buttons, Inputs, Lists, and Code
Part 04 - Density, Localization, and the Implementation Checklist
Diagrams - Typography-Diagrams.md

# Purpose of This Part

This part specifies how typography is applied to concrete components: buttons, inputs, lists, tables, and code blocks. Every component reads type tokens ([[DesignTokens-Part04]]); none set their own sizes. The goal is a consistent rhythm where text in any control aligns to the same baseline grid.

# Buttons and Inputs

Controls share the base size and a consistent height rhythm derived from spacing + line-height.

```text
button label:   var(--font-size-md), weight medium, --leading-normal
input text:     var(--font-size-md), weight regular, --leading-normal
button height:  --space-3 * 2 + line box  (resolved via layout tokens)
input height:   matches button height for row alignment
```

```text
rule:           controls in a row share height; labels share size
forbidden:      a 14px button next to a 12px input (misaligned rhythm)
```

Buttons use `medium` weight for label emphasis without boldness; inputs use `regular`. The shared height keeps forms and toolbars visually aligned. The terminal's input field uses mono ([[Typography-Part02]]) because it is a shell line.

# Lists and Tables

Lists and tables are where tabular numerals and tight leading matter most.

```text
list item:      var(--font-size-md), --leading-normal, --space-2 gap
table cell:     var(--font-size-sm), tabular-nums, --leading-normal
table header:   var(--font-size-sm), weight semibold, muted fg
numeric col:    font-variant-numeric: tabular-nums (alignment)
```

Tables use the smaller size to fit dense data, but never below 12px ([[Accessibility-Part05]]). Numeric columns use tabular figures so digits align vertically as values update (live status, durations).

# Code Blocks

Code blocks and inline code use the mono token with relaxed leading and the terminal-adjacent background.

```text
code block:     var(--font-mono), --font-size-sm, --code-line-height
inline code:    var(--font-mono), --font-size-sm, --color-bg-inset bg
pre wrap:       white-space: pre; overflow-x: auto (never reflow)
```

Code never wraps mid-token; it scrolls horizontally. Syntax highlighting (if present) uses the status/terminal color tokens, not ad-hoc colors, so it follows the theme ([[Themes-Part02]]).

# Headings and Section Titles

```text
h1 (view title):  var(--font-size-2xl), weight semibold, --leading-tight
h2 (section):     var(--font-size-xl),  weight semibold, --leading-tight
h3 (sub):         var(--font-size-lg),  weight medium,   --leading-tight
```

Headings step through the scale; a surface title is `2xl`, section `xl`. The tight leading keeps headings compact in a dense app. Weight stops at semibold for headings (no bold) to avoid heaviness.

# Links and Emphasis

```text
link:           --color-accent fg, underline on hover/focus
strong:         weight semibold (not a color change alone)
em:             italic, same color (used sparingly)
```

Links use accent color + hover underline. Emphasis uses weight, not color, so it survives in monochrome/print and aids low-vision users who may not perceive the accent (paired signal per [[Accessibility-Part06]]).

# AI Notes

Do not set control font sizes ad hoc. Read type tokens. A 14px button next to a 12px input breaks the rhythm and looks unplanned.

Do not wrap code mid-token. Scroll it. Wrapping code destroys its structure and makes it unreadable; horizontal scroll is the correct pattern.

Do not use bold for all headings. Cap at semibold. Heavy bold everywhere makes nothing stand out and adds weight to the bundle.

Do not color alone for emphasis. Use weight (strong) so emphasis survives monochrome and helps low-vision users ([[Accessibility-Part06]]).

# Related Documents

- [[07-ui-ux/README]]
- [[Typography-Part01]]
- [[Typography-Part02]]
- [[Typography-Part04]]
- [[Typography-Diagrams]]
- [[DesignTokens-Part04]]
- [[DesignTokens-Part03]]
- [[TerminalView-Part04]]
- [[Themes-Part02]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
