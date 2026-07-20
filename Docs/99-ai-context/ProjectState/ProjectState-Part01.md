---
title: ProjectState - Part 01
status: final
version: 2.0
tags:
  - ai-context
  - project-state
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/CurrentProgress/CurrentProgress-Part01]]"
  - "[[13-roadmap/README]]"
---

# ProjectState (Part 01) — Current Build State

## Document Index

Part 01 — Summary of the current build state

This note describes what Eulinx is, what is implemented, and what remains to be built.

## Architecture

Eulinx is a **local-first AI operating system for knowledge work**, implemented as:

- **TypeScript runtime engine** — the core kernel (scheduler, event bus, service registry, context manager, merge manager, lock manager) runs in-process in TypeScript
- **Rust thin backend** (Tauri v2) — native capabilities: SQLite persistence (rusqlite), PTY/terminal, filesystem access, Git operations, window management, dialogs
- **React 19 + Flow UI** — workspace layout, node-graph canvas, panels, terminal, themes, accessible keyboard model
- **Plugin system** — hook lifecycle, MCP client, registered tool plugins, in-process proxy host
- **AI / Orchestrator system** — planner, critic, judge, builder, refinement loop with multi-provider support (OpenAI, Anthropic, local, etc.)

## What Is Implemented

The following major systems are **built and tested**:

- **Runtime kernel** — RuntimeManager, Scheduler (with queues, budgets, concurrency, retries, dead-queue), ServiceRegistry, EventBus (with replay, DLQ, priorities, middleware), LockManager, MergeManager, ContextManager
- **Worker system** — spawn/creation, 13-state lifecycle machine, termination/cleanup, hierarchy (tree, depth limits, cascade, orphan detection), communication (9 message kinds, backpressure, mediated routing), health monitoring
- **Artifact system** — 15-kind artifact registry, lifecycle state machine, relationships (with cycle detection), versioning (line diff), verification (deterministic-vs-AI, authorship exclusion), 7-stage merge flow, storage (localStorage), export/import
- **Workflow engine** — DAG execution (tick loop, topological sort, pause/resume/cancel/retry/recover), 7-state node machine, edge types with guards and transforms
- **Memory** — STM (TTL, eviction, working slots), LTM (promotion/review/forget), episodic/semantic stores, vector memory with hybrid search (cosine similarity + keyword), knowledge base with ingestion API, memory policies (redaction, scope, retention)
- **AI / Orchestrators** — planner (produces plan tree), critic (LLM-based critique), judge (loop termination), builder, architect, refinement loop (budgets, caps, stuck detection), multi-provider model profiles with fallback chains
- **API layer** — FrontendAPI service modules (typed seam over Tauri IPC), EventBus with Eulinx:// URI scheme, RustAPI native bridge (12 real commands: PTY, FS, Git, dialog)
- **Database** — Rust SQLite with rusqlite (27 entity tables, migration gate via PRAGMA user_version, append-only event_log, WAL mode, foreign keys), TypeScript repositories routing through Tauri commands
- **Plugin system** — hook system (observe/participate, timeouts, veto, re-entrancy guard), plugin lifecycle (manifest, registry, state machine, circuit breaker), MCP client, tool plugin registration
- **Built-in tools** — filesystem (read/write/list), Git (status/stage/commit/push), terminal (PTY via Rust), HTTP client, browser automation, database queries
- **UI** — workspace layout (persistent dividers, sidebar, panels), node-graph canvas (ReactFlow, custom nodes/edges/minimap), terminal view (xterm.js, Fit/Search/PTY bind), 10 panels, 3 themes + OS-follow, design tokens, typography, icons (Lucide), animations (reduced-motion contract), accessibility (live regions, focus ring, keyboard chord model, discovery overlay)
- **Testing** — 128 Vitest test files (~1,597 cases, passing), Rust cargo tests (db_manager unit tests), E2E scaffold

## ADR Reconciliation

Architecture Decision Records ADR-004 (SQLite/SQLx), ADR-005 (LanceDB), ADR-021 (Tantivy), ADR-025 (no direct invoke), and ADR-029 (feature-based folders) have been reconciled to match the actual implementation. See the individual ADR files in `Docs/14-architecture-decisions/` for details.

## What Is NOT Yet Built

The following systems are **deferred to future phases**:

- **Distributed execution** — multi-machine worker pools, shared state, network fabric
- **Remote marketplace** — plugin registry, signing, provenance, updates (local marketplace UI exists)
- **Advanced vector database** — LanceDB or equivalent (current in-memory approach is sufficient at local scale)
- **Full-text search engine** — Tantivy or equivalent (current in-memory substring index is sufficient)
- **Collaboration** — sync, presence, roles, conflict resolution (by design, later-phase)

## Consequence for AI

Nearly all core systems are implemented with tests. When adding new features, prefer extending existing patterns in the appropriate domain folder. Follow the conventions in [[99-ai-context/README_FOR_AI]] and the existing code style. The Rust layer is thin — business logic lives in TypeScript.

## Related Documents

- [[99-ai-context/CurrentProgress/CurrentProgress-Part01]]
- [[99-ai-context/ImplementationGapAudit]]
- [[13-roadmap/README]]
