---
title: Accessibility Specification - Part 06
status: draft
version: 1.0
tags:
  - ui-ux
  - accessibility
  - screen-readers
related:
  - "[[07-ui-ux/README]]"
  - "[[Accessibility-Part05]]"
  - "[[Accessibility-Diagrams]]"
  - "[[KeyboardShortcuts-Part01]]"
  - "[[NodeGraph-Part07]]"
  - "[[Animations-Part03]]"
---

# Accessibility Specification ( Part 06 )

## Document Index

Part 01 - Purpose, Philosophy, the No-Dead-Ends Rule
Part 02 - Semantic Structure, Roles, and the ARIA Contract
Part 03 - Focus Management and the Focus Ring
Part 04 - Reduced Motion, Contrast, and Visual A11y
Part 05 - Color Contrast and the WCAG Contract
Part 06 - Screen Readers, Testing, and the Checklist
Diagrams - Accessibility-Diagrams.md

# Purpose of This Part

This part specifies screen-reader support, the "no color-alone" rule, the testing strategy, and the master accessibility checklist. It closes the accessibility spec by tying the previous parts to verifiable behavior: a screen-reader user can perceive and operate every surface, and no information is carried by a single modality.

# The No-Color-Alone Rule

Information must never be conveyed by color alone. This covers status, selection, and errors.

```text
status:      color + icon/label/shape (running dot + "running" text)
selection:   ring/background + (for graph) a labeled state
error:       red + icon + text message (never red text only)
focus:       ring + (optional) label; ring is high-vis, not just color
```

```text
rule:        if you removed all color, could the user still tell
             running vs error, selected vs not, error vs ok?
if no:       add a shape/icon/text signal
```

This is the rule that makes [[DesignTokens-Part03]] status colors safe: they are always paired. A red error border with no text fails; a red border + error icon + "Failed: exit 1" passes.

# Screen Reader Support

The app must be operable with a screen reader (NVDA/VoiceOver). The contract:

```text
- All regions are landmarks (Accessibility-Part02)
- All controls named (Accessibility-Part02)
- Focus visible & logical (Accessibility-Part03)
- Live regions announce meaningful state (debounced) (Accessibility-Part02)
- Graph selection announced via an accessible representation
- Terminal content reviewable via last-line snapshot (TerminalView-Part06)
```

The graph is the hard case: xterm and the canvas are opaque. The strategy is a parallel accessible representation ([[NodeGraph-Part07]] mentions status; here we require an accessible tree of nodes/edges for SR), plus announcements on selection change. Full scrollback SR navigation is v1-limited (TerminalView-Part06).

# Testing Strategy

Accessibility is verified, not assumed:

```text
1. Automated:  axe/lint in CI for roles, names, contrast tokens.
2. Keyboard:   full task via keyboard only (no mouse) - no dead ends.
3. SR pass:    NVDA + VoiceOver smoke test of each surface.
4. Zoom:       200% zoom + OS text scale - layout usable.
5. Reduced:    prefers-reduced-motion - no loops, status by color.
6. Contrast:   theme pairs validated (Accessibility-Part05).
```

```text
gate:    a "dead end" found in the keyboard pass blocks merge.
gate:    a contrast failure in a shipped theme blocks merge.
```

The keyboard pass is the cheapest, highest-value check: if a task cannot be done without a mouse, the "no dead ends" rule (Part 01) is violated regardless of ARIA correctness.

# The Master Checklist

```text
[ ] Exactly one main/banner/contentinfo landmark per window.
[ ] Every control has an accessible name.
[ ] Roving tabindex; short global focus cycle.
[ ] Focus ring on :focus-visible; high-vis; never on mouse.
[ ] No focus trap outside modals; modals restore focus.
[ ] Reduced motion stops loops; status by color/shape survives.
[ ] Layout usable at 200% zoom + OS text scale.
[ ] Min control hit area (--control-min) respected.
[ ] AA contrast on default themes; custom themes validated.
[ ] No info by color alone (shape/icon/text paired).
[ ] Live regions debounced; no per-frame announcements.
[ ] Graph/terminal have accessible representations.
[ ] Full keyboard task possible (no dead ends).
```

# Known Limitations (v1)

```text
- Full screen-reader navigation of terminal scrollback is limited
  to last-line snapshot + status (TerminalView-Part06).
- Graph SR is an accessible node/edge tree + selection announce,
  not full spatial description.
- Automated tests cover structure/contrast; manual SR pass is
  required for nuanced flows.
```

# AI Notes

Do not convey info by color alone. Pair with shape/text. A red error with no text fails color-blind users and the WCAG "use of color" criterion.

Do not skip the keyboard pass. ARIA can be perfect while a task is impossible without a mouse — that still violates "no dead ends" (Part 01). Keyboard-test before merging.

Do not announce every frame to SR. Debounce live regions. A live region firing per graph tick is unreadable.

Do not make the graph/terminal SR-opaque without a parallel representation. Provide an accessible tree/snapshot so SR users can perceive selection and status.

# Related Documents

- [[07-ui-ux/README]]
- [[Accessibility-Part01]]
- [[Accessibility-Part02]]
- [[Accessibility-Part03]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
- [[Accessibility-Diagrams]]
- [[DesignTokens-Part03]]
- [[NodeGraph-Part07]]
- [[TerminalView-Part06]]
- [[KeyboardShortcuts-Part01]]
- [[Animations-Part03]]
- [[Icons-Part03]]
