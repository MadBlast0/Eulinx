---
title: SQLiteSchema Specification - Part 04
status: draft
version: 1.0
tags:
  - database
  - sqlite-schema
  - artifacts
  - prompts
  - chat
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[Versioning-Part01]]"
  - [[HistoryTables-Part01]]
---

# SQLiteSchema Specification (Part 04)

## Document Index

Part 01 - Purpose, Naming Conventions, the Identity & Workspace Tables, and the Table Map
Part 02 - The Worker, Session, Task, and Execution Tables
Part 03 - The Workflow, Node, Edge, and Run-State Tables
Part 04 - The Artifact, Prompt, Chat, and Message Tables
Part 05 - The Memory, Settings, Log, and Plugin Tables
Part 06 - Indexes, Foreign Keys, CHECK Constraints, Invariant Triggers, Sizing

# The Artifact Tables

An Artifact is any output a Worker or node produces: markdown, code, JSON, a patch, a screenshot, a plan. Artifacts flow between workers instead of raw conversation. They are the unit of build and verify.

## `artifact`

Fields: `id` ULID, `workspace_id` FK, `project_id` FK nullable, `producer_worker_id` FK nullable, `producer_task_id` FK nullable, `kind` (`markdown` | `code` | `json` | `prompt` | `test` | `screenshot` | `diagram` | `plan` | `commit` | `patch` | `sql` | `image` | `binary`), `name`, `storage_ref` (reference to the binary blob on disk or in the artifact store; the row is metadata), `byte_size` INTEGER, `mime_type` nullable, `hash_sha256` TEXT, `verification_status` (`unverified` | `pending` | `verified` | `failed`), `current_version_id` FK nullable (points at the active row in `artifact_version`, see [[Versioning-Part01]]), `created_at`, `updated_at`, `deleted_at`.

# The Prompt Tables

Prompts are versioned, testable, reusable definitions. They are first-class, not inline strings.

## `prompt`

Fields: `id` ULID, `workspace_id` FK, `name`, `description`, `current_version_id` FK nullable, `tags` JSON array, `created_at`, `updated_at`, `deleted_at`. The `prompt` row is stable; edits create versions in `prompt_version`.

## `prompt_version`

Fields: `id` ULID, `prompt_id` FK, `version` INTEGER (1-based, monotonic), `content` TEXT (the prompt body, possibly with variable placeholders), `variables` JSON (the declared variable schema), `parent_version_id` FK nullable (for inheritance/diff), `created_by` TEXT, `created_at`. Versioning semantics are in [[Versioning-Part01]].

# The Chat Tables

Chats are threads; messages are their lines. Chats bind to a session for model/context continuity.

## `chat`

Fields: `id` ULID, `workspace_id` FK, `project_id` FK nullable, `session_id` FK nullable, `title`, `kind` (`user` | `agent` | `channel`), `channel_id` FK nullable (links to `worker_channel` for "by the way" chats), `created_at`, `updated_at`, `deleted_at`.

## `message`

Fields: `id` ULID, `chat_id` FK, `sender_kind` (`user` | `worker` | `system` | `tool`), `sender_worker_id` FK nullable, `role` (`user` | `assistant` | `system` | `tool`), `content` TEXT, `content_kind` (`text` | `markdown` | `code` | `json` | `artifact_ref` | `tool_result`), `artifact_ref` FK nullable (when the message carries an artifact), `channel_id` FK nullable (when posted to a worker channel), `token_count` INTEGER nullable, `created_at`. Messages are append-only in practice; they are not mutated, but they are not part of the audit-protected history families.

# Invariants

```text
An artifact's current_version_id, if set, references an existing prompt_version or artifact_version.
A message's chat_id is not null; a chat belongs to exactly one workspace.
artifact.storage_ref points at an external blob; the row never holds the bulk payload inline.
prompt.content may contain variable placeholders but the resolved content is stored per version.
No artifact, prompt, or chat row is hard-deleted; deleted_at is the deletion path.
```

# AI Notes

Do not inline large artifact payloads into the `artifact` row. The row is metadata plus a `storage_ref`. Blobs live in the artifact store on disk; SQLite stays small and fast.

Do not store the resolved prompt inline in `prompt`. The `prompt` row is the stable identity; `prompt_version` holds each edit. Versioning and diffing depend on that separation. See [[Versioning-Part01]].

Do not treat `message` as a history table. It is append-only by convention but it is not audit-protected; the audit spine is `event_log` in [[HistoryTables-Part01]].

# Related Documents

- [[08-database/README]]
- [[SQLiteSchema-Part03]]
- [[SQLiteSchema-Part05]]
- [[SQLiteSchema-Diagrams]]
- [[Versioning-Part01]]
- [[HistoryTables-Part01]]
- [[ContextInjection-Part01]]
- [[MergeManager-Part01]]
