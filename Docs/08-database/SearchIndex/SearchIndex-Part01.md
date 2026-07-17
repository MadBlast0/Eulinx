---
title: SearchIndex Specification - Part 01
status: draft
version: 1.0
tags:
  - database
  - search-index
  - tantivy
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part01]]"
  - "[[RepositoryLayer-Part01]]"
  - "[[VectorStore-Part01]]"
---

# SearchIndex Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Indexed Surfaces, and the Document Model
Part 02 - The Ingestion Pipeline, Consistency with SQLite, and the Write Path
Part 03 - The Query Path, Result Mapping, and the Rebuild Path

# Purpose

SearchIndex owns Eulinx's full-text search over its relational content. It is built on Tantivy, a local inverted-index engine running in the Rust backend. It provides fast keyword and phrase search across chats, workflows, artifacts, prompts, and memory entries — things SQLite `LIKE` queries cannot do efficiently or rank well.

SearchIndex is a derived projection. SQLite is the source of truth. The index stores only enough to find a row and rank it; the authoritative content and metadata live in SQLite (and the artifact store). If the index disagrees with SQLite, SQLite wins and the index is rebuilt.

# Core Philosophy

The index is a cache of findability, not a store of record. Three principles:

**SQLite is authority.** The index returns row identifiers and snippets; the RepositoryLayer reads the real row from SQLite. A search result that SQLite says was deleted is dropped, not shown.

**Consistency by projection, not by lock.** The index is updated by the same write path that updates SQLite (the EventBus→DB projection, see [[RepositoryLayer-Part04]]). It never races the database; it trails it by the latency of one projection event.

**Rebuildable.** Because the index is derived, it MUST be fully rebuildable from SQLite. A corrupted or missing index is not a data-loss event; it is a "rebuild and continue" event. The rebuild path is in Part 03.

# The Indexed Surfaces

SearchIndex indexes a curated set of surfaces, each as a Tantivy `Document` type:

- `chat_message` — the `message` table (see [[SQLiteSchema-Part04]]), indexed by content, role, and chat/scope, so "find the message where we discussed the auth bug" works.
- `workflow` — the `workflow` and `node` tables, indexed by name, description, and node labels/config text, so graphs are searchable by what they do.
- `artifact` — the `artifact` table plus a text extraction of the artifact content (for text/markdown/code kinds), indexed by name and body.
- `prompt` — the `prompt` and `prompt_version` tables, indexed by name and prompt body.
- `memory_entry` — the `memory_entry` table (see [[SQLiteSchema-Part05]]), indexed by content and scope, respecting the same scope filtering the RepositoryLayer enforces.

Non-indexed surfaces: `log_entry` (searchable via its own query, not the inverted index), settings, and secrets (never indexed; they are encrypted and excluded).

# The Document Model

Each indexed surface maps to a Tantivy schema with fields:

- `doc_id` — a stable string combining the surface and the SQLite row id (e.g. `message:abc123`), the key used to map a hit back to a row.
- `workspace_id` — stored and used as a filter so a search never crosses Workspace boundaries.
- `surface` — the surface name, for result grouping and filtering.
- `title` — a short display field (chat title, workflow name, artifact name, prompt name).
- `body` — the searchable text (message content, node config text, artifact body, prompt body, memory content).
- `scope_filter` — for memory, the scope/scope_id so scoped queries filter correctly.
- `updated_at` — for recency ranking and for detecting stale index entries.

The `body` field uses Tantivy's tokenizer appropriate to the content (e.g. a code-aware tokenizer for artifacts, a natural-language tokenizer for chats and memory).

# Invariants

```text
SQLite is the authority; the index returns ids, not content of record.
A search result deleted in SQLite is dropped before display.
The index is updated via the same write path as SQLite, never independently.
The index is fully rebuildable from SQLite.
No search crosses Workspace boundaries (workspace_id filter).
Secrets are never indexed.
```

# AI Notes

Do not store the full artifact body as the source of truth in the index. The index holds a searchable copy for ranking; the real content is in the artifact store. If the index is lost, the artifact is not.

Do not let a search return rows from another Workspace because the index "didn't filter". Every query filters by `workspace_id`; the index stores it precisely so this is a cheap, mandatory filter.

Do not make the index authoritative over SQLite. If they disagree (a deleted row still indexed), SQLite wins and the entry is treated as stale and dropped. The reverse would surface phantom results.

Do not index secrets. Encrypted values are unsearchable ciphertext anyway, and indexing them would leak metadata (which rows hold secrets) into a derived store that may not be encrypted the same way.

# Related Documents

- [[08-database/README]]
- [[SearchIndex-Part02]]
- [[SearchIndex-Diagrams]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part04]]
- [[SQLiteSchema-Part05]]
- [[RepositoryLayer-Part04]]
- [[VectorStore-Part01]]
- [[Encryption-Part01]]
