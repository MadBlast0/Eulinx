---
title: ArchitectureSummary - Part 02
status: draft
version: 1.0
tags:
  - ai-context
  - architecture
  - frontend
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part01]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part03]]"
  - "[[07-ui-ux/README]]"
---

# ArchitectureSummary (Part 02) — Frontend Shape

## Document Index

Part 01 - The layered model and the separation of AI from runtime
Part 02 - Frontend (React/TS) shape
Part 03 - Backend (Rust thin bridge) shape
Part 04 - Runtime services and the EventBus
Part 05 - Workers, Workflows, Memory, Plugins

## Frontend principles

The frontend is a React 19 + TypeScript application rendered inside a Tauri v2 window. It talks to the backend over exactly two channels: `invoke` for commands and `listen` for EventBus events. It has no other way to learn anything.

- A **services layer** (TypeScript) is the only module allowed to call `invoke`. Components never call `invoke` directly.
- Project-scoped state lives in **Zustand** stores; async/server-shaped data is fetched and cached with **TanStack Query**.
- The UI MUST NOT contain business logic. It renders state, dispatches intents through services, and reflects EventBus events.
- Feature-based architecture: each feature owns its own `components/`, `hooks/`, `types/`, `services/`, `store/`, `utils/`. No circular dependencies.

## Key frontend subsystems

- **Node graph** (React Flow): agents, tool nodes, logic gates, artifact nodes; animated edges; minimize/maximize terminal nodes.
- **Terminals** (xterm.js): unlimited terminals, split panes, tabs, resize, themes, copy/paste, search, fit-to-container; sessions tracked in a Zustand store.
- **Panels and layout**: resizable panels, left nav, right context, calm dark IDE-like shell, motion only for feedback.
- **Global design system**: token-driven components wrapping shadcn/ui; one icon wrapper; one font system; global providers (theme, modal, toast, notification, query, settings, keyboard, localization).

## AI Notes

Do not call `invoke` from a component. Route through a service.

Do not put business logic in a component or hook. Push it to the services layer or a store.

Do not hardcode colors, spacing, or typography. Use design tokens. See [[99-ai-context/DesignRules/DesignRules-Part01]].

## Related Documents

- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part01]]
- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part03]]
- [[07-ui-ux/README]]
- [[12-development/README]]
