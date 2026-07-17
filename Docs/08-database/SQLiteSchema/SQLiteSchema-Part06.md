---
title: SQLiteSchema Specification - Part 06
status: draft
version: 1.0
tags:
  - database
  - sqlite-schema
  - indexes
  - constraints
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[Migrations-Part01]]"
  - "[[HistoryTables-Part01]]"
---

# SQLiteSchema Specification (Part 06)

## Document Index

Part 01 - Purpose, Naming Conventions, the Identity & Workspace Tables, and the Table Map
Part 02 - The Worker, Session, Task, and Execution Tables
Part 03 - The Workflow, Node, Edge, and Run-State Tables
Part 04 - The Artifact, Prompt, Chat, and Message Tables
Part 05 - The Memory, Settings, Log, and Plugin Tables
Part 06 - Indexes, Foreign Keys, CHECK Constraints, Invariant Triggers, Sizing

# Index Strategy

Indexes exist to make the common access paths fast without bloating writes. The guiding rule: index the columns you filter or join on in the hot paths, and keep secondary indexes narrow.

Required indexes across the catalog:

- `worker(workspace_id, status)` — the Runtime lists live workers constantly.
- `worker(parent_worker_id)` — to enumerate a worker's spawned children.
- `task(workspace_id, status)` and `task(assigned_worker_id, status)` — scheduler and worker views.
- `execution(worker_id, started_at)` and `execution(task_id)` — cost and debugging queries.
- `node(workflow_id)` and `edge(workflow_id, source_node_id, target_node_id)` — graph load and adjacency.
- `run(workflow_id, status)` and `run_step(run_id, status)` — engine resume and ready-set scans.
- `artifact(workspace_id, kind)` and `artifact(current_version_id)` — artifact browser and version resolution.
- `prompt(workspace_id, name)` and `prompt_version(prompt_id, version)` — prompt lookup and diffing.
- `message(chat_id, created_at)` — chat scroll and timeline.
- `memory_entry(workspace_id, scope, scope_id)` — the scoped memory query, the hottest memory path.
- `settings(workspace_id, key)` — unique, for single-value-per-scope reads.
- `log_entry(workspace_id, created_at)` and `log_entry(level, created_at)` — log panel and retention sweep.
- `chat(workspace_id, session_id)` and `chat(channel_id)` — channel and session views.

History tables (owned by [[HistoryTables-Part01]]) carry their own indexes described there; the index rule of "narrow and write-heavy" applies doubly because they are append-only and scan-read.

# Foreign Keys

Every `*_id` column that names another entity is a real foreign key with `ON DELETE` behavior chosen per relationship:

- Child-to-parent self references (`worker.parent_worker_id`, `task.parent_task_id`) use `ON DELETE RESTRICT` so a live subtree cannot be silently orphaned; deletion requires deleting children first.
- `project.workspace_id`, `worker.workspace_id`, and every Workspace-scoped FK use `ON DELETE CASCADE` so deleting a Workspace removes its subgraph atomically.
- `run.workflow_id`, `node.workflow_id`, `edge.workflow_id` use `ON DELETE CASCADE` because a deleted workflow invalidates its graph.
- Optional nullable FKs (`session.owner_worker_id`, `task.assigned_worker_id`, `artifact.producer_worker_id`) use `ON DELETE SET NULL` so deleting a worker does not destroy the artifact it produced.

Foreign-key enforcement is `PRAGMA foreign_keys = ON` for every connection in the pool; the [[Versioning-Part01]] gate verifies referential integrity on backup.

# CHECK Constraints

Every `status` and `kind` column carries a `CHECK` enumerating its allowed values, listed per table in Parts 02-05. Additional checks:

- `task.priority` in (`low`, `medium`, `high`, `critical`).
- `execution.cost_micro_usd >= 0` and `worker.cost_micro_usd >= 0` — money is never negative.
- `run.current_tick >= 0`.
- `memory_entry.importance BETWEEN 0 AND 100`.
- `log_entry.level` in (`trace`, `debug`, `info`, `warn`, `error`).
- `settings` has no CHECK on `value` because it is opaque JSON, but sensitive keys are encrypted by the RepositoryLayer before insert.

# Invariant Triggers

Some invariants cannot be expressed as a CHECK because they span rows or forbid an operation entirely. These are enforced by SQLite triggers documented here and owned by this topic:

- A trigger on every history table (see [[HistoryTables-Part01]]) that raises `SQLITE_CONSTRAINT` on any `UPDATE` or non-pruner `DELETE`, making the append-only law structural rather than conventional.
- A trigger on `node` and `edge` that verifies `node.workflow_id = edge.workflow_id` before an edge insert, preventing an edge that binds nodes from two workflows.
- A trigger on `run` that rejects `current_tick` decreasing below its prior value.
- A trigger on `workspace_meta` (owned by [[Versioning-Part01]]) that rejects lowering `highest_app_version_seen`.

These triggers are part of the schema and therefore part of every migration's up/down step. [[Migrations-Part01]] MUST include them in the version that introduces the constrained table.

# Sizing and Growth Notes

- Current-state tables are expected to stay small to medium; a long-lived Workspace has thousands of workers and tasks, not millions.
- History and log tables are the unbounded growth risks. Retention in [[HistoryTables-Part01]] and a log sweep keep them bounded. The `log_entry` table MUST be pruned aggressively; it is not audit-protected.
- The artifact store is on disk, not in SQLite; `artifact.byte_size` lets the UI show sizes without reading blobs.
- `memory_entry` should be pruned for `temporary` scope by `expires_at`; vector and knowledge projections follow in [[VectorStore-Part01]].

# Invariants

```text
Every connection enables PRAGMA foreign_keys = ON.
Every status/kind column is CHECK-constrained to its enumerated set.
Self-referential parents use RESTRICT; workspace-scoped FKs use CASCADE.
The append-only triggers exist on every history table and block UPDATE/DELETE.
edge inserts cannot bind nodes from different workflows (trigger-enforced).
run.current_tick never decreases (trigger-enforced).
Indexes cover the hot filter/join paths listed above and stay narrow.
```

# AI Notes

Do not add a filter path in the RepositoryLayer without a matching index. A missing index on `memory_entry(workspace_id, scope, scope_id)` turns the hottest memory query into a full table scan on every context injection.

Do not weaken a `CHECK` because "the UI only sends valid values". The CHECK is the last line of defense when a future cheap-model-generated service forgets a variant; it is cheaper than a corrupt enum in history.

Do not drop the append-only triggers to "make a one-off correction". Correction is a new history row, per [[HistoryTables-Part01]]. The trigger is what stops an implementer who has not read that document.

Do not let a migration add a table without its invariant triggers. A trigger omitted from the up step and its down step leaves the invariant unenforced at that version, which is a silent schema regression.

# Related Documents

- [[08-database/README]]
- [[SQLiteSchema-Part05]]
- [[SQLiteSchema-Diagrams]]
- [[Migrations-Part01]]
- [[HistoryTables-Part01]]
- [[RepositoryLayer-Part01]]
- [[Versioning-Part01]]
- [[RunStatePersistence-Part01]]
