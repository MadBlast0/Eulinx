---
title: MemoryArchitecture Specification - Part 03
status: draft
version: 1.0
tags:
  - memory
  - retrieval
related:
  - "[[MemoryArchitecture-Part02]]"
---

# MemoryArchitecture Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Memory Layers
Part 02 - Scope Model, Ownership, and Access
Part 03 - Storage, Indexing, and Retrieval
Part 04 - Safety, Retention, and Implementation Checklist

# Storage

Memory may be stored as:

- structured SQLite rows
- artifact references
- vector index entries
- summary documents
- knowledge base chunks

# Retrieval

Retrieval modes:

```text
by_scope
by_task
by_worker
by_artifact
by_keyword
by_vector_similarity
hybrid
```

# Ranking

Ranking should consider:

- scope closeness
- relevance
- recency
- importance
- sensitivity
- source reliability
- token cost

# Related Documents

- [[MemoryArchitecture-Part04]]
- [[VectorMemory-Part01]]

