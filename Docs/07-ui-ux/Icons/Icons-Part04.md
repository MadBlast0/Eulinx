---
title: Icons Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - icons
  - localization
related:
  - "[[07-ui-ux/README]]"
  - "[[Icons-Part03]]"
  - "[[Icons-Diagrams]]"
  - "[[Accessibility-Part06]]"
  - "[[Typography-Part04]]"
  - "[[DesignTokens-Part02]]"
---

# Icons Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Icon as a Token-Driven Glyph
Part 02 - The Icon Set, Naming, and the SVG Contract
Part 03 - Icon Usage, Sizing, and Color
Part 04 - Accessibility, Localization, and the Checklist
Diagrams - Icons-Diagrams.md

# Purpose of This Part

This part specifies accessibility and localization rules for icons and the implementation checklist. Icons are decorative by default (hidden from assistive tech unless they label a control). They must also behave under RTL and density. Getting this right means icons enhance, never hinder, the interface.

# Decorative vs Labeling

By default an icon is `aria-hidden="true"` because its meaning is carried by adjacent text. Only an icon that IS the control's label gets an accessible name.

```text
decorative:   <Icon name="run" aria-hidden />  next to "Run" text
labeling:     <button aria-label="Run"><Icon name="run"/></button>  (icon-only)
```

A decorative icon exposed to AT would be read as a redundant/confusing name. Hiding it (`aria-hidden`) is correct because the text carries the name.

# RTL and Icons

Directional icons (back/forward, chevrons) must flip in RTL. Non-directional icons (settings, close) do not.

```text
flip in RTL:   arrow-left/right, chevron-left/right, caret, undo/redo pair
do not flip:   close, search, settings, check, info
```

The icon component reads `dir` and applies a horizontal scale(-1) transform for the flip set, or the font/set provides pre-flipped variants. Hardcoding a chevron that points the wrong way in Arabic is a visible bug.

# Density and Icons

Density ([[Typography-Part04]]) can step icon size down one notch (comfortable md -> compact sm) but icons never disappear and never drop below `--icon-xs` in interactive contexts (a too-small tap target).

```text
comfortable:   default sizes as Part 03
compact:       step down one (md->sm) where space is tight
minimum:       interactive icons stay >= --icon-sm for hit area
```

Icon hit areas also respect the minimum control size from [[Accessibility-Part05]]; a 12px icon still sits in a >= 24px button.

# Contrast

Icon color (when not currentColor on text) must meet the non-text contrast minimum: 3:1 against its background for the status/standalone cases.

```text
standalone icon:   >= 3:1 vs bg (WCAG non-text)
icon on text:      inherits text contrast (>= 4.5:1)
```

A faint icon at 2:1 against a light surface fails non-text contrast and is hard to see for low-vision users.

# The Implementation Checklist

```text
[ ] Icons sized from the icon scale; no arbitrary px.
[ ] Icon color = currentColor or status token; no hardcoded.
[ ] Custom actions paired with text or labeled icon-btn + tooltip.
[ ] Icon-only buttons have aria-label + mandatory tooltip.
[ ] Decorative icons aria-hidden; only labeling icons named.
[ ] Directional icons flip in RTL.
[ ] Density steps size; interactive icons stay tappable.
[ ] Standalone icons meet 3:1 non-text contrast.
[ ] State shown by icon + text/aria-live, never icon alone.
[ ] SVG contract from Icons-Part02 honored (viewBox, currentColor).
```

# Known Limitations (v1)

```text
- Icon font vs SVG: v1 uses SVG components (Icons-Part02) for
  crisp theming; an icon-font option is a future ADR.
- RTL flip set is curated; a newly added directional icon must
  be registered in the flip set or it stays LTR.
```

# AI Notes

Do not expose decorative icons to AT. Mark `aria-hidden`. An icon read aloud next to its text label is noise for screen-reader users.

Do not forget RTL flips for directional icons. A back-chevron pointing right in Arabic is an obvious, embarrassing bug. Register directional icons in the flip set.

Do not let density shrink interactive icons below tappable. Step size but keep the hit area. A 12px icon in a 16px button is unclickable.

Do not use icon-only custom actions. Pair with text or a labeled button + tooltip. Icon-only workflow actions are undiscoverable and fail accessibility.

# Related Documents

- [[07-ui-ux/README]]
- [[Icons-Part01]]
- [[Icons-Part02]]
- [[Icons-Part03]]
- [[Icons-Diagrams]]
- [[DesignTokens-Part02]]
- [[DesignTokens-Part03]]
- [[Typography-Part04]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
- [[ResponsiveRules-Part03]]
