---
title: VectorStore Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - vector-store
  - semantic-search
related:
  - "[[08-database/README]]"
  - "[[VectorStore-Part01]]"
  - "[[VectorStore-Part02]]"
  - "[[SearchIndex-Part03]]"
---

# VectorStore Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the LanceDB Layout, and the Record Model
Part 02 - The Embedding Pipeline, Consistency, and the Write Path
Part 03 - The Semantic Query Path, Hybrid Retrieval, and the Rebuild Path

# The Semantic Query Path

A semantic search request flows from the frontend (over IPC) to the VectorStore query method:

1. The request carries a `workspace_id` (mandatory), a query string, an optional `embedding_model` (defaults to the workspace's configured model), an optional `source_type` filter, and an optional `scope` filter (for memory).
2. The backend embeds the query string with the matching model.
3. It queries the LanceDB table for that model, returning the top-K nearest neighbors by cosine similarity.
4. For each neighbor, it re-checks the source row in SQLite via the RepositoryLayer (existence, soft-delete, and scope permission for memory).
5. Only verified, permitted rows are returned, enriched with `chunk_text` snippet and source metadata.
6. Results are paginated with a cursor.

A memory query additionally applies the caller's permitted scope filter (see [[SQLiteSchema-Part05]]), so a Worker cannot semantically search memory outside its scopes.

# Hybrid Retrieval

VectorStore and the Tantivy index ([[SearchIndex-Part01]]) are combined for best results:

- Keyword candidates come from Tantivy (exact and phrase matches rank high).
- Semantic candidates come from LanceDB (meaning matches rank by similarity).
- The two candidate sets are merged with reciprocal rank fusion or a weighted score, then re-checked against SQLite, then returned.
- Hybrid retrieval is what lets "find where we discussed the auth bug" match both a message containing "auth" and a memory about session timeouts that never says "auth" explicitly.

The merge happens in a retrieval coordinator that owns both stores; neither store knows about the other.

# The Rebuild Path

VectorStore is derived and MUST be rebuildable from source text in SQLite and the artifact store:

1. For each `embedding_model` table, open a fresh LanceDB table (or clear the existing one).
2. Stream source rows from SQLite in workspace-scoped batches (memory entries, artifacts, messages, knowledge chunks).
3. Extract and chunk text in the backend; embed with the model; write vectors.
4. Record a `vector_store_version` marker per model so a partial rebuild can resume or be discarded.
5. On completion, the table is consistent with SQLite as of the last committed source row; the projection keeps it current.

Rebuild triggers: missing/corrupt LanceDB at startup, an embedding-model change (old vectors are invalid), or detected staleness. It is the recovery path after embedding-backend outages.

# Invariants

```text
Every semantic query filters by workspace_id.
Retrieval re-checks the source row in SQLite and applies memory scope filters.
Hybrid retrieval fuses Tantivy and LanceDB then re-checks SQLite.
Vectors are rebuilt per embedding_model from source text.
A rebuild that crashed can resume or be discarded via its version marker.
The two stores are independent; a coordinator fuses them.
```

# AI Notes

Do not return semantic hits without re-checking SQLite. The vector may reference a deleted or soft-deleted source; the re-check drops it. This mirrors the search-index rule and is mandatory.

Do not let a memory semantic query use a caller-supplied scope. The RepositoryLayer computes permitted scopes; trusting a supplied scope leaks memory, the bug [[SQLiteSchema-Part05]] forbids.

Do not mix a query embedding from one model against a table built by another. Cosine similarity is meaningless across models. Route by `embedding_model` before querying.

Do not treat a missing LanceDB table as data loss. It is derived; rebuild from SQLite and the artifact store. The cost is embedding compute, recoverable and bounded.

# Related Documents

- [[08-database/README]]
- [[VectorStore-Part02]]
- [[VectorStore-Diagrams]]
- [[04-memory/VectorMemory/VectorMemory-Part01]]
- [[04-memory/KnowledgeBase/KnowledgeBase-Part01]]
- [[SearchIndex-Part01]]
- [[SearchIndex-Part03]]
- [[SQLiteSchema-Part05]]
- [[RepositoryLayer-Part04]]
