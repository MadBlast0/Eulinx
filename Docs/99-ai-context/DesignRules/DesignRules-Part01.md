---
title: DesignRules - Part 01
status: draft
version: 1.0
tags:
  - ai-context
  - design-rules
  - ui-ux
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/DesignRules/DesignRules-Part02]]"
  - "[[07-ui-ux/README]]"
---

# DesignRules (Part 01) — Tokens and Theming

## Document Index

Part 01 - Design tokens, theming, global components
Part 02 - Layout, motion, accessibility, icon/font systems

These rules keep the UI consistent and cheap-to-build. They inherit from [[07-ui-ux/README]] and the global design-system decision in the chat history.

## Rule D1 — Token-driven, never hardcoded

All colors, typography, spacing, radii, shadows, opacity, z-index, animation duration/curve, breakpoints, container widths, and border widths come from centralized design tokens. There is NO hardcoded color, spacing, or typography anywhere in a component. Theming swaps token sets, not component code.

## Rule D2 — Light and dark at runtime

Support a Light theme and a Dark theme with runtime switching. The default shell is a calm, dark, IDE-like surface with one accent. Motion is used only for feedback, never decoration.

## Rule D3 — Wrap shadcn/ui, do not fork it

Use Tailwind + shadcn/ui as the base. Wrap every primitive in a Eulinx global component so internals can change without touching features. Wrap Lucide in one icon component; never import icons directly. Centralize fonts; never import a font inside a component.

## Rule D4 — Global components and providers

Provide global wrappers for Button, IconButton, Input, Textarea, Dropdown, ContextMenu, Popover, Tooltip, Modal, Dialog, Drawer, Tabs, Accordion, Table, Card, Badge, Avatar, Alert, Banner, Toast, Notification Center, Progress, Spinner, Skeleton, Code Block, JSON Viewer, Tree View, File Explorer. One overlay manager handles dialogs, dropdowns, menus, tooltips, popovers, context menus, and bottom sheets with collision detection, auto-positioning, portals, escape handling, focus trap, and scroll lock.

## AI Notes

Do not hardcode a hex color. Use a token.

Do not import a shadcn primitive directly in a feature; use the Eulinx wrapper.

Do not add a new theme value without adding it to the token system.

## Related Documents

- [[99-ai-context/DesignRules/DesignRules-Part02]]
- [[07-ui-ux/README]]
- [[99-ai-context/CodingRules/CodingRules-Part02]]
