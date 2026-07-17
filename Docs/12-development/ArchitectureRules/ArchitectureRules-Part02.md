---
title: ArchitectureRules Specification - Part 02
status: draft
version: 1.0
tags:
  - development
  - architecture-rules
related:
  - "[[12-development/README]]"
  - "[[ArchitectureRules-Part01]]"
  - "[[ArchitectureRules-Part03]]"
---

# ArchitectureRules Specification (Part 02)

## Document Index

Part 01 - Layer Boundaries & The Invoke Rule
Part 02 - No Merged Layers & Feature Isolation
Part 03 - Global Design-System-First Mandate

# Purpose

This part forbids merging layers and defines feature isolation. Merged layers are the most common failure mode when a cheap model is asked to "just build the feature" — it collapses UI, logic, and backend into one file.

# No Merged Layers (MUST)

A single file MUST NOT simultaneously be a UI component, a service, and a Rust-adjacent bridge. Each concern has its own folder and its own file kind:

- `.tsx` components in `components/` or `features/*/components/`.
- service modules in `services/` ending with `.service.ts`.
- store modules in `stores/` or `features/*/store/`.
- Rust commands in `src-tauri/src/commands/`.

# Feature Isolation (MUST)

Each feature folder is self-contained. A feature MUST NOT import another feature's `components/` or `store/` for business logic. Shared behavior is promoted upward to `components/`, `hooks/`, `services/`, or `stores/`.

# No Circular Dependencies (MUST)

Circular imports between features or between layers are forbidden. The dependency graph MUST be acyclic. If two features need each other, the shared piece MUST move to a common lower-level module.

# State Layer Separation

Project-scoped client state lives in Zustand (`stores/`). Async/server-shaped data (queries, mutations, streaming) lives in TanStack Query. These two MUST NOT be conflated: do not store server cache in Zustand, and do not store local UI state in TanStack Query.

# Related Documents

- [[ArchitectureRules-Part03]]
- [[FolderStructure-Part02]]
- [[NamingConvention-Part01]]
