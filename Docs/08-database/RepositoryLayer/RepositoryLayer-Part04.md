---
title: RepositoryLayer Specification - Part 04
status: draft
version: 1.0
tags:
  - database
  - repository-layer
  - eventbus-projection
related:
  - "[[08-database/README]]"
  - "[[RepositoryLayer-Part01]]"
  - "[[EventBus-Part01]]"
  - "[[HistoryTables-Part01]]"
---

# RepositoryLayer Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Pool, and the No-Raw-SQL Rule
Part 02 - The Read API Surface and the Query Shapes
Part 03 - The Write API Surface and Transaction Boundaries
Part 04 - Validation, the EventBus Projection, and the RepositoryRegistry
Part 05 - Error Model, Pagination, Checklist, and Worked Examples

# Validation at the Boundary

Every write method runs a validation pass before issuing SQL. Validation covers:

- **Required fields** — every NOT NULL column in [[SQLiteSchema-Part01]] has a corresponding required input field; missing fields reject with a typed error.
- **Workspace scoping** — a write's `workspace_id` must match the caller's workspace; a cross-workspace write is rejected, not silently retargeted.
- **Foreign-key resolution** — referenced ids (`project_id`, `parent_worker_id`, `assigned_worker_id`, etc.) must exist in the same workspace; dangling references reject.
- **Enum membership** — `status`, `kind`, `priority`, `level` values must be in their CHECK set; an unknown variant rejects rather than corrupting the row.
- **Encryption prerequisite** — any field documented as encrypted in [[Encryption-Part01]] must arrive already encrypted; a plaintext secret in such a field rejects.

Validation failures return before any SQL runs, so they never leave a half-written transaction.

# The EventBus Projection

The repository is the write side of the EventBus→DB projection. For every committing write that is replay-grade, the method:

1. performs the state change and its history row in one transaction,
2. after commit, publishes the matching event on the [[EventBus-Part01]], and
3. the EventBus projection handler appends the event to `event_log` (owned by [[HistoryTables-Part01]]).

The ordering matters. The state and history commit first; the event is published after commit so a subscriber never observes an event for a write that rolled back. The `event_log` insert is itself a history write, performed by the HistoryTables writer, and it MUST be in the same logical projection as the original state change.

Some writes are not replay-grade (e.g. a settings toggle, a soft-delete flag) and emit an event but are not written to `event_log`. The replay-grade catalog lives in [[EventBus-Part02]]; the repository consults it to decide whether the event also lands in history.

# The RepositoryRegistry

All repository modules register in a single `RepositoryRegistry` constructed at startup after the Versioning gate passes. The registry:

- holds the SQLx pool,
- holds the Encryption handle (see [[Encryption-Part01]]) and the HistoryTables writer,
- exposes the modules (`workers`, `workflows`, `artifacts`, `memory`, ...) to the IPC layer,
- rejects any IPC method call before the gate has passed.

The registry is the single object the Tauri command handlers depend on. There is no other way to reach the pool.

# Invariants

```text
Validation runs before SQL on every write.
State change, history row, and (if replay-grade) event_log insert are consistent.
Events are published only after the originating transaction commits.
The replay-grade decision comes from the EventBus catalog, not caller whim.
The RepositoryRegistry is the only entry point to the pool.
No IPC method runs before the Versioning gate passes.
```

# AI Notes

Do not publish the EventBus event before the transaction commits. A subscriber would act on an event whose write then rolled back, producing a system that believes something happened that did not. Commit, then publish.

Do not decide replay-grade status per call site. The catalog in [[EventBus-Part02]] is the single source; the repository consults it. Ad-hoc "this one is important" decisions are how non-replay-grade events leak into `event_log` and break [[Replay-Part01]].

Do not let the Encryption handle be optional in the registry. A repository that cannot encrypt must fail closed, not write plaintext. The handle is constructed at startup or the registry refuses to initialize.

Do not expose the pool outside the registry. A second holder of the pool is a second write path, which violates the no-raw-SQL rule in Part 01.

# Related Documents

- [[08-database/README]]
- [[RepositoryLayer-Part03]]
- [[RepositoryLayer-Part05]]
- [[RepositoryLayer-Diagrams]]
- [[EventBus-Part01]]
- [[EventBus-Part02]]
- [[HistoryTables-Part01]]
- [[Replay-Part01]]
- [[Encryption-Part01]]
- [[Versioning-Part01]]
