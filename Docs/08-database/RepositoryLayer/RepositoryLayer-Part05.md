---
title: RepositoryLayer Specification - Part 05
status: draft
version: 1.0
tags:
  - database
  - repository-layer
  - errors
related:
  - "[[08-database/README]]"
  - "[[RepositoryLayer-Part01]]"
  - "[[SQLiteSchema-Part01]]"
---

# RepositoryLayer Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Pool, and the No-Raw-SQL Rule
Part 02 - The Read API Surface and the Query Shapes
Part 03 - The Write API Surface and Transaction Boundaries
Part 04 - Validation, the EventBus Projection, and the RepositoryRegistry
Part 05 - Error Model, Pagination, Checklist, and Worked Examples

# Error Model

The repository returns a typed error, never a raw SQLite string. Error families:

- `validation_error` — a required field missing, enum out of set, FK unresolved, or plaintext secret in an encrypted field. Carries the field name and a reason.
- `not_found` — the requested id does not exist or is soft-deleted and not explicitly requested.
- `scope_violation` — a cross-workspace read or write was attempted.
- `conflict` — a unique constraint (e.g. `settings(workspace_id, key)`) was violated.
- `integrity_error` — a foreign-key or CHECK failure the boundary validation missed (defensive; should not happen).
- `encryption_error` — the Encryption handle failed to encrypt or decrypt a field.
- `pool_error` — the connection pool is exhausted or closed (e.g. before the Versioning gate passed).
- `history_error` — the HistoryTables writer rejected the coupled history row (see [[HistoryTables-Part01]]).

Every error is mapped to a user-facing message by the IPC layer; the raw variant travels to logs only.

# Pagination

Every list/read method that can return more than a screen of rows is paginated:

- Input: a `cursor` (opaque, typically the last seen `created_at` plus id) and a `limit`.
- Output: the page of rows plus a `has_more` boolean and the next `cursor`.
- Ordering is stable: by `created_at` ascending or descending as the method defines, with `id` as the tiebreaker so pagination never skips or duplicates a row.
- Chats, messages, logs, and memory queries are always paginated. Worker and task listings may return a full filtered set when bounded by status, but accept a cursor for safety.

# Implementation Checklist

- [ ] Every entity has a repository module registered in `RepositoryRegistry`.
- [ ] Every write validates at the boundary (required, scope, FK, enum, encryption).
- [ ] Every state write shares a transaction with its history row.
- [ ] Replay-grade writes publish an event after commit and land in `event_log`.
- [ ] No generic `query_sql` IPC endpoint exists.
- [ ] The pool enables `foreign_keys = ON` and opens only after the Versioning gate.
- [ ] All list methods that can grow unbounded are paginated with a cursor.
- [ ] Errors are typed; raw SQLite strings never reach the caller.

# Worked Examples

**Example 1 — create_worker.** Input validated (workspace exists, project in same workspace, `kind` in set). Sensitive `config` fields encrypted. Transaction inserts `worker` and a `worker_history` `created` transition. After commit, `worker.created` published; the projection appends it to `event_log`. Returns the new worker id.

**Example 2 — cross-workspace read blocked.** A service calls `get_project(id)` with a workspace token that does not own the project. The repository's scope check rejects with `scope_violation` before any SQL. No row is read.

**Example 3 — paginated chat.** `get_messages(chat_id, cursor, limit=50)` returns messages 1-50 with `has_more = true` and a cursor at message 50's `created_at`+id. The next call resumes exactly at 51. Stable ordering prevents duplication when a message arrives mid-scroll.

**Example 4 — plaintext secret rejected.** `upsert_setting` is called with a value for an encrypted key but the value is not ciphertext. Validation rejects with `validation_error` naming the field; nothing is written.

# Invariants

```text
Errors are typed; raw SQLite strings never reach the caller.
Pagination is cursor-based with stable ordering (created_at, id).
Scope violations are rejected before SQL.
Replay-grade writes always reach event_log via the projection.
The RepositoryRegistry is the sole entry point; no generic SQL endpoint exists.
```

# AI Notes

Do not return a raw SQLite error string to the caller. It leaks schema detail and gives the frontend nothing actionable. Map to a typed error with a field and a reason.

Do not paginate by `LIMIT/OFFSET` with an unstable order. Inserting a row shifts offsets and the client skips or duplicates it. Use a cursor on `(created_at, id)`.

Do not let `scope_violation` become a silent retarget. A cross-workspace request is a bug or an attack; reject it, do not quietly serve the caller's own workspace instead.

# Related Documents

- [[08-database/README]]
- [[RepositoryLayer-Part04]]
- [[RepositoryLayer-Diagrams]]
- [[SQLiteSchema-Part01]]
- [[HistoryTables-Part01]]
- [[EventBus-Part01]]
- [[EventBus-Part02]]
- [[Encryption-Part01]]
- [[Versioning-Part01]]
