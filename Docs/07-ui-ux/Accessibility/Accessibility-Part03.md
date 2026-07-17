---
title: Accessibility Specification - Part 03
status: draft
version: 1.0
tags:
  - ui-ux
  - accessibility
  - focus
related:
  - "[[07-ui-ux/README]]"
  - "[[Accessibility-Part02]]"
  - "[[Accessibility-Part04]]"
  - "[[Accessibility-Diagrams]]"
  - "[[WorkspaceLayout-Part06]]"
  - "[[KeyboardShortcuts-Part01]]"
  - "[[KeyboardShortcuts-Part03]]"
---

# Accessibility Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the No-Dead-Ends Rule
Part 02 - Semantic Structure, Roles, and the ARIA Contract
Part 03 - Focus Management and the Focus Ring
Part 04 - Reduced Motion, Contrast, and Visual A11y
Part 05 - Color Contrast and the WCAG Contract
Part 06 - Screen Readers, Testing, and the Checklist
Diagrams - Accessibility-Diagrams.md

# Purpose of This Part

This part specifies focus management and the focus ring. Focus is the keyboard user's cursor; it must always be visible, always logical, and never trapped. This part complements the focus model in [[WorkspaceLayout-Part06]] and the global cycle in [[KeyboardShortcuts-Part01]] with the visual and behavioral contract for focus.

# The Focus Ring Contract

The ring is a token-driven outline shown only on keyboard focus (`:focus-visible`), never on mouse focus. This is the "quiet by default" rule from [[WorkspaceLayout-Part06]] applied visually.

```css
:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
*:focus:not(:focus-visible) { outline: none; }
```

```text
ring color:   var(--color-focus-ring) (high-vis, meets 3:1 on all surfaces)
ring width:   2px, offset 2px (token --focus-ring-width/-offset)
mouse focus:  no ring (focus-visible handles this)
keyboard:     ring always visible while navigating
```

The ring uses a color that contrasts on every surface (light/dark/panel), so it is never invisible. If a surface's background makes the accent hard to see, `--color-focus-ring` is a dedicated high-vis color, not the accent.

# Focus Order

Focus order follows the DOM/logical order, which matches the visual region order (sidebar -> canvas -> inspector -> panel). It is not spatial (top-left to bottom-right) because the app is a tool, not a document.

```text
tab cycle:   sidebar -> canvas -> inspector -> panel -> sidebar
rule:        focus order == logical region order, not pixel position
forbidden:   a control focusable but unreachable by Tab (dead end)
```

The roving-tabindex pattern (one stop per surface, arrows inside) keeps the cycle short ([[Accessibility-Part01]]). A surface with 50 tab stops makes the cycle painful.

# Focus Trapping and Modals

Modals trap focus within themselves until dismissed, then restore it to the trigger. This is the one allowed "trap."

```text
on open:    capture previous focus; move focus to first modal control
while open: Tab cycles only within modal
on close:   restore focus to previous element (KeyboardShortcuts-Part03)
```

Non-modal surfaces (panels, sidebar) must NOT trap focus. A panel that captures Tab and never releases it strands the keyboard user — the dead-end failure.

# Focus on Dynamic Content

When content appears (a panel tab opens, a node is selected), focus moves to it only if the user caused it; otherwise it is announced, not focused.

```text
user opens tab:     focus moves into the tab content
runtime adds node:  NOT focused (would yank keyboard); announced if relevant
user selects node:  ring shows (selection, Tier 1) but focus stays put
```

Yanking focus to dynamically appearing content is a top cause of disorientation. Focus moves only on user action or explicit navigation.

# Scroll Into View

When focus moves to an off-screen item (a tree row scrolled away, a card below the fold), it is scrolled into view.

```text
rule:        focus(el) also scrolls el into view (minimal, not centered)
avoid:      scrolling the whole window; scroll the nearest scroll container
```

Scroll-into-view must be the nearest container, not the window, so focusing a deep tree row does not jolt the entire app.

# AI Notes

Do not show the focus ring on mouse focus. Use `:focus-visible`. A ring on every click trains users to ignore it and looks noisy.

Do not make a surface many tab stops. Use roving tabindex. A panel with 50 stops makes the global cycle ([[KeyboardShortcuts-Part01]]) painful and breaks the "short cycle" rule.

Do not trap focus outside modals. Only modals trap. A panel/sidebar that captures Tab strands the keyboard user — the dead end Part 01 forbids.

Do not yank focus to dynamic content. Move focus only on user action. Auto-focusing a runtime-added node disorients keyboard users mid-task.

# Related Documents

- [[07-ui-ux/README]]
- [[Accessibility-Part01]]
- [[Accessibility-Part02]]
- [[Accessibility-Part04]]
- [[Accessibility-Part05]]
- [[Accessibility-Part06]]
- [[Accessibility-Diagrams]]
- [[WorkspaceLayout-Part06]]
- [[KeyboardShortcuts-Part01]]
- [[KeyboardShortcuts-Part03]]
- [[NodeGraph-Part07]]
- [[Panels-Part02]]
- [[DesignTokens-Part03]]
