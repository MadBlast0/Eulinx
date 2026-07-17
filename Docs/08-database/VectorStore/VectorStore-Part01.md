---
title: VectorStore Specification - Part 01
status: draft
version: 1.0
tags:
  - database
  - vector-store
  - lancedb
related:
  - "[[08-database/README]]"
  - "[[04-memory/VectorMemory/VectorMemory-Part01]]"
  - "[[SQLiteSchema-Part05]]"
  - "[[SearchIndex-Part01]]"
---

# VectorStore Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the LanceDB Layout, and the Record Model
Part 02 - The Embedding Pipeline, Consistency, and the Write Path
Part 03 - The Semantic Query Path, Hybrid Retrieval, and the Rebuild Path

# Purpose

VectorStore owns Eulinx's semantic (similarity) search over memory, artifacts, documentation, and knowledge-base chunks. It is built on LanceDB, a columnar vector database that runs locally in the Rust backend. It answers "find content related to this idea even when the keywords do not match" — the capability SQLite and the Tantivy index (see [[SearchIndex-Part01]]) cannot provide.

Like the search index, VectorStore is a derived projection. SQLite and the artifact store hold the source content; LanceDB holds the embeddings and the references back to source rows. If LanceDB is lost or disagrees, it is rebuilt from SQLite, never the other way around.

# Core Philosophy

Semantic search is a derived view of meaning, not a store of record. Three principles:

**Source is SQLite.** The embedding references a `source_id` (a SQLite row id in `memory_entry`, `artifact`, `message`, or a knowledge chunk). The text lives in SQLite or the artifact store; the vector lives in LanceDB.

**Rebuildable.** Embeddings are expensive to compute but fully reproducible from source text. A missing or corrupt LanceDB table is a "rebuild and continue" event, not data loss.

**Complementary to keyword search.** VectorStore finds by meaning; Tantivy ([[SearchIndex-Part01]]) finds by keyword. They are combined in hybrid retrieval (Part 03), not used as alternatives that contradict each other.

# The LanceDB Layout

VectorStore uses one LanceDB dataset (table) per embedding model family, because vectors from different models are not comparable. Fields per row:

- `vector_id` — stable id, typically `source_type:source_id:chunk_index`.
- `source_id` — the SQLite row id the embedding derives from.
- `source_type` — one of `memory`, `artifact`, `message`, `document`, `file` (mirrors the [[04-memory/VectorMemory/VectorMemory-Part01]] source types).
- `workspace_id` — stored and filtered so semantic search never crosses Workspace boundaries.
- `embedding_model` — the model identity that produced the vector, used to pick the correct table.
- `chunk_text` — a short stored copy of the embedded passage (for snippet display and rebuild verification; the authoritative text remains in SQLite).
- `chunk_index` — which chunk of a multi-chunk source this vector represents.
- `metadata` — JSON carrying scope, scope_id, importance, and any retrieval filters.
- `vector` — the embedding array itself.

Multiple models mean multiple tables; a query specifies which `embedding_model` it expects, and the VectorStore routes to that table.

# Invariants

```text
SQLite/artifact store is the source; LanceDB holds vectors and references.
An embedding references a source_id that exists in SQLite.
Semantic search filters by workspace_id; no cross-Workspace retrieval.
Vectors from different models live in separate tables (not comparable).
LanceDB is fully rebuildable from source text.
VectorStore complements, not contradicts, keyword search.
```

# AI Notes

Do not store the authoritative text only in LanceDB. The `chunk_text` is a convenience copy for snippets and rebuild checks; the real content is in SQLite or the artifact store. If LanceDB is the only copy, a rebuild cannot reproduce it.

Do not mix vectors from two embedding models in one table. Cosine similarity across models is meaningless; a query embedder must match the table's model. Separate tables keyed by `embedding_model` enforce this.

Do not let semantic search cross Workspace boundaries. `workspace_id` is stored on every row and filtered on every query, exactly as in [[SearchIndex-Part01]].

Do not treat a lost vector table as data loss. It is derived; rebuild from source text. The cost is compute, not user data.

# Related Documents

- [[08-database/README]]
- [[VectorStore-Part02]]
- [[VectorStore-Diagrams]]
- [[04-memory/VectorMemory/VectorMemory-Part01]]
- [[04-memory/KnowledgeBase/KnowledgeBase-Part01]]
- [[SQLiteSchema-Part05]]
- [[SearchIndex-Part01]]
- [[Encryption-Part01]]
