---
title: RepositoryLayer Specification - Part 01
status: draft
version: 1.0
tags:
  - database
  - repository-layer
  - data-access
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[EventBus-Part01]]"
---

# RepositoryLayer Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Pool, and the No-Raw-SQL Rule
Part 02 - The Read API Surface and the Query Shapes
Part 03 - The Write API Surface and Transaction Boundaries
Part 04 - Validation, the EventBus Projection, and the RepositoryRegistry
Part 05 - Error Model, Pagination, Checklist, and Worked Examples

# Purpose

RepositoryLayer is the only path through which Eulinx reads or writes SQLite. It sits between the Rust runtime, the TypeScript services (reached via Tauri IPC `invoke`), and the SQLx connection pool. It exposes intent-level methods, never SQL strings.

Its job is to make the rest of the application incapable of issuing ad-hoc SQL, and to centralize the rules that every write must obey: validation, transaction boundaries, workspace scoping, soft-delete filtering, and the EventBus→DB projection described in Part 04.

# Core Philosophy

The database is too important and too easy to corrupt with a hand-written query to let anyone but this layer touch it. Three principles:

**No raw SQL at the edge.** Every caller invokes a named method such as `create_worker` or `list_runs`. The SQL lives inside the repository, reviewed once, and reused forever. A TypeScript service that needs data calls a repository method over IPC; it never constructs a `SELECT`.

**One validation point.** Every write is validated at the repository boundary: required fields present, foreign keys resolve within the same workspace, enums within their CHECK set, encrypted fields already encrypted. Validation fails the call before any SQL runs.

**Projection is part of the write.** Many writes must also produce a history row and an EventBus event. The repository owns that coupling so callers do not forget it. See Part 04.

# The Connection Pool

RepositoryLayer owns the SQLx pool. The pool is configured once at startup:

- `PRAGMA foreign_keys = ON` for every connection (enforced even before the trigger layer in [[SQLiteSchema-Part06]]).
- WAL mode for concurrent reads during writes.
- A bounded number of connections; the Runtime's hot paths (worker listing, run-state writes) use reserved connections to avoid head-of-line blocking behind reporting queries.
- Every connection is opened only after the [[Versioning-Part01]] gate has returned OPEN or after a successful migration.

# The No-Raw-SQL Rule

This is the rule the rest of the document depends on:

```text
No TypeScript service, no UI component, and no Worker process issues a SQL
statement against Eulinx's SQLite database.

All access is through RepositoryLayer methods exposed over Tauri IPC.
The SQLx queries live inside the Rust repository implementations.
```

The rule is structural where possible: the IPC surface exposes only repository method names, not a generic `query(sql)` endpoint. A generic query endpoint would be a second write path and is forbidden.

# Responsibilities

RepositoryLayer MUST:

- expose every SQLite read/write as a named, intent-level method
- validate every write at the boundary before issuing SQL
- scope every query by `workspace_id` and reject cross-workspace reads
- filter soft-deleted rows (`deleted_at IS NULL`) by default
- open transactions that include both the state change and its history row
- encrypt sensitive fields via [[Encryption-Part01]] before insert/update
- emit the corresponding EventBus event after a committed write
- return typed errors, never raw SQLite error strings, to the caller

RepositoryLayer MUST NOT:

- expose a generic `execute_sql` or `query_sql` IPC endpoint
- accept a SQL string from any caller
- write to a history table directly (it delegates to the HistoryTables writer)
- bypass the [[Versioning-Part01]] gate by opening a connection itself
- let a Worker write current-state rows outside the transaction that records its history

# Invariants

```text
All SQLite access flows through RepositoryLayer. No second path exists.
Every connection has foreign_keys = ON.
Every query is scoped by workspace_id.
Soft-deleted rows are invisible unless explicitly requested.
A state write and its history write share one transaction.
Sensitive fields are encrypted before they reach the pool.
The pool is opened only after the Versioning gate passes.
```

# AI Notes

Do not add a generic `query(sql)` IPC endpoint "for flexibility". It is a second write path that bypasses validation, scoping, and the EventBus projection. Every new data need is a new repository method, not a generic escape hatch.

Do not let the TypeScript layer build a query string and send it. If you find the frontend needing a `WHERE` clause, that is a missing repository method, not a reason to expose SQL.

Do not separate the state write from the history write at the call site. The repository method owns the transaction; callers that do "write row then call history" create the gap [[HistoryTables-Part01]] forbids.

Do not open a connection before the Versioning gate returns OPEN. A repository that races the gate can query a database nobody cleared for use.

# Related Documents

- [[08-database/README]]
- [[RepositoryLayer-Part02]]
- [[RepositoryLayer-Diagrams]]
- [[SQLiteSchema-Part01]]
- [[RunStatePersistence-Part01]]
- [[EventBus-Part01]]
- [[Versioning-Part01]]
- [[Encryption-Part01]]
- [[HistoryTables-Part01]]
