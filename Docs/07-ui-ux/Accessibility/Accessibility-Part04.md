---
title: Accessibility Specification - Part 04
status: draft
version: 1.0
tags:
  - ui-ux
  - accessibility
  - reduced-motion
related:
  - "[[07-ui-ux/README]]"
  - "[[Accessibility-Part03]]"
  - "[[Accessibility-Part05]]"
  - "[[Accessibility-Diagrams]]"
  - "[[Animations-Part03]]"
  - "[[DesignTokens-Part05]]"
---

# Accessibility Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the No-Dead-Ends Rule
Part 02 - Semantic Structure, Roles, and the ARIA Contract
Part 03 - Focus Management and the Focus Ring
Part 04 - Reduced Motion, Contrast, and Visual A11y
Part 05 - Color Contrast and the WCAG Contract
Part 06 - Screen Readers, Testing, and the Checklist
Diagrams - Accessibility-Diagrams.md

# Purpose of This Part

This part specifies reduced-motion support and general visual accessibility (text resize, zoom, high-contrast). Reduced motion is covered technically in [[Animations-Part03]] and [[DesignTokens-Part05]]; this part states the accessibility requirement and the surrounding visual-a11y rules (the app must work at 200% zoom and with OS text scaling).

# Reduced Motion Requirement

The app MUST honor `prefers-reduced-motion: reduce`. This is not a nice-to-have; it is required for users with vestibular disorders.

```text
requirement:   all non-essential motion stops under reduce
requirement:   status still conveyed without motion (color/shape)
mechanism:     token override (DesignTokens-Part05, Animations-Part03)
verification:  every animated thing uses tokens (lint)
```

The parallel with [[Animations-Part03]] is intentional: that part gives the mechanism, this part gives the requirement. Both agree status must survive without motion.

# Zoom and Text Resize

The app must remain usable at 200% browser/OS zoom and with OS text scaling. Because it is a Tauri desktop app, this means the layout must not hard-break when the OS DPI or font scale changes.

```text
rule:        layout uses tokens + fl/grid; no fixed px that clips at zoom
rule:        text never truncated irrecoverably at 200% (tooltip/scroll)
rule:        min control size preserved (Accessibility-Part05)
```

Fixed-pixel layouts that assume 100% zoom clip content at 200%. The flexible layout ([[WorkspaceLayout-Part01]]) and token spacing absorb scaling; hardcoded px does not.

# High Contrast / Forced Colors

The app should degrade acceptably under Windows High Contrast / forced-colors mode: tokens that become system colors still produce a usable UI.

```text
rule:        do not rely on color alone for state (Accessibility-Part06)
rule:        borders use --color-border, not box-shadow-only (HC strips shadow)
rule:        focus ring visible under forced-colors (system color)
```

Forced-colors mode removes shadows and some backgrounds; a control whose only boundary is a shadow becomes invisible. Borders (token-driven) survive. This is why [[DesignTokens-Part05]] keeps shadows subtle and borders explicit.

# Minimum Target Size

Interactive controls meet a minimum hit area so they are operable by users with motor impairments and at touch/pen.

```text
min target:   token --control-min (default 24x24)
exception:    icon-only buttons use 24px hit area even if glyph is 16px
```

The hit area is the clickable region, not the glyph. An icon button pads its hit area to the minimum even when the icon is small ([[Icons-Part04]]).

# AI Notes

Do not hardcode px that clips at zoom. Use tokens + flexible layout. Fixed px assumes 100% zoom and breaks at 200%.

Do not rely on shadow for boundaries. Forced-colors strips shadow; a shadow-only border vanishes. Use token borders.

Do not let icon buttons have sub-minimum hit areas. Pad to `--control-min`. A 16px glyph in a 16px button is unclickable for many users.

Do not convey state by color alone under any mode. Forced-colors and low-vision both need a non-color signal ([[Accessibility-Part06]]). Motion is also not a signal under reduced motion.

# Related Documents

- [[07-ui-ux/README]]
- [[Accessibility-Part01]]
- [[Accessibility-Part02]]
- [[Accessibility-Part03]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
- [[Accessibility-Diagrams]]
- [[WorkspaceLayout-Part01]]
- [[Animations-Part03]]
- [[DesignTokens-Part05]]
- [[Icons-Part04]]
- [[Accessibility-Part06]]
