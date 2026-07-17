---
title: VectorStore Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - vector-store
  - embedding
related:
  - "[[08-database/README]]"
  - "[[VectorStore-Part01]]"
  - "[[RepositoryLayer-Part04]]"
  - "[[04-memory/VectorMemory/VectorMemory-Part01]]"
---

# VectorStore Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the LanceDB Layout, and the Record Model
Part 02 - The Embedding Pipeline, Consistency, and the Write Path
Part 03 - The Semantic Query Path, Hybrid Retrieval, and the Rebuild Path

# The Embedding Pipeline

VectorStore is updated through the same EventBus→DB projection that feeds SQLite and the search index (see [[RepositoryLayer-Part04]]). The pipeline per source change:

1. The RepositoryLayer commits the SQLite change and publishes the event.
2. The VectorStore projection handler receives it (e.g. `memory_entry.created`, `artifact.verified`, `message.created`).
3. It loads the source text: from the SQLite row, or from the artifact store for artifact/file kinds.
4. It splits the text into chunks at a model-appropriate boundary (respecting token limits and passage coherence).
5. It calls the embedding model (backend-side; the model may be local via Ollama/LM Studio or a configured provider) to produce a vector per chunk.
6. It writes each `(chunk_text, vector, source_id, source_type, workspace_id, metadata)` row into the table for that `embedding_model`.
7. It records `updated_at` so staleness is detectable.

Deletes and soft-deletes trigger removal of the source's vectors from the table. A memory entry whose `expires_at` passes is pruned from both SQLite and LanceDB.

# Consistency with SQLite

As with the search index, VectorStore trails SQLite by one projection event. The consistency rules:

- A source row is visible in SQLite immediately; its vectors appear after embedding completes (embedding is the slow step, so the window can be larger than for keyword indexing — acceptable because semantic search is best-effort).
- Retrieval always re-checks the source row in SQLite via the RepositoryLayer; a vector whose source was deleted is dropped before results are returned.
- If embedding fails (model unavailable), the failure is logged and queued for retry via the rebuild path; the source row remains correct in SQLite.

# The Write Path Rules

- Embedding MUST happen in the backend (Rust). The frontend never embeds; it sends text over IPC and receives just confirmation.
- Vectors MUST be written to the table matching the `embedding_model` of the embedder.
- `workspace_id` MUST be stored and filtered on write and read.
- Encrypted secrets MUST NOT be embedded; the projection excludes secret fields before chunking.
- A failed embed MUST be retried via rebuild, not silently dropped.

# Invariants

```text
Embedding trails SQLite by one projection event.
Retrieval re-checks the source row in SQLite before returning.
Embedding happens in the backend; the frontend never embeds.
Vectors go to the table matching their embedding_model.
workspace_id is stored and filtered on write and read.
Secrets are excluded from embedding input.
A failed embed is retried via rebuild, never dropped.
```

# AI Notes

Do not embed in the frontend. Embedding is a backend capability (local model or provider); shipping text to TypeScript to embed violates the thin-backend principle and exposes the model endpoint. The frontend sends text, the backend returns nothing but success.

Do not put vectors for two models in one table "to keep it simple". Similarity across models is undefined; the query embedder must match the table. Separate tables are the rule, not a preference.

Do not let a transient embedding failure drop the source from semantic search forever. Log, queue, and rebuild. The source is in SQLite; the vector is reproducible.

Do not embed encrypted secrets. They are ciphertext (unembeddable meaningfully) and embedding them leaks which rows hold secrets into a derived store. Exclude secret fields before chunking.

# Related Documents

- [[08-database/README]]
- [[VectorStore-Part01]]
- [[VectorStore-Part03]]
- [[VectorStore-Diagrams]]
- [[04-memory/VectorMemory/VectorMemory-Part01]]
- [[RepositoryLayer-Part04]]
- [[SearchIndex-Part02]]
- [[Encryption-Part01]]
