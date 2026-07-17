---
title: Typography Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - typography
  - localization
related:
  - "[[07-ui-ux/README]]"
  - "[[Typography-Part03]]"
  - "[[Typography-Diagrams]]"
  - "[[DesignTokens-Part04]]"
  - "[[Accessibility-Part05]]"
  - "[[ResponsiveRules-Part03]]"
---

# Typography Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Type as a Token-Driven System
Part 02 - The Type Scale, Fonts, and the Mono Contract
Part 03 - Component Typography: Buttons, Inputs, Lists, and Code
Part 04 - Density, Localization, and the Implementation Checklist
Diagrams - Typography-Diagrams.md

# Purpose of This Part

This part specifies density behavior, localization concerns (RTL, font fallback for non-Latin scripts), and the implementation checklist. Typography must survive translation: German labels are longer than English; Arabic is RTL. The token system absorbs density; localization needs a few extra rules so type does not overflow or misalign.

# Density and Type

Density ([[DesignTokens-Part02]], [[TerminalCards-Part03]]) re-points the base size token, never per-component sizes.

```text
comfortable:   --font-size-md = 13px (default)
compact:       --font-size-md = 12px (>= 12px floor)
```

```text
rule:          density changes the scale root, not individual sizes
result:        all components scale together; rhythm preserved
```

Because every component reads the scale, one re-point resizes the whole app coherently. A component that hardcoded its size would ignore density and look wrong next to scaled siblings.

# Line Length and Wrapping

Body prose (docs, chat messages) should cap line length for readability. UI labels do not wrap; they truncate with an ellipsis and a tooltip.

```text
prose max-width:   token --read-measure (default 70ch)
UI label:          white-space: nowrap; overflow: hidden; ellipsis
tooltip on hover:  shows full label (token --tooltip)
```

Capping measure improves readability of longer text; never truncating prose silently. UI chrome truncates because a button label wrapping to two lines breaks layout — but the full text is always reachable via tooltip/aria.

# Localization: Longer Strings

Translated strings can be 2-3x the English length (German, Finnish). Components must not assume English width.

```text
rule:           buttons/labels use flexible width; min-content honored
forbidden:      fixed-width labels that clip translation
fallback:       if clipped, ellipsis + tooltip (see above)
```

The flex layout ([[WorkspaceLayout-Part01]]) gives surfaces room; labels that would clip fall back to ellipsis. No component hardcodes a width that assumes English.

# Localization: RTL

For RTL locales, the type system follows the document direction; logical properties (margin-inline, padding-inline) are used so spacing flips correctly.

```text
rule:           use logical properties (inline/block), not physical
example:        padding-inline-start, not padding-left
result:         RTL flips automatically with dir="rtl"
```

Hardcoded `left`/`right` breaks RTL. Logical properties are mandated by lint for any component with directional spacing. This is a small rule with a large payoff for Arabic/Hebrew users.

# Font Fallback for Scripts

The sans stack falls back to system fonts for CJK and other scripts not covered by the primary font.

```text
--font-sans:   "Inter", system-ui, "Noto Sans CJK SC", sans-serif
--font-mono:   "JetBrains Mono", ui-monospace, "Noto Sans Mono CJK", monospace
```

If a glyph is missing from the primary font, the fallback chain renders it. The UI must not assume every character is in Inter; the fallback exists for exactly this.

# The Implementation Checklist

```text
[ ] Every component reads type tokens; no hardcoded sizes.
[ ] Code blocks scroll, never wrap mid-token.
[ ] Headings cap at semibold; emphasis uses weight not color alone.
[ ] Density re-points scale root; components scale together.
[ ] Prose caps measure; UI labels truncate with tooltip.
[ ] No fixed widths that clip translations.
[ ] Logical properties for directional spacing (RTL-safe).
[ ] Font stacks include CJK/Unicode fallbacks.
[ ] Base size never below 12px (Accessibility-Part05).
[ ] Numeric columns use tabular-nums.
```

# Known Limitations (v1)

```text
- Full RTL layout of the shell (region order flip) is a future
  ADR; v1 ensures type/spacing flip correctly but the shell
  region order itself may stay LTR.
- Custom user fonts beyond the bundle are not loaded in v1;
  the fallback chain covers system fonts only.
```

# AI Notes

Do not hardcode component font sizes. Read the scale. Hardcoded sizes ignore density and desync from scaled siblings.

Do not use physical left/right for spacing. Use logical properties. Physical `padding-left` breaks RTL and is a lint error.

Do not assume English width. Use flexible labels with ellipsis+tooltip. Fixed widths clip German/Finnish and look broken.

Do not wrap code. Scroll it. And do not drop the CJK fallback from the font stack — doing so renders tofu boxes for non-Latin users.

# Related Documents

- [[07-ui-ux/README]]
- [[Typography-Part01]]
- [[Typography-Part02]]
- [[Typography-Part03]]
- [[Typography-Diagrams]]
- [[DesignTokens-Part02]]
- [[DesignTokens-Part04]]
- [[TerminalCards-Part03]]
- [[TerminalView-Part04]]
- [[WorkspaceLayout-Part01]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
- [[ResponsiveRules-Part03]]
