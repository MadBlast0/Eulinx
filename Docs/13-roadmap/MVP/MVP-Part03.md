---
title: MVP Specification - Part 03
status: draft
version: 1.0
tags:
  - roadmap
  - mvp
  - build-order
related:
  - "[[MVP-Part01]]"
  - "[[MVP-Part02]]"
  - "[[Phase1-Part01]]"
---

# MVP Specification (Part 03)

## Document Index

Part 01 - Definition, Goals, and Core Loop
Part 02 - Scope, Included vs Excluded, and Acceptance
Part 03 - Build Order, Risks, and Completion Criteria

# Build Order (MVP)

The MVP reuses Implementation-Flow PHASE 00 (project init) and PHASE 01 (foundation) as setup, then builds the loop vertically.

1. Project initialization: Tauri v2 + React 19 + Vite + pnpm + Tailwind + shadcn/ui + Zustand + TanStack Query + React Flow + xterm.js. See [[12-development/README]].
2. Foundation types: Workspace, Worker, Task, Artifact, RunState enums, error system, UUID, logger, config.
3. Thin Rust layer: PTY spawn, filesystem read/write, window management, secure store for the provider key.
4. TypeScript services layer over Tauri `invoke` (UI never calls `invoke` directly).
5. Workspace open: pick folder, create SQLite store, scope all operations to that folder.
6. Worker Terminal: spawn PTY, stream I/O to xterm.js, expose start/stop.
7. Single provider streaming: BYOK key from secure store, stream responses into the worker terminal.
8. Artifact capture: worker writes a file/patch; runtime records it as an Artifact node.
9. Verifier: run an objective check on the artifact; emit pass/fail event.
10. Merge Manager + Lock Manager: apply verified artifact under file/symbol lock; prevent concurrent edits.
11. Canvas: render Worker and Artifact nodes on React Flow with status colors and minimize/maximize.
12. Persist everything to SQLite; restore on launch.

# Mapping to Implementation-Flow

PHASE 00 → MVP step 1.
PHASE 01 → MVP step 2.
PHASE 02 (Runtime Kernel) → thin runtime manager for MVP step 4-6.
PHASE 03 (Event Bus) → minimal events for verifier/merge (full bus is Phase 1).
PHASE 04 (State) → SQLite persistence in MVP step 12.

# Risks

Cheap-model drift: keep each step under one focused prompt; verify after each.

PTY streaming bugs: isolate terminal I/O behind the Rust bridge; do not let TypeScript touch OS processes directly.

Merge corruption: the Lock Manager is non-negotiable even in MVP; test concurrent edits explicitly.

Scope creep: resist adding orchestration or memory early.

# Completion Criteria (MVP "Done")

All Acceptance Criteria from Part 02 pass on a clean machine.

A short recorded session shows: open folder → spawn worker → task → artifact → verify → merge → workspace changed → canvas updated → relaunch restores state.

The code is lint-clean and type-checked; foundation tests pass.

The MVP is demoable to a non-technical observer who can describe what the workers did.

# Handoff to Phase 1

When MVP is complete, the deterministic runtime kernel from Phase 1 replaces the minimal runtime manager used here. The MVP's Worker, Artifact, Verifier, Merge, and Lock concepts are preserved and extended.

# Related Documents

- [[Phase1-Part01]]
- [[MVP-Part01]]
- [[02-runtime/README]]
- [[12-development/README]]
