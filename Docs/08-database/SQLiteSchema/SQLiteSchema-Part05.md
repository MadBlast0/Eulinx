---
title: SQLiteSchema Specification - Part 05
status: draft
version: 1.0
tags:
  - database
  - sqlite-schema
  - memory
  - settings
  - plugins
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[04-memory/README]]"
  - "[[PluginArchitecture-Part01]]"
---

# SQLiteSchema Specification (Part 05)

## Document Index

Part 01 - Purpose, Naming Conventions, the Identity & Workspace Tables, and the Table Map
Part 02 - The Worker, Session, Task, and Execution Tables
Part 03 - The Workflow, Node, Edge, and Run-State Tables
Part 04 - The Artifact, Prompt, Chat, and Message Tables
Part 05 - The Memory, Settings, Log, and Plugin Tables
Part 06 - Indexes, Foreign Keys, CHECK Constraints, Invariant Triggers, Sizing

# The Memory Tables

Eulinx memory is scoped and typed. The relational anchor for the memory system documented in [[04-memory/README]] lives here; the vector and knowledge stores are projections described in [[VectorStore-Part01]] and the 04-memory `KnowledgeBase` topic.

## `memory_entry`

Fields: `id` ULID, `workspace_id` FK, `scope` (`global` | `workspace` | `project` | `worker` | `task` | `session`), `scope_id` TEXT nullable (the id of the scoped object when scope is not global), `kind` (`working` | `conversation` | `project` | `knowledge` | `vector` | `temporary` | `long_term` | `worker` | `workspace`), `content` TEXT (the memory text; large contents may reference a knowledge chunk instead), `importance` INTEGER (0-100, used for summarization priority), `source_ref` nullable, `is_redacted` INTEGER (0/1, set when the PermissionManager masked secrets), `created_at`, `updated_at`, `expires_at` nullable (temporary memory TTL), `deleted_at`.

The `scope`/`scope_id` pair is what makes memory isolation enforceable: a Worker querying memory passes its own id and the query layer filters to `scope` in (`global`, `workspace`, its `worker` row, its `task`, its `session`). Memory MUST respect Workspace boundaries.

# The Settings Tables

## `settings`

A key/value store for workspace and global settings, including model profiles, MCP server enablement, refinement mode defaults, and theme. Fields: `id` ULID, `workspace_id` FK nullable (NULL means global), `key` TEXT, `value` TEXT (JSON-serialized; sensitive values encrypted per [[Encryption-Part01]]), `updated_at`. A unique constraint on (`workspace_id`, `key`) ensures one value per scope.

# The Log Tables

## `log_entry`

Structured application logs, retained for debugging and surfaced in the UI's log panels. Fields: `id` ULID, `workspace_id` FK nullable, `level` (`trace` | `debug` | `info` | `warn` | `error`), `source` TEXT (component name), `message` TEXT, `metadata` JSON nullable, `created_at`. Logs are written by the Rust `tracing` layer through the RepositoryLayer and are pruned by retention.

# The Plugin Tables

Eulinx's plugin system (see [[PluginArchitecture-Part01]]) registers extensions in SQLite.

## `plugin`

Fields: `id` ULID, `workspace_id` FK nullable (NULL for app-wide plugins), `name`, `kind` (`node` | `provider` | `tool` | `panel`), `version` TEXT, `enabled` INTEGER (0/1), `entry_point` TEXT (the resolved path or identifier), `manifest_ref` TEXT, `installed_at`, `updated_at`.

## `plugin_node`

A node kind contributed by a plugin, so the WorkflowEngine can validate and dispatch it. Fields: `id` ULID, `plugin_id` FK, `node_kind` TEXT (the `kind` value that appears in `node.kind` as `plugin`), `config_schema` JSON, `created_at`.

## `plugin_tool`

A tool contributed by a plugin, registered in the ToolRegistry. Fields: `id` ULID, `plugin_id` FK, `tool_name` TEXT, `capability` TEXT, `permission_required` TEXT nullable, `created_at`.

# Invariants

```text
memory_entry.scope_id matches the referenced scoped object when scope is not global.
A memory query MUST filter by workspace_id and by the caller's permitted scopes.
settings.value for sensitive keys is encrypted; plaintext secrets never persist.
plugin_node.node_kind is unique per enabled plugin to avoid kind collisions.
log_entry.level is constrained by CHECK to its enumerated set.
```

# AI Notes

Do not let a Worker read memory outside its permitted scopes by passing a crafted `scope_id`. The RepositoryLayer enforces the scope filter from the caller's identity; the SQL layer never trusts a caller-supplied scope.

Do not store API keys in `settings.value` in plaintext. Sensitive settings go through [[Encryption-Part01]]; the field holds ciphertext plus a version tag.

Do not register two enabled plugins exposing the same `node_kind`. The WorkflowEngine would have no deterministic dispatch. The unique constraint enforces it; the loader must check before enabling.

# Related Documents

- [[08-database/README]]
- [[SQLiteSchema-Part04]]
- [[SQLiteSchema-Part06]]
- [[SQLiteSchema-Diagrams]]
- [[04-memory/README]]
- [[MemoryManager-Part01]]
- [[ContextInjection-Part01]]
- [[PluginArchitecture-Part01]]
- [[Encryption-Part01]]
- [[VectorStore-Part01]]
