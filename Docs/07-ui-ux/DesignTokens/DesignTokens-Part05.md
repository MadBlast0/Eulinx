---
title: DesignTokens Specification - Part 05
status: draft
version: 1.0
tags:
  - ui-ux
  - design-tokens
  - motion
related:
  - "[[07-ui-ux/README]]"
  - "[[DesignTokens-Part04]]"
  - "[[DesignTokens-Part06]]"
  - "[[DesignTokens-Diagrams]]"
  - "[[Animations-Part01]]"
  - "[[Animations-Part02]]"
  - "[[Animations-Part03]]"
  - "[[Accessibility-Part04]]"
---

# DesignTokens Specification - Part 05)

## Document Index

Part 01 - Purpose, Philosophy, Tokens as the Single Source of Style
Part 02 - Spacing, Radius, and Layout Tokens
Part 03 - Color Tokens, the Status Ramp, and the Terminal Palette
Part 04 - Typography and Font Tokens
Part 05 - Motion, Shadow, and Z-Index Tokens
Part 06 - Naming, Migration, and the Implementation Checklist
Diagrams - DesignTokens-Diagrams.md

# Purpose of This Part

This part specifies the motion, shadow, and z-index tokens. Motion is the visible half of "calm by default" ([[Animations-Part01]]); shadows convey elevation; z-index prevents layering chaos. All three are token-driven so they can be tuned (and disabled under reduced-motion) in one place.

# Motion Tokens

Durations and easings as tokens. Components reference these, never raw `0.2s ease`.

```text
--motion-duration-fast:   120ms
--motion-duration-base:   200ms
--motion-duration-slow:   320ms
--motion-ease-standard:   cubic-bezier(0.2, 0, 0, 1)
--motion-ease-emphasized: cubic-bezier(0.3, 0, 0, 1)
--motion-ease-out:        cubic-bezier(0, 0, 0, 1)
```

```text
hover/focus:    var(--motion-duration-fast)
panel open:     var(--motion-duration-base)
modal/large:    var(--motion-duration-slow)
```

Motion is used sparingly ([[Animations-Part01]]): status pulses, focus ring, panel slide, modal. Big bouncy transitions are explicitly out of scope. The easings are "decelerate" curves — things settle, they don't overshoot.

# Reduced Motion Override

Under `prefers-reduced-motion: reduce`, every motion token collapses to `0ms` via a media query that re-points the tokens. Components do not need per-component media queries.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 0ms;
    --motion-duration-base: 0ms;
    --motion-duration-slow: 0ms;
  }
}
```

This single switch satisfies [[Accessibility-Part04]] for all motion. Components that animate MUST use the tokens, not literals, or they bypass the override.

# Shadow Tokens

Elevation expressed as a small set of shadows. More elevation = higher token.

```text
--shadow-none:    none
--shadow-sm:      0 1px 2px rgba(0,0,0,0.18)
--shadow-md:      0 4px 12px rgba(0,0,0,0.22)
--shadow-lg:      0 12px 32px rgba(0,0,0,0.28)
```

```text
surface:     var(--shadow-none) or --shadow-sm (subtle)
popover:     var(--shadow-md)
dialog/modal:var(--shadow-lg)
```

Shadows are subtle on light themes and slightly stronger on dark (where elevation reads differently). The values are theme-overridable ([[Themes-Part02]]) but the token names are fixed.

# Z-Index Tokens

A strict layering scale. No component invents a z-index; it uses the named layer.

```text
--z-base:        0
--z-sticky:      10     // tab strips, headers
--z-dropdown:    100    // menus, combobox popups
--z-overlay:     200    // panel/modal scrim
--z-modal:       300    // dialogs
--z-toast:       400    // notifications
--z-tooltip:     500    // tooltips, top of stack
```

```text
rule:        a child may not exceed its parent's layer + small delta
forbidden:   z-index: 99999;  (bypasses the scale, causes stacking bugs)
```

The scale prevents the classic "my tooltip is under the modal" bug by giving every surface a known rank. A toast above a modal is intentional (users must see errors), hence `--z-toast > --z-modal`.

# AI Notes

Do not use raw durations/easings in components. Read motion tokens. Raw `0.2s` bypasses the reduced-motion override and breaks accessibility for every animation.

Do not invent z-index values. Use the layer tokens. A `z-index: 99999` tooltip buried under a modal is the predictable result of bypassing the scale.

Do not use shadows for color contrast. Shadows convey elevation, not readability. Text must meet contrast from color tokens ([[DesignTokens-Part03]]), not from a drop shadow.

Do not make motion "expressive." Keep decelerate curves and short durations. Bouncy/overshoot motion contradicts the calm-by-default principle and annoys power users.

# Related Documents

- [[07-ui-ux/README]]
- [[DesignTokens-Part01]]
- [[DesignTokens-Part02]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part04]]
- [[DesignTokens-Part06]]
- [[DesignTokens-Diagrams]]
- [[Themes-Part02]]
- [[Animations-Part01]]
- [[Animations-Part02]]
- [[Animations-Part03]]
- [[Accessibility-Part04]]
