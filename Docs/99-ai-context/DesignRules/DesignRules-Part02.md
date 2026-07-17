---
title: DesignRules - Part 02
status: draft
version: 1.0
tags:
  - ai-context
  - design-rules
  - ui-ux
  - accessibility
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/DesignRules/DesignRules-Part01]]"
  - "[[07-ui-ux/README]]"
---

# DesignRules (Part 02) — Layout, Motion, Accessibility

## Document Index

Part 01 - Design tokens, theming, global components
Part 02 - Layout, motion, accessibility, icon/font systems

## Rule D5 — Three-pane, resizable layout

Default layout: left nav (Graph, Terminals, Files, Git, Plugins, Settings), center canvas (node graph), right context (file tree, session/agent history, git, browser later). Panels are resizable. Workspace-first, not tab-only.

## Rule D6 — Animation as information

Animated data-flow packets, status glows, and minimize/maximize transitions explain what the system is doing (observability). Motion only for feedback. Respect reduced-motion preferences.

## Rule D7 — Accessibility is baseline

Focus management, ARIA (Radix primitives), reduced-motion support, keyboard navigation, and high-contrast awareness are required, not optional. Overlays MUST trap focus and handle escape.

## Rule D8 — Responsive and viewport-aware

Overlay components (modal, popover, tooltip, dropdown, drawer, sidebar) MUST do viewport/collision detection and adapt (e.g., desktop popover → mobile bottom sheet). Virtualize long lists; lazy-load heavy panels and routes with React Suspense.

## AI Notes

Do not animate for decoration. Animate to explain state.

Do not ship an overlay without focus trap, escape, and scroll lock.

Do not render a thousand-row list without virtualization.

## Related Documents

- [[99-ai-context/DesignRules/DesignRules-Part01]]
- [[07-ui-ux/README]]
- [[99-ai-context/CodingRules/CodingRules-Part03]]
