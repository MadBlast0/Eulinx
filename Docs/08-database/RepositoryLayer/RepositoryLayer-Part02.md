---
title: RepositoryLayer Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - repository-layer
  - queries
related:
  - "[[08-database/README]]"
  - "[[RepositoryLayer-Part01]]"
  - "[[SQLiteSchema-Part01]]"
---

# RepositoryLayer Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Pool, and the No-Raw-SQL Rule
Part 02 - The Read API Surface and the Query Shapes
Part 03 - The Write API Surface and Transaction Boundaries
Part 04 - Validation, the EventBus Projection, and the RepositoryRegistry
Part 05 - Error Model, Pagination, Checklist, and Worked Examples

# The Read API Surface

Reads are grouped by entity into repository modules that mirror the [[SQLiteSchema-Part01]] catalog. Each module exposes intent-level query methods. The shapes below are described in words; the actual returned structures are typed Rust/TypeScript records whose fields equal the table columns in the schema Parts.

# Workspace and Project Reads

- `list_workspaces` — returns workspaces the install can open, filtered by the Versioning verdict.
- `get_workspace(id)` — returns one workspace or a not-found error.
- `list_projects(workspace_id)` — projects scoped to a workspace.
- `get_project(id)` — with workspace scoping enforced.

# Worker, Session, Task, Execution Reads

- `list_workers(workspace_id, filter)` — filter by `status`, `kind`, `project_id`, `parent_worker_id`. This is the Runtime's hottest read; it uses the `worker(workspace_id, status)` index.
- `get_worker(id)` — returns the current worker row plus a lightweight count of spawned children.
- `list_spawned_workers(parent_worker_id)` — the children of a worker, using the self-FK.
- `list_tasks(workspace_id, filter)` — by `status`, `priority`, `assigned_worker_id`.
- `get_task_with_dependencies(id)` — the task plus its dependency rows.
- `list_executions(worker_id, range)` — for cost and debugging, using `execution(worker_id, started_at)`.

# Workflow, Node, Edge, Run Reads

- `get_workflow(id)` — the workflow header.
- `get_graph(workflow_id)` — returns all `node` and `edge` rows for a workflow in one call; this is what rebuilds the engine's in-memory mirror.
- `list_runs(workflow_id, filter)` — by `status`, using `run(workflow_id, status)`.
- `get_run_with_steps(run_id)` — the run plus all `run_step` rows, the resume payload for [[RunStatePersistence-Part01]].
- `get_run_context(run_id)` — the `run_context` payload.

# Artifact, Prompt, Chat Reads

- `list_artifacts(workspace_id, filter)` — by `kind`, `verification_status`, using `artifact(workspace_id, kind)`.
- `get_artifact_with_version(id)` — the artifact plus its current `artifact_version`.
- `list_prompts(workspace_id)` and `get_prompt_with_versions(id)` — for the prompt library and diffing.
- `list_chats(workspace_id, filter)` — by `session_id`, `channel_id`.
- `get_messages(chat_id, range)` — paginated chat scroll, using `message(chat_id, created_at)`.

# Memory, Settings, Log, Plugin Reads

- `query_memory(workspace_id, scope, scope_id, filter)` — the scoped memory read; the filter is built from the caller's permitted scopes, never a caller-supplied raw scope.
- `get_setting(workspace_id, key)` and `list_settings(workspace_id)`.
- `query_logs(workspace_id, filter)` — by `level`, `source`, time range, for the log panel.
- `list_plugins(workspace_id)` and `list_plugin_nodes(plugin_id)`.

# Invariants

```text
Every read is scoped by workspace_id; cross-workspace reads are rejected.
Soft-deleted rows are excluded unless the method explicitly requests them.
The graph read returns nodes and edges together for consistency.
Memory reads enforce the caller's permitted scopes, not a supplied scope.
Paginated reads return a cursor and a has_more flag, never an unbounded set.
```

# AI Notes

Do not return an unbounded result set from a list method. Chats, logs, and messages grow without bound; every list read is paginated with a cursor.

Do not let `query_memory` accept a raw `scope` from the caller. The repository computes the permitted scope filter from the caller's identity; trusting a supplied scope is the memory-leak bug [[SQLiteSchema-Part05]] forbids.

Do not split `get_graph` into separate node and edge calls "for simplicity". The engine needs a consistent snapshot; two calls can race a concurrent edit and yield a mismatched graph.

# Related Documents

- [[08-database/README]]
- [[RepositoryLayer-Part01]]
- [[RepositoryLayer-Part03]]
- [[RepositoryLayer-Diagrams]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part02]]
- [[SQLiteSchema-Part03]]
- [[RunStatePersistence-Part01]]
