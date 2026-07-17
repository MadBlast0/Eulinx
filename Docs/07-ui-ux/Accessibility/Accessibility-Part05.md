---
title: Accessibility Specification - Part 05
status: draft
version: 1.0
tags:
  - ui-ux
  - accessibility
  - contrast
related:
  - "[[07-ui-ux/README]]"
  - "[[Accessibility-Part04]]"
  - "[[Accessibility-Part06]]"
  - "[[Accessibility-Diagrams]]"
  - "[[DesignTokens-Part03]]"
  - "[[Themes-Part02]]"
  - "[[Themes-Part04]]"
---

# Accessibility Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the No-Dead-Ends Rule
Part 02 - Semantic Structure, Roles, and the ARIA Contract
Part 03 - Focus Management and the Focus Ring
Part 04 - Reduced Motion, Contrast, and Visual A11y
Part 05 - Color Contrast and the WCAG Contract
Part 06 - Screen Readers, Testing, and the Checklist
Diagrams - Accessibility-Diagrams.md

# Purpose of This Part

This part specifies the color-contrast contract. Eulinx targets WCAG 2.1 AA as the shipped baseline. Contrast is enforced through the color tokens ([[DesignTokens-Part03]]) and validated when themes are built ([[Themes-Part02]], [[Themes-Part04]]). This part gives the exact thresholds and the pairs that must satisfy them.

# The Contrast Thresholds

```text
Body text (>= 18px normal or >= 14px bold):   4.5:1
Large text (>= 24px, or >= 18.66px bold):     3:1
UI components / graphical objects:            3:1 (non-text)
Focus indicator:                              3:1 against adjacent colors
```

```text
text vs bg:        fg-default >= 4.5:1 on bg-surface/canvas
muted text:        fg-muted   >= 4.5:1 (still readable text)
subtle/disabled:   fg-subtle  >= 3:1 (non-essential info only)
```

The default light and dark themes ([[Themes-Part02]]) meet these. A custom theme that fails is warned/rejected ([[Themes-Part04]]).

# Pairs That Must Pass

```text
--color-fg-default vs --color-bg-canvas        >= 4.5:1
--color-fg-default vs --color-bg-surface       >= 4.5:1
--color-fg-muted   vs --color-bg-surface       >= 4.5:1
--color-accent-fg  vs --color-accent           >= 4.5:1
--color-status-*   vs --color-bg-surface       >= 3:1 (non-text, +shape)
--color-focus-ring vs adjacent surface         >= 3:1
--color-terminal-fg vs --color-terminal-bg     >= 4.5:1
```

Status colors are non-text graphics, so 3:1 applies — but they are always paired with a shape/label ([[Accessibility-Part06]]) so they are not the sole signal even at 3:1.

# Terminal Contrast

The terminal is text-dense, so its contrast matters most. The 16-color ramp ([[DesignTokens-Part03]]) is chosen so standard output is readable; bright variants must also meet 3:1 against the terminal bg where used as text.

```text
terminal fg vs bg:        4.5:1
bright colors as text:    >= 3:1 vs terminal bg (used for emphasis)
```

A terminal theme with low-contrast green prompts is unreadable for many users; the ramp is validated against the bg.

# Don't Use Contrast for Emphasis Only

Low-contrast text (e.g. grey on grey) for "secondary" info still must meet 3:1 minimum. "Secondary" does not mean "illegible." If info is worth showing, it is worth 3:1.

```text
rule:        no text below 3:1 ever; body text never below 4.5:1
exception:   disabled controls may drop to 3:1 (non-essential)
```

# Validation in Build

Contrast is checked automatically:

```text
- Theme build validates all required pairs (Themes-Part02).
- Custom theme upload validates pairs (Themes-Part04).
- CI lint flags hardcoded colors that bypass tokens (DesignTokens-Part06).
```

Because components only read tokens (never raw hex), the only place contrast can fail is in a theme's token values — which are validated. This containment is what makes AA achievable with a cheap coding model ([[07-ui-ux/README]]).

# AI Notes

Do not let custom themes ship sub-AA. Validate pairs on build/upload. A custom theme with 3:1 body text is a compliance failure.

Do not use raw hex in components. Read tokens. Raw hex bypasses contrast validation and can fail AA silently.

Do not treat "secondary" text as exempt. It still needs 3:1. Grey-on-grey "muted" labels that fail 3:1 are illegible, not subtle.

Do not rely on status color at 3:1 alone. Pair with shape/label ([[Accessibility-Part06]]). Even at compliant contrast, color-only signals fail color-blind users.

# Related Documents

- [[07-ui-ux/README]]
- [[Accessibility-Part01]]
- [[Accessibility-Part02]]
- [[Accessibility-Part03]]
- [[Accessibility-Part04]]
- [[Accessibility-Part06]]
- [[Accessibility-Diagrams]]
- [[DesignTokens-Part03]]
- [[DesignTokens-Part06]]
- [[Themes-Part02]]
- [[Themes-Part04]]
- [[TerminalView-Part04]]
