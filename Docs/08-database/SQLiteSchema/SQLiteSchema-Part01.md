---
title: SQLiteSchema Specification - Part 01
status: draft
version: 1.0
tags:
  - database
  - sqlite-schema
  - architecture
related:
  - "[[08-database/README]]"
  - "[[Migrations-Part01]]"
  - "[[RepositoryLayer-Part01]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[Encryption-Part01]]"
---

# SQLiteSchema Specification (Part 01)

## Document Index

Part 01 - Purpose, Naming Conventions, the Identity & Workspace Tables, and the Table Map
Part 02 - The Worker, Session, Task, and Execution Tables
Part 03 - The Workflow, Node, Edge, and Run-State Tables
Part 04 - The Artifact, Prompt, Chat, and Message Tables
Part 05 - The Memory, Settings, Log, and Plugin Tables
Part 06 - Indexes, Foreign Keys, CHECK Constraints, Invariant Triggers, Sizing

# Purpose

SQLiteSchema is the catalog of every relational table Eulinx stores in its primary SQLite database.

This document is the authoritative description of the database shape at one schema version. It does not describe how the shape changes over time; that is [[Migrations-Part01]]. It does not describe how rows are written; that is [[RepositoryLayer-Part01]]. It does not describe which rows are immutable; that is [[HistoryTables-Part01]]. It describes what exists.

Every table belongs to exactly one of three classes:

- **current-state tables** — mutable rows answering "what is true now". They are updated and deleted in the ordinary course of business.
- **append-only tables** — owned by [[HistoryTables-Part01]], never updated, pruned only under audit-protected rules.
- **ledger tables** — owned by [[Migrations-Part01]] and [[Versioning-Part01]] (`schema_migrations`, `workspace_meta`), recording the database's own evolution.

A table in this document is a current-state table unless it is explicitly cross-referenced to a history or ledger owner.

# Global Conventions

Identifiers MUST follow these rules so the query layer and the migration tooling can agree on names without negotiation.

- Every table name is `snake_case`, singular, and names the entity not the collection: `worker`, `workflow`, `artifact`.
- Every primary key is named `id` and is a `TEXT` ULID string, except the internal ledger tables which use integer sequences as documented in their owning topics.
- Every foreign key column is named `<entity>_id` and references that entity's `id`.
- Every row carries `created_at` and `updated_at` as `TEXT` RFC3339 UTC timestamps, maintained by the RepositoryLayer, except append-only rows which carry an event time instead.
- Every soft-deletable entity carries `deleted_at` nullable `TEXT`; hard deletes are forbidden for worker, workflow, artifact, chat, and prompt rows.
- `status` and `kind` columns are `TEXT` and SHOULD be constrained by a `CHECK` enumerating the allowed values, defined per table in the Parts below.
- Money is stored as `INTEGER` micro-units of the currency (micro-USD for cost), never as `REAL`.
- Encrypted columns are `TEXT` and store only ciphertext plus a version tag; their plaintext never exists in SQLite. See [[Encryption-Part01]].

# The Identity and Workspace Tables

These are the roots of the foreign-key graph. Almost every other table references one of them.

## `app_meta`

A single-row table holding process-wide constants that are not Workspace-scoped. Fields: `id` (always 1), `app_version` (the build semver that created the row), `install_id` (a stable ULID for the install, used for telemetry opt-in only), `created_at`.

## `workspace`

A Workspace is the isolated environment the user points Eulinx at: one local folder, one boundary for memory, history, files, and agents. Fields: `id` ULID, `name`, `path` (absolute folder on disk), `workspace_format_version` (integer, mirrors [[Versioning-Part01]]), `created_at`, `updated_at`, `deleted_at`. A Workspace owns workers, sessions, tasks, workflows, artifacts, chats, prompts, memory, settings, logs, and plugin instances. Cross-Workspace reads are forbidden.

## `project`

A project is a sub-scope within a workspace, typically one git repository or one target application the agents work on. Fields: `id` ULID, `workspace_id` FK, `name`, `root_path` (relative to the workspace path), `git_remote` nullable, `created_at`, `updated_at`, `deleted_at`. Workers and tasks bind to a project so that one agent working on the backend project cannot accidentally mutate the frontend project's files; this is the structural guard behind the user's "phases must not overwrite each other" requirement.

## `user`

A local user profile for the install, supporting future multi-profile and account sync. Fields: `id` ULID, `display_name`, `created_at`, `updated_at`. Most local-first state is not user-scoped, but the row exists so sync and accounts can attach later without a migration.

# The Full Table Map

The complete set of current-state tables described across this topic:

```text
app_meta            process-wide constants (1 row)
workspace           the isolated environment (root)
project             a sub-scope within a workspace
user                local user profile

worker              a running AI terminal / process
session             an AI conversation session
task                a unit of delegated work
execution           one execution of a node's work

workflow            a saved node graph
node                a node within a workflow
edge                a connection between nodes
run                 a live run of a workflow
run_step            one node's state within a run
run_context         data carried between run steps

artifact            a produced output (file, markdown, code, ...)
prompt              a versioned prompt definition
chat                a chat thread
message             a message within a chat

memory_entry       a scoped memory record (see 04-memory)
settings            workspace and global settings key/value
log_entry           structured application log
plugin              an installed plugin registration
plugin_node         a node kind contributed by a plugin
plugin_tool         a tool contributed by a plugin
```

The history, ledger, and search/vector stores supplement these but do not replace them.

# Invariants

```text
Every foreign key references an existing row or is NULL where explicitly allowed.
Every id is a ULID string; no table uses an auto-increment rowid as a public id.
workspace_id is present on every Workspace-scoped table and is NOT NULL.
No current-state table duplicates a history table's content as its source of truth.
No encrypted column contains plaintext.
No money column is REAL.
Every soft-deletable entity has deleted_at and is filtered by the RepositoryLayer.
```

# AI Notes

Do not add a new table without deciding which Workspace it belongs to and adding the `workspace_id` foreign key. A table without a workspace boundary is a cross-tenant leak waiting to happen.

Do not use auto-increment integer primary keys as public identifiers. ULIDs are strings, sortable, and safe to expose to the TypeScript layer and to the [[EventBus-Part01]] without revealing row counts.

Do not reach for a hard `DELETE` on worker, workflow, artifact, chat, or prompt. They are soft-deleted through `deleted_at` so history and replay can still resolve references made before deletion.

Do not store money as a float because you "will round at display". Floats do not sum associatively; two screens will disagree. Integer micro-units, always.

# Related Documents

- [[08-database/README]]
- [[SQLiteSchema-Part02]]
- [[SQLiteSchema-Diagrams]]
- [[Migrations-Part01]]
- [[RepositoryLayer-Part01]]
- [[Versioning-Part01]]
- [[Encryption-Part01]]
- [[WorkspaceManager-Part01]]
- [[WorkflowEngine-Part01]]
