---
title: SQLiteSchema Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - sqlite-schema
  - workflow
  - run-state
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[WorkflowEngine-Part01]]"
---

# SQLiteSchema Specification (Part 03)

## Document Index

Part 01 - Purpose, Naming Conventions, the Identity & Workspace Tables, and the Table Map
Part 02 - The Worker, Session, Task, and Execution Tables
Part 03 - The Workflow, Node, Edge, and Run-State Tables
Part 04 - The Artifact, Prompt, Chat, and Message Tables
Part 05 - The Memory, Settings, Log, and Plugin Tables
Part 06 - Indexes, Foreign Keys, CHECK Constraints, Invariant Triggers, Sizing

# The Workflow Tables

A Workflow is a saved, directed graph of Nodes and Edges. The canonical graph lives here in SQLite, mirrored in-memory by the engine; the React Flow canvas is a subscriber, not the source.

## `workflow`

Fields: `id` ULID, `workspace_id` FK, `project_id` FK nullable, `name`, `description`, `status` (`draft` | `active` | `archived`), `graph_version` INTEGER (bumped on structural change), `created_at`, `updated_at`, `deleted_at`.

## `node`

Fields: `id` ULID, `workflow_id` FK, `kind` (`worker` | `orchestrator` | `tool` | `builder` | `verifier` | `condition` | `loop` | `merge` | `artifact` | `memory` | `mcp` | `input` | `output` | `delay` | `human_approval` | `plugin`), `label`, `config` JSON (the node's resolved configuration; sensitive fields encrypted per [[Encryption-Part01]]), `position_x` REAL, `position_y` REAL (presentation only; never affects execution order), `created_at`, `updated_at`.

## `edge`

Fields: `id` ULID, `workflow_id` FK, `source_node_id` FK, `target_node_id` FK, `kind` (`control` | `data` | `artifact` | `dependency` | `communication`), `label` nullable, `created_at`. A `CHECK` enforces the kind set. Edge kind, not node position, determines ordering and data movement.

# The Run-State Tables

These tables implement [[RunStatePersistence-Part01]]. They are current-state tables for the live run, separate from the immutable `event_log` of [[HistoryTables-Part01]].

## `run`

A run is one execution of a workflow graph from entry to terminal state. Fields: `id` ULID, `workspace_id` FK, `workflow_id` FK, `status` (`created` | `running` | `paused` | `completed` | `failed` | `cancelled`), `current_tick` INTEGER (the engine tick counter), `engine_version` TEXT (the algorithm version that produced the run, for replay fidelity), `run_context_ref` (reference to the persisted run-context blob), `started_at`, `finished_at` nullable, `created_at`, `updated_at`.

## `run_step`

One node's state within a run. There is one row per (run, node) for the latest state, plus the engine appends transitions to history. Fields: `id` ULID, `run_id` FK, `node_id` FK, `status` (`pending` | `ready` | `running` | `succeeded` | `failed` | `skipped` | `cancelled`), `attempt` INTEGER (retry count), `input_ref` nullable, `output_ref` nullable, `error_ref` nullable, `started_at` nullable, `finished_at` nullable, `updated_at`.

## `run_context`

The data carried along data edges between nodes. Stored as a separate table keyed by run so large payloads do not bloat the `run` row. Fields: `id` ULID, `run_id` FK unique, `payload` JSON (the typed port values; large values may reference an artifact instead), `created_at`, `updated_at`.

# Invariants

```text
A node's workflow_id equals its edge's workflow_id (enforced by trigger in Part 06).
An edge's source and target node belong to the same workflow.
A run's workflow_id is not null and the workflow is not hard-deleted.
run_step.status is constrained to its enumerated set.
run.current_tick is monotonic non-decreasing within a run.
run_context is 1:1 with run.
No run_state row is ever the source of truth over event_log for replay; it is the fast resume path.
```

# AI Notes

Do not store the graph only in React Flow state. The `workflow`, `node`, and `edge` tables are authoritative; the canvas is a view. The engine's in-memory mirror is rebuilt from these rows on open.

Do not put execution ordering in node position. `position_x` / `position_y` are presentation. Edges are truth, and edge `kind` decides whether data or control flows.

Do not treat `run`/`run_step` as history. They are the live resume state. The immutable replay spine is `event_log` in [[HistoryTables-Part01]]; these rows are overwritten as the run progresses and may be compacted after completion.

# Related Documents

- [[08-database/README]]
- [[SQLiteSchema-Part02]]
- [[SQLiteSchema-Part04]]
- [[SQLiteSchema-Diagrams]]
- [[RunStatePersistence-Part01]]
- [[WorkflowEngine-Part01]]
- [[NodeArchitecture-Part01]]
- [[EdgeTypes-Part01]]
- [[HistoryTables-Part01]]
