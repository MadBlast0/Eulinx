---
title: VectorMemory - Part 02
status: draft
version: 1.0
tags: [memory, vector-memory, indexing]
related:
  - "[[VectorMemory-Part01]]"
---

# VectorMemory - Part 02

## Document Index

Part 01 - Purpose, Embeddings, and Vector Records
Part 02 - Indexing Pipeline and Freshness
Part 03 - Hybrid Retrieval and Ranking
Part 04 - Safety, Implementation Checklist, and Future Expansion

# Indexing Pipeline

```text
source
  -> parse
  -> chunk
  -> classify sensitivity
  -> embed
  -> store vector
  -> link metadata
```

# Freshness

Indexes become stale when:

- source file changes
- artifact superseded
- memory deleted
- permission revoked
- embedding model changed

Eulinx should track index freshness.

