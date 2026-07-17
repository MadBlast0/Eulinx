---
title: FrontendAPI Specification - Part 02
status: draft
version: 1.0
tags:
  - api
  - frontend-api
  - store
  - state
related:
  - "[[15-api/README]]"
  - "[[FrontendAPI-Part01]]"
  - "[[FrontendAPI-Part03]]"
  - "[[07-ui-ux/README]]"
  - "[[IPC-Part03]]"
---

# FrontendAPI Specification (Part 02)

## Document Index

Part 01 - The TypeScript client surface, service modules, and the no-direct-Tauri rule
Part 02 - The runtime store mirror, the three state tiers, and the store slices
Part 03 - Command-call ergonomics, the `ApiError` type, and retry rules
Part 04 - The event subscription manager and idempotent handlers
Part 05 - Frontend API rules: no direct Tauri, idempotency, view state, degraded runtime

# Purpose

This part defines how the FrontendAPI holds state. Eulinx's frontend is a long-lived projection of a running system, not a website that refetches pages. State ownership is therefore split into three tiers, and placing state in the wrong tier is the most common frontend bug in this project ([[07-ui-ux/README]] states this in the State Ownership Model). The FrontendAPI owns the Tier 1 mirror and the subscription wiring that keeps it correct.

# The Three State Tiers

**Tier 1 — Runtime Mirror.** Backend-owned truth: Workers, Sessions, Executions, Artifacts, Workflow graphs, Permissions, Locks, process states. It lives in Zustand runtime-store slices. It is written ONLY by EventBus event handlers and by `invoke` results. A component or click handler MUST NEVER write it. On conflict, the backend wins, always.

**Tier 2 — View State.** Frontend-owned, persisted state: pane sizes, collapsed regions, active tab, zoom, pan offset, manually placed node positions, theme choice, panel arrangement. It lives in Zustand layout-store slices and is persisted to SQLite via `settingService.save` per workspace, debounced. The backend stores these bytes but never interprets them.

**Tier 3 — Ephemeral State.** Component-owned, mortal state: hover, drag-in-progress, text selection, an open menu, an unsubmitted input, a transient tooltip. It lives in `useState`/`useRef` inside the component and persists to nothing.

The FrontendAPI operates almost entirely on Tier 1. Tier 2 is read at startup and written on user interaction through `settingService`. Tier 3 is the component's own concern and is none of the API's business.

# Runtime Store Slices

The runtime mirror is partitioned into slices, one per domain, so a Worker update does not re-render the whole tree:

- `workerSlice` — Worker summaries, per-worker state, refinement mode, terminal buffers (transient).
- `taskSlice` — Task objects and their status.
- `artifactSlice` — Artifact metadata and verification status (bodies fetched on demand).
- `lockSlice` — current lock ownership map.
- `mergeSlice` — pending merges and conflict sets.
- `memorySlice` — channel list and injected summaries (not full transcripts).
- `workflowSlice` — the node graph and edge set for the active workspace.
- `sessionSlice` — open sessions and terminal attachment.
- `runtimeSlice` — Runtime health, service health, degraded/failed state.

Each slice exposes pure reducer actions such as `applyWorkerStateChanged(payload)`, `applyArtifactMerged(payload)`. These actions are the ONLY writers of Tier 1. They are idempotent (see [[FrontendAPI-Part04]] and [[IPC-Part03]]).

# The Reducer Contract

A reducer action takes a contract payload (from [[Contracts-Part02]]) and folds it into the slice. The rules:

- An action MUST be a pure function of `(state, payload)`; it MUST NOT call a service, dispatch a command, or read the clock for truth.
- An action MUST ignore a payload whose `workspaceId` differs from the active workspace.
- An action MUST be a no-op if the same `sequence` was already applied (idempotency).
- An action MUST NOT mutate a payload object; it clones what it needs.

# Startup and Hydration

On workspace open, the FrontendAPI issues a small set of `invoke` reads (`list_workers`, `list_tasks`, `load_workflow`, `load_settings`) to hydrate Tier 1 and Tier 2 from the backend. After hydration, the event stream maintains the mirror; the UI does not refetch. If the Runtime restarts, a re-hydration is triggered by the `Eulinx://runtime/ready` event.

# AI Notes

Do not write Tier 1 state from a click handler. Call a command; the confirming event updates the store. Optimistic Worker state is a lie.

Do not put runtime state in `useState`. Two surfaces show the same Worker normally in Eulinx; component-local state desynchronizes them instantly.

Do not store Tier 3 state in the layout store. If it dies with the component, it was Tier 3; the layout store is Tier 2 and persisted.

Do not treat a missing field as "false". Render unknown as unknown; a spinner beats a guess ([[07-ui-ux/README]] Global Frontend Principles).

# Related Documents

- [[15-api/README]]
- [[FrontendAPI-Part01]]
- [[FrontendAPI-Part03]]
- [[FrontendAPI-Part04]]
- [[07-ui-ux/README]]
- [[IPC-Part03]]
- [[Contracts-Part02]]
