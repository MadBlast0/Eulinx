---
title: FrontendAPI Specification - Part 01
status: draft
version: 1.0
tags:
  - api
  - frontend-api
  - typescript
related:
  - "[[15-api/README]]"
  - "[[FrontendAPI-Part02]]"
  - "[[FrontendAPI-Part03]]"
  - "[[IPC-Part01]]"
  - "[[07-ui-ux/README]]"
---

# FrontendAPI Specification (Part 01)

## Document Index

Part 01 - The TypeScript client surface, service modules, and the no-direct-Tauri rule
Part 02 - The runtime store mirror, the three state tiers, and the store slices
Part 03 - Command-call ergonomics, the `ApiError` type, and retry rules
Part 04 - The event subscription manager and idempotent handlers
Part 05 - Frontend API rules: no direct Tauri, idempotency, view state, degraded runtime

# Purpose

FrontendAPI is the TypeScript surface the React UI programs against. It is the single layer that wraps the two Tauri channels so no component ever touches `invoke` or `listen` directly. It exists for one reason stated plainly in [[07-ui-ux/README]] and [[IPC-Part01]]: the UI must reach the Runtime only through commands and events, and it must do so consistently, with one error model, one subscription lifecycle, and one store mirror.

The FrontendAPI is organized as **service modules**, one per domain, each a plain TypeScript module that exposes typed functions and a typed subscription registration. A component imports `workerService.spawn(...)`, never `invoke("spawn_worker", ...)`. This indirection is what lets the cheap coding model produce consistent, correct call sites without re-deriving the channel rules every time.

# The No-Direct-Tauri Rule

No React component, hook, or store slice MAY import `@tauri-apps/api/core` (`invoke`) or `@tauri-apps/api/event` (`listen`) directly. All access goes through a FrontendAPI service module. This rule is mandatory because:

- It centralizes the error-envelope normalization ([[FrontendAPI-Part03]]).
- It centralizes listener registration and tear-down ([[FrontendAPI-Part04]]).
- It keeps the `workspaceId` scope correct on every call.
- It makes the channel direction rule impossible to violate at a call site.

The single exception is the internal transport adapter inside the FrontendAPI core, which is the only file permitted to call `invoke`/`listen`. Everything else calls the adapter through the service modules.

# Service Modules

Each domain maps to one service module. The module name mirrors the command/event domain grouping from [[IPC-Part02]] and [[Contracts-Part01]]:

- `workerService` — spawn, terminate, list, get, set refinement mode, resize terminal.
- `taskService` — create, assign, list, update status, get.
- `artifactService` — get, list, merge, request verification, get diff.
- `lockService` — request, release, query.
- `mergeService` — submit, query conflicts, resolve.
- `memoryService` — inject, query, summarize, list channels.
- `workflowService` — load graph, mutate nodes/edges, run, stop.
- `sessionService` — open, close, list, attach terminal.
- `settingService` — get, save, reset, list scopes.
- `providerService` — list, add, remove, test connection.
- `mcpService` — list servers, add, remove, enable, disable, health.
- `pluginService` — list, install, enable, disable, invoke capability.
- `windowService` — minimize, maximize, set theme, set title.
- `fsService` — read, write (scoped), list, watch (all gated by workspace root).

Each service module exposes:

- typed command functions returning `Promise<T>` (resolving to the contract result, rejecting with `ApiError`)
- a typed subscription function `on<EVENT>(handler)` that registers through the subscription manager
- pure helpers for building argument objects from store state

# The Transport Adapter

The transport adapter is the only file that calls `invoke` and `listen`. It:

- injects the active `workspaceId` from the layout/session store into every command unless explicitly told otherwise
- converts a Tauri rejection into a normalized `ApiError` ([[FrontendAPI-Part03]])
- routes `Eulinx://events` batches to the dispatcher that fans them out to registered handlers
- owns the `unlisten` registry keyed by workspace scope

All service modules call the adapter, never Tauri. This keeps the rest of the frontend free of IPC mechanics.

# AI Notes

Do not import `invoke` or `listen` inside a component. Use the matching `service` module. If the module lacks the call you need, add it to the module and to [[Contracts-Part01]], do not reach for Tauri.

Do not inline a `Eulinx://` event name in a component. Use `service.on<Event>(handler)`. The name lives in Contracts; the handler type lives in the service module.

Do not build a second error model. Every command rejection is an `ApiError` with a `code` from [[Contracts-Part05]]. Branch on `code`.

Do not call a service function from inside a render without a hook boundary. Commands run in effects or event handlers, never during render.

# Related Documents

- [[15-api/README]]
- [[FrontendAPI-Part02]]
- [[FrontendAPI-Part03]]
- [[FrontendAPI-Part04]]
- [[FrontendAPI-Part05]]
- [[IPC-Part01]]
- [[IPC-Part02]]
- [[07-ui-ux/README]]
- [[Contracts-Part01]]
