---
title: SearchIndex Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - search-index
  - ingestion
related:
  - "[[08-database/README]]"
  - "[[SearchIndex-Part01]]"
  - "[[RepositoryLayer-Part04]]"
  - "[[EventBus-Part02]]"
---

# SearchIndex Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Indexed Surfaces, and the Document Model
Part 02 - The Ingestion Pipeline, Consistency with SQLite, and the Write Path
Part 03 - The Query Path, Result Mapping, and the Rebuild Path

# The Ingestion Pipeline

Indexing is driven by the same events that persist to SQLite, so the index trails the database by one projection event rather than racing it. The pipeline per affected row:

1. The RepositoryLayer write commits the SQLite state change and publishes the EventBus event (see [[RepositoryLayer-Part04]]).
2. The SearchIndex projection handler receives the event (e.g. `message.created`, `artifact.verified`, `workflow.updated`).
3. It maps the event to the correct surface's Tantivy `Document`, extracting the `body` text (for artifacts, it reads the artifact store blob and extracts text for text/markdown/code kinds).
4. It opens a Tantivy index writer, adds or updates the `Document` keyed by `doc_id`, and commits the segment.
5. It records the `updated_at` of the source row on the document so staleness can be detected.

Deletes are handled by a `removed` projection event that deletes the `doc_id` from the index. A row soft-deleted in SQLite (see [[SQLiteSchema-Part01]]) triggers an index delete so it no longer appears in search.

# Consistency with SQLite

The index is eventually consistent with SQLite by design, but the consistency window is bounded and the authority is clear:

- A write is visible in SQLite immediately; it appears in search after the projection event is processed (typically milliseconds).
- A read of search results ALWAYS re-checks the row in SQLite via the RepositoryLayer; a result whose row is gone or soft-deleted is dropped.
- If the index process crashes, the next write re-indexes the changed row; the index never becomes the longer-term authority. No reconciliation job is required for correctness, only for staleness cleanup (Part 03).

# The Write Path Rules

- Indexing MUST NOT block the SQLite commit. The projection is asynchronous; a slow index writer never delays the state write.
- Indexing MUST filter by `workspace_id` on both write and read.
- Artifact text extraction MUST happen in the backend (Rust), never by shipping blob bytes to the frontend for indexing.
- Encrypted `settings` values and any secret field MUST be excluded from the `body` before indexing.
- A failed index write MUST be logged and retried via the rebuild path, not silently dropped.

# Invariants

```text
Indexing trails SQLite by one projection event, never races it.
Search results are re-checked against SQLite before display.
Soft-deleted rows are removed from the index.
Indexing never blocks the SQLite commit.
Artifact text extraction happens in the backend.
Secrets are excluded from the indexed body.
A failed index write is retried via rebuild, not dropped silently.
```

# AI Notes

Do not make the SQLite commit wait for the index write. If the index writer is slow, the user's state write should not stall. The projection is async; the small consistency window is acceptable and bounded.

Do not index a blob by shipping it to the frontend. Text extraction (especially for code and markdown) belongs in the Rust backend where the artifact store is local. Shipping bytes to TypeScript defeats the thin-backend principle.

Do not let a soft-deleted row linger in the index. A `removed` projection event must delete its `doc_id`; otherwise search surfaces "ghost" results that the SQLite re-check then drops, wasting reads and confusing the user.

Do not treat a crashed indexer as data loss. The index is derived; the rebuild path in Part 03 reconstructs it from SQLite. Log, retry, rebuild — never panic.

# Related Documents

- [[08-database/README]]
- [[SearchIndex-Part01]]
- [[SearchIndex-Part03]]
- [[SearchIndex-Diagrams]]
- [[RepositoryLayer-Part04]]
- [[EventBus-Part02]]
- [[SQLiteSchema-Part01]]
- [[SQLiteSchema-Part04]]
- [[Encryption-Part01]]
