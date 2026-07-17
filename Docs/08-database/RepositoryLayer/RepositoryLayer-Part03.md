---
title: RepositoryLayer Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - repository-layer
  - transactions
related:
  - "[[08-database/README]]"
  - "[[RepositoryLayer-Part01]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[HistoryTables-Part01]]"
---

# RepositoryLayer Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Pool, and the No-Raw-SQL Rule
Part 02 - The Read API Surface and the Query Shapes
Part 03 - The Write API Surface and Transaction Boundaries
Part 04 - Validation, the EventBus Projection, and the RepositoryRegistry
Part 05 - Error Model, Pagination, Checklist, and Worked Examples

# The Write API Surface

Writes are also grouped by entity. Each write method validates, scopes, optionally encrypts, opens a transaction, performs the state change plus its history row, and emits an EventBus event. The full coupling is in Part 04.

# Worker and Task Writes

- `create_worker(input)` — validates workspace/project scoping, encrypts any sensitive config, inserts the `worker` row, writes a `worker_history` transition via [[HistoryTables-Part01]], emits `worker.created`.
- `update_worker_status(id, status)` — the state change that MUST be persisted with its history transition in one transaction.
- `spawn_worker(parent_id, input)` — inserts the child with `parent_worker_id` set and writes both the parent and child transitions.
- `create_task(input)` and `assign_task(task_id, worker_id)` — task lifecycle writes, each with history.
- `complete_task(id, artifact_ids)` — marks the task completed and links produced artifacts.

# Workflow and Run Writes

- `create_workflow(input)`, `update_node(id, config)`, `connect_edge(input)` — graph mutations. Edges are validated so they never bind nodes from two workflows (the trigger in [[SQLiteSchema-Part06]] enforces it structurally too).
- `persist_run_state(run_id, steps, context)` — the core method of [[RunStatePersistence-Part01]]; writes `run`, `run_step`, and `run_context` in one transaction so a crash leaves a consistent resume point.
- `advance_run_tick(run_id)` — bumps `current_tick` and persists before the engine proceeds.

# Artifact, Prompt, Chat Writes

- `create_artifact(input)` — inserts the `artifact` row, stores the blob via the artifact store, writes `artifact_history`.
- `create_prompt_version(prompt_id, content, variables)` — appends a `prompt_version`, updates `prompt.current_version_id`; this is the prompt versioning path in [[Versioning-Part01]].
- `append_message(chat_id, message)` — inserts a `message`; chat messages are append-only by convention but not audit-protected.

# Settings and Memory Writes

- `upsert_setting(workspace_id, key, value)` — encrypts sensitive values via [[Encryption-Part01]] before write; enforces the unique (`workspace_id`, `key`).
- `write_memory(entry)` — inserts a `memory_entry` with `is_redacted` set when the PermissionManager masked secrets.

# Transaction Boundaries

The transaction boundary rule is the subtle one from [[HistoryTables-Part01]]:

```text
A state change and the history row that records it are in ONE transaction.
If the transaction commits, both exist. If it rolls back, neither exists.
No caller splits "update row" from "write history".
```

Run-state writes have an even tighter rule: `persist_run_state` commits before the engine tick returns. The WorkflowEngine MUST NOT proceed to the next tick holding an uncommitted run state.

# Invariants

```text
Every write validates at the boundary before SQL.
State change + history row share one transaction.
Run-state is committed before the engine ticks onward.
Edges never bind nodes from two workflows (validated + triggered).
Sensitive fields are encrypted before the pool sees them.
Every committed write emits its EventBus event.
Prompts are versioned, never overwritten in place.
```

# AI Notes

Do not let `update_worker_status` write the row and then "fire and forget" the history insert. They are one transaction. A status change with no history is exactly the unrecoverable audit gap [[HistoryTables-Part01]] exists to prevent.

Do not let the engine tick past `persist_run_state` before it commits. "Persist eventually" run state is a crash that forgets half a workflow and cannot resume. Commit first, tick second.

Do not overwrite a `prompt` row's content on edit. Append a `prompt_version` and repoint `current_version_id`. In-place edits destroy diffability and the versioning contract in [[Versioning-Part01]].

Do not write sensitive settings without encryption because "the column is inside an encrypted container". The field-level rule is unconditional; the container is a separate concern owned by [[BackupRestore-Part01]].

# Related Documents

- [[08-database/README]]
- [[RepositoryLayer-Part02]]
- [[RepositoryLayer-Part04]]
- [[RepositoryLayer-Diagrams]]
- [[RunStatePersistence-Part01]]
- [[HistoryTables-Part01]]
- [[SQLiteSchema-Part06]]
- [[Versioning-Part01]]
- [[Encryption-Part01]]
