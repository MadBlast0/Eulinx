---
title: Icons Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - icons
  - accessibility
related:
  - "[[07-ui-ux/README]]"
  - "[[Icons-Part01]]"
  - "[[Icons-Part02]]"
  - "[[Icons-Diagrams]]"
  - "[[Accessibility-Part06]]"
  - "[[Typography-Part04]]"
---

# Icons Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, Icon as a Token-Driven Glyph
Part 02 - The Icon Set, Naming, and the SVG Contract
Part 03 - Icon Usage, Sizing, and Color
Part 04 - Accessibility, Localization, and the Checklist
Diagrams - Icons-Diagrams.md

# Purpose of This Part

This part specifies how icons are used: sizing, color (driven by tokens), and the rule that an icon never stands alone for meaning. Icons are decoration that reinforces a labeled action; they are not a language of their own. This part keeps icon usage consistent and accessible.

# Sizing

Icons use a size scale tied to the type scale, not arbitrary pixels. The icon box is square; the glyph has built-in padding.

```text
--icon-xs:  12px   (dense lists, status)
--icon-sm:  14px   (inline with sm text)
--icon-md:  16px   (default, buttons, rows)
--icon-lg:  20px   (section headers)
--icon-xl:  24px   (empty states, hero)
```

```text
rule:        icon size matches its text size + 2-4px
example:    md button (13px text) -> 16px icon
forbidden:   icon-lg in a md button (visual mismatch)
```

The icon box uses `currentColor` for stroke/fill so it inherits text color; size comes from the width/height attributes bound to the size token. Never set icon size in px outside the scale.

# Color

Icon color is inherited (`currentColor`) or set from a semantic token. Icons do not carry their own colors except status icons, which use the status ramp ([[DesignTokens-Part03]]).

```text
default icon:    color: var(--color-fg-muted) or currentColor
action icon:     currentColor (matches label)
status icon:     var(--color-status-*)  (running/error/etc)
disabled icon:   var(--color-fg-subtle) + reduced opacity
```

An icon inside a primary button uses `accent-fg` (the button's text color), so it stays visible. A status icon uses the status token so it aligns with the node/card status color elsewhere.

# Icons Never Alone

An icon without a text label is allowed ONLY when the control also has an accessible name (aria-label) and is a well-known glyph (close ✕, search 🔍, menu ☰). For anything workflow-specific, a visible label is required.

```text
allowed alone:     close, search, menu, expand/collapse, settings gear
requires label:    run, duplicate, connect, any custom action
rule:              if not in the "known glyph" set, pair with text
```

This is the "no dead ends / no color-alone" rule applied to icons ([[Accessibility-Part06]]). An icon-only custom action is a mystery button for new users and screen-reader users alike.

# Icon Buttons

An icon-only button is a button with an aria-label and the known-glyph allowance above.

```ts
<button aria-label="Close terminal" class="icon-btn">
  <Icon name="close" size="md" />
</button>
```

```text
icon-btn:    square, --space-2 padding, radius-md, focus ring (Accessibility-Part03)
tooltip:     required for icon-only buttons (title or token tooltip)
```

The tooltip is mandatory: even a known glyph benefits from a text hint on hover/focus, and it satisfies the "reachable full label" rule from [[Typography-Part04]].

# State and Animation

Icons may reflect state (spin for loading, check for done) but the state MUST also be conveyed by text or aria-live, not by the icon alone.

```text
loading:     spinner icon + aria-busy + (optional) text
success:     check icon + text/announcement
```

A spinner with no text label and no aria announcement is an invisible state change to a screen-reader user.

# AI Notes

Do not use arbitrary icon sizes. Read the icon scale. A 20px icon in a 13px button looks broken and misaligns the row.

Do not give custom actions icon-only buttons without labels. Pair with text or a mandatory tooltip + aria-label. A mystery glyph fails accessibility and discoverability.

Do not color icons with hardcoded values. Use currentColor or status tokens. Hardcoded icon colors break theming and the status-color agreement.

Do not convey state by icon alone. Spin/check must come with text or aria-live. An icon-only state change is invisible to screen readers.

# Related Documents

- [[07-ui-ux/README]]
- [[Icons-Part01]]
- [[Icons-Part02]]
- [[Icons-Part04]]
- [[Icons-Diagrams]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part04]]
- [[Accessibility-Part03]]
- [[Accessibility-Part06]]
- [[Typography-Part04]]
