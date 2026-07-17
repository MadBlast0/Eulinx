---
title: FolderStructure Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - folder-structure
related:
  - "[[12-development/README]]"
  - "[[FolderStructure-Part01]]"
  - "[[FolderStructure-Part03]]"
---

# FolderStructure Specification (Part 02)

## Document Index

Part 01 - Monorepo Layout & Top-Level Structure
Part 02 - Frontend App Structure (src/)
Part 03 - Rust Backend & Shared Layout
Part 04 - Global Design System First & Staging Order

# Purpose

This part defines the `src/` frontend structure. The structure is feature-based: each feature owns its components, hooks, types, services, store, and utils. Cross-cutting infrastructure lives in dedicated root folders so it is never duplicated inside features.

# Frontend `src/` Layout

- `app/` — application shell, router configuration, root providers composition.
- `components/` — shared, generic UI primitives (the global design-system wrappers around shadcn/ui). These are NOT feature-specific.
- `features/` — one folder per feature domain (e.g. `graph`, `terminals`, `agents`, `workflows`, `memory`, `settings`, `git`). Each feature folder owns: `components/`, `hooks/`, `types/`, `services/`, `store/`, `utils/`.
- `layouts/` — workspace layout shells (three-pane shell, resizable panels, sidebars).
- `pages/` — route-level screens composed from features and layouts.
- `hooks/` — cross-feature reusable hooks (e.g. `useTheme`, `useModal`, `useDebounce`).
- `contexts/` — React context providers that are genuinely global.
- `providers/` — composed provider tree (Theme, Query, Toast, Modal, Settings, Shortcut, Localization).
- `services/` — the single TypeScript gateway to the backend; every Tauri `invoke` is wrapped here. Per-domain service modules (e.g. `agent.service.ts`, `terminal.service.ts`).
- `stores/` — Zustand stores for project-scoped client state (terminals, selection, UI).
- `utils/` — pure helper functions (date, string, debounce, clone, id).
- `constants/` — global constants (routes, defaults, shortcuts, sizes).
- `config/` — runtime configuration loaders and environment resolution.
- `types/` — global shared TypeScript types and domain interfaces.
- `styles/` — Tailwind entry, global CSS, base layer.
- `assets/` — images, fonts, static media.
- `icons/` — the global icon wrapper and curated icon set.
- `themes/` — theme definitions and token mappings (light/dark).
- `animations/` — shared motion variants and transition tokens.

# Feature Folder Rule

Every feature folder MUST be self-contained: it MUST NOT reach into another feature's `components/` or `store/` directly for business logic. Shared behavior is promoted to `components/`, `hooks/`, `services/`, or `stores/`. This prevents circular dependencies and gives the cheap model a clear "where does this go" answer.

# Related Documents

- [[FolderStructure-Part03]]
- [[ArchitectureRules-Part02]]
- [[NamingConvention-Part01]]
