---
title: SearchIndex Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - search-index
  - query
related:
  - "[[08-database/README]]"
  - "[[SearchIndex-Part01]]"
  - "[[SearchIndex-Part02]]"
  - "[[RepositoryLayer-Part02]]"
---

# SearchIndex Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Indexed Surfaces, and the Document Model
Part 02 - The Ingestion Pipeline, Consistency with SQLite, and the Write Path
Part 03 - The Query Path, Result Mapping, and the Rebuild Path

# The Query Path

A search request flows from the frontend (over IPC) to the SearchIndex query method:

1. The query arrives with a `workspace_id` (mandatory), a `surface` filter (optional), a `scope` filter (for memory), and the search string.
2. The method builds a Tantivy query combining the text query with the mandatory `workspace_id` term and the optional surface/scope terms.
3. Tantivy returns ranked hits with `doc_id`, `title`, `surface`, and a snippet.
4. For each hit, the method calls the RepositoryLayer to fetch the real row from SQLite (re-checking existence and soft-delete status).
5. Only rows that exist and are not soft-deleted are returned, enriched with the SQLite metadata and the snippet.
6. Results are paginated with a cursor, like other list reads in [[RepositoryLayer-Part05]].

The ranking uses Tantivy's BM25 with recency as a tiebreaker via `updated_at`, so a relevant recent message outranks an equally relevant old one. A memory query additionally applies the caller's permitted scope filter (see [[SQLiteSchema-Part05]]) so a Worker cannot search memory outside its scopes.

# Result Mapping

Each returned result carries enough to render without a second round-trip where possible:

- `doc_id` and the parsed SQLite `row_id`
- `surface` (so the UI routes to the right panel: chat, workflow, artifact, prompt, memory)
- `title` and `snippet` (the highlighted matched passage)
- `updated_at` for display
- a deep-link reference the UI uses to open the exact row

The actual content is fetched from SQLite on open, not from the index, preserving the "SQLite is authority" rule.

# The Rebuild Path

Because the index is derived, it MUST be rebuildable from SQLite. The rebuild:

1. Opens a fresh Tantivy index (or clears the existing one).
2. Streams every indexed surface's rows from SQLite in workspace-scoped batches.
3. Extracts text (artifacts from the store) and builds `Document`s, writing them via the index writer in batches.
4. Records a `search_index_version` marker so a partial rebuild that crashed can resume or be discarded.
5. On completion, the index is consistent with SQLite as of the last committed row; subsequent projection events keep it current.

Rebuild is triggered on: a missing/corrupt index at startup, a schema change that alters indexed fields, or a detected staleness beyond a threshold. It is also the recovery path when the indexer has fallen behind after a crash.

# Invariants

```text
Every query filters by workspace_id; no cross-workspace search occurs.
Search results are re-checked against SQLite and soft-delete filtered.
Memory search applies the caller's permitted scope filter.
Results carry a deep-link; content is fetched from SQLite on open.
The index is fully rebuildable from SQLite in workspace-scoped batches.
A rebuild that crashed can resume or be discarded via its version marker.
```

# AI Notes

Do not return index hits without re-checking SQLite. The index may lag a delete; the re-check is what prevents ghost results. It is a mandatory step, not an optimization.

Do not let a memory search use a caller-supplied scope. The RepositoryLayer computes the permitted scopes from the caller's identity; trusting a supplied scope leaks memory across boundaries, the bug [[SQLiteSchema-Part05]] forbids.

Do not treat a corrupt index as a catastrophe. It is a derived store; rebuild from SQLite. The rebuild path exists precisely so an index failure is a non-event for user data.

Do not rebuild by shipping every blob to the frontend for extraction. Extraction is backend-side (Part 02); rebuild does the same, in batches, against the local artifact store.

# Related Documents

- [[08-database/README]]
- [[SearchIndex-Part02]]
- [[SearchIndex-Diagrams]]
- [[RepositoryLayer-Part02]]
- [[RepositoryLayer-Part05]]
- [[SQLiteSchema-Part04]]
- [[SQLiteSchema-Part05]]
- [[VectorStore-Part01]]
