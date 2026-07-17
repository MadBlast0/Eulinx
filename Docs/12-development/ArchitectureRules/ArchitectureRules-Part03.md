---
title: ArchitectureRules Specification - Part 03
status: draft
version: 1.0
tags:
  - development
  - architecture-rules
related:
  - "[[12-development/README]]"
  - "[[ArchitectureRules-Part02]]"
  - "[[FolderStructure-Part04]]"
---

# ArchitectureRules Specification (Part 03)

## Document Index

Part 01 - Layer Boundaries & The Invoke Rule
Part 02 - No Merged Layers & Feature Isolation
Part 03 - Global Design-System-First Mandate

# Purpose

This part mandates the global design-system-first approach. It is an architecture rule, not a styling preference, because retrofitting tokens after features exist is reliably destructive.

# Global Design System First (MUST)

Before any feature component is written, the following MUST exist and be centralized:

- Design tokens: colors, typography, spacing scale, border radius, border width, shadows, opacity, animation duration, animation curves, breakpoints, container widths, z-index layers.
- Theme system: light and dark, runtime switching, no hardcoded values in components.
- Font system: one centralized font loader; fonts are never imported inside components.
- Icon system: one icon wrapper; the underlying library is replaceable without touching components.
- Layout primitives: container, stack, inline, grid, flex, spacer, divider, panel, resizable panel, sidebar layout, split layout, workspace layout.
- Overlay manager: dialogs, dropdowns, menus, tooltips, popovers, context menus, bottom sheets — with collision detection, auto-positioning, portal rendering, escape handling, focus trap, scroll lock.
- Providers: theme, modal, toast, notification, query, settings, keyboard shortcut, localization.
- Global services, global managers, global constants, global types, global hooks, global utilities.

# No Hardcoded Values (MUST)

Components MUST NOT hardcode colors, spacing, radii, font sizes, or shadows. They reference tokens. This rule is what makes theming, RTL, and accessibility tractable for the cheap model.

# Why This Is Architectural

When tokens are absent, every feature invents its own palette and spacing. The result is unthemeable, inconsistent, and impossible to change globally. Centralizing first is the single highest-leverage rule in the project.

# Related Documents

- [[FolderStructure-Part04]]
- [[ArchitectureRules-Part01]]
- [[AIInstructions-Part01]]
