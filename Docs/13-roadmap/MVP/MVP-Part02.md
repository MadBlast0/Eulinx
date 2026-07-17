---
title: MVP Specification - Part 02
status: draft
version: 1.0
tags:
  - roadmap
  - mvp
  - scope
related:
  - "[[MVP-Part01]]"
  - "[[MVP-Part03]]"
---

# MVP Specification (Part 02)

## Document Index

Part 01 - Definition, Goals, and Core Loop
Part 02 - Scope, Included vs Excluded, and Acceptance
Part 03 - Build Order, Risks, and Completion Criteria

# In Scope (MUST ship in MVP)

A Tauri v2 desktop shell with a React 19 + TypeScript frontend, built by Vite, bundled with pnpm. See [[12-development/README]].

A single Workspace openable from a local folder, isolated to that folder.

A Worker Terminal backed by a Rust PTY, runnable headless until maximized (per [[03-worker-system/README]]).

One model provider connection (BYOK) with streaming responses.

A Worker node on a React Flow canvas, minimizable to a chip and maximizable to a full terminal.

An Artifact emitted by a worker, stored and visualized as a node.

A minimal Verifier that runs an objective check (build/lint/test or a dry-run) on an artifact.

A minimal Merge Manager that applies a verified artifact/patch to the workspace.

A minimal Lock Manager that prevents two workers editing the same file region concurrently.

SQLite persistence for workspace, worker, task, and artifact records.

A basic left/center/right three-pane layout (nav, canvas, context) per [[07-ui-ux/README]].

# Out of Scope (MUST NOT ship in MVP)

No orchestrator hierarchy (root/phase/task orchestrators). One worker at a time is acceptable.

No refinement loop (critic/refine/judge passes). See [[10-ai-system/README]] for later.

No memory system beyond what SQLite persists for state. Full memory is Phase 2. See [[04-memory/README]].

No multi-provider routing, no model profiles.

No workflow engine, templates, triggers, or logic gates. That is Phase 4. See [[06-workflow-engine/README]].

No MCP, no plugin system, no marketplace.

No tool registry beyond the terminal and filesystem access the worker already has.

No cost analytics dashboard, no sync, no accounts.

No collaboration or multi-workspace support.

# Acceptance Criteria

The app builds and launches on Windows, macOS, and Linux.

A user can open a folder, spawn one worker, give it a task, and watch it produce an artifact.

The verifier reports pass/fail and the merge manager applies only passing artifacts.

Two workers spawned on the same file are serialized by the Lock Manager (no corruption).

Closing and reopening the app restores the workspace, workers, and artifacts from SQLite.

The core loop from Part 01 is observable on the canvas with status colors and node states.

# Scope Guardrails

If a feature is not in "In Scope", it is deferred. Do not gold-plate the MVP.

The MVP exists to de-risk the architecture, not to impress. Wider UX polish belongs to Phase 4.

# Related Documents

- [[MVP-Part03]]
- [[MVP-Part01]]
- [[04-memory/README]]
- [[06-workflow-engine/README]]
