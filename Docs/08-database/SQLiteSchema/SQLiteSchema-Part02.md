---
title: SQLiteSchema Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - sqlite-schema
  - workers
  - sessions
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[HistoryTables-Part01]]"
---

# SQLiteSchema Specification (Part 02)

## Document Index

Part 01 - Purpose, Naming Conventions, the Identity & Workspace Tables, and the Table Map
Part 02 - The Worker, Session, Task, and Execution Tables
Part 03 - The Workflow, Node, Edge, and Run-State Tables
Part 04 - The Artifact, Prompt, Chat, and Message Tables
Part 05 - The Memory, Settings, Log, and Plugin Tables
Part 06 - Indexes, Foreign Keys, CHECK Constraints, Invariant Triggers, Sizing

# The Worker Tables

A Worker is the central object in Eulinx: a running AI terminal / process that performs work. The terminal is one view of a Worker; the database row is the Worker. The [[HistoryTables-Part01]] append-only families record transitions, but the current row answers "what is the Worker now".

## `worker`

Fields: `id` ULID, `workspace_id` FK, `project_id` FK nullable, `parent_worker_id` FK self-referential nullable (the worker that spawned it), `name`, `kind` (`orchestrator` | `builder` | `verifier` | `scout` | `generic`), `model_profile` (the resolved model identity string, not a mutable FK), `status` (`created` | `initializing` | `idle` | `planning` | `working` | `waiting` | `reviewing` | `testing` | `blocked` | `needs_human` | `completed` | `archived` | `destroyed`), `terminal_handle` (an opaque reference to the Rust PTY owning the process), `permission_set_id` FK nullable, `current_task_id` FK nullable, `spawned_worker_ids` (a JSON array of child worker ids, maintained for convenience; the self-FK is authoritative), `token_usage` INTEGER micro-units, `cost_micro_usd` INTEGER, `created_at`, `updated_at`, `deleted_at`.

A Worker's `status` column is `CHECK`-constrained to the enumerated set. The lifecycle is enforced by history transitions in [[HistoryTables-Part01]]; the current row is the projection.

## `worker_channel`

The "by the way" communication channels described in the product: global and partitioned message buses between workers. Fields: `id` ULID, `workspace_id` FK, `name`, `kind` (`global` | `partitioned`), `member_worker_ids` JSON array, `created_at`. Messages posted to a channel are stored in `message` with a `channel_id` and resolved summaries are injected per [[ContextInjection-Part01]].

# The Session Tables

A Session is an AI conversation session: the durable record of a chat between a user or worker and a model, independent of which terminal is currently rendering it.

## `session`

Fields: `id` ULID, `workspace_id` FK, `project_id` FK nullable, `owner_worker_id` FK nullable, `owner_user_id` FK nullable, `kind` (`user` | `worker` | `orchestrator`), `model_profile`, `title`, `created_at`, `updated_at`, `deleted_at`.

# The Task Tables

A Task is a first-class unit of delegated work, not a chat message. Tasks become the unit of assignment, progress, and audit.

## `task`

Fields: `id` ULID, `workspace_id` FK, `project_id` FK nullable, `owner_worker_id` FK nullable, `parent_task_id` FK self-referential nullable, `title`, `description`, `priority` (`low` | `medium` | `high` | `critical`), `status` (`backlog` | `queued` | `in_progress` | `blocked` | `completed` | `cancelled` | `failed`), `deadline` nullable RFC3339, `dependencies` JSON array of task ids, `assigned_worker_id` FK nullable, `artifact_ids` JSON array, `verification_status` (`pending` | `verified` | `failed` | `unverified`), `created_at`, `updated_at`, `deleted_at`.

# The Execution Tables

An Execution is one performance of a unit of work by the [[ExecutionEngine-Part01]], distinct from the run-step of a workflow. It is the audit-attached record of "this worker ran this thing and produced this result".

## `execution`

Fields: `id` ULID, `workspace_id` FK, `worker_id` FK, `task_id` FK nullable, `session_id` FK nullable, `kind` (`tool` | `model_call` | `command` | `mcp_tool`), `adapter` (which runtime adapter performed it), `status` (`started` | `succeeded` | `failed` | `cancelled`), `input_ref` (reference to a stored input snapshot, not the live profile), `output_ref` nullable, `error_ref` nullable, `started_at`, `finished_at` nullable, `token_usage` INTEGER, `cost_micro_usd` INTEGER, `created_at`. Money is integer micro-units; durations are derived from the two timestamps.

# Invariants

```text
A worker's parent_worker_id, if set, references an existing worker in the same workspace.
A task's dependencies reference existing tasks in the same workspace.
An execution's worker_id, task_id, session_id, if set, must all exist and agree on workspace.
session.owner_worker_id and task.owner_worker_id are nullable; a session may be user-owned.
No worker, session, task, or execution may exist without a workspace_id.
status and kind columns are constrained by CHECK to their enumerated values.
```

# AI Notes

Do not store the live model profile as a foreign key to a mutable `model_profile` row. Profiles get edited; history and replay need the resolved identity at execution time. Store the resolved string in `model_profile` and keep the input snapshot in `execution.input_ref`.

Do not merge Task into chat messages. A Task is assignable, dependable, and auditable; a message is a transcript line. They are different entities with different lifecycles.

Do not let a Worker spawn a child in another Workspace. The self-referential parent FK and the workspace scoping together enforce the isolation the product requires.

# Related Documents

- [[08-database/README]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part03]]
- [[SQLiteSchema-Diagrams]]
- [[HistoryTables-Part01]]
- [[ExecutionEngine-Part01]]
- [[ContextInjection-Part01]]
- [[WorkflowEngine-Part01]]
