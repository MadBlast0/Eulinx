---
title: VectorMemory - Part 01
status: draft
version: 1.0
tags: [memory, vector-memory]
related:
  - "[[MemoryManager-Part04]]"
---

# VectorMemory - Part 01

## Document Index

Part 01 - Purpose, Embeddings, and Vector Records
Part 02 - Indexing Pipeline and Freshness
Part 03 - Hybrid Retrieval and Ranking
Part 04 - Safety, Implementation Checklist, and Future Expansion

# Purpose

VectorMemory enables semantic retrieval over memory, artifacts, documentation, and knowledge base chunks.

VectorMemory helps Workers find relevant context even when exact keywords do not match.

# Vector Record

```ts
type VectorMemoryRecord = {
  id: string;
  sourceId: string;
  sourceType: "memory" | "artifact" | "document" | "file";
  workspaceId: string;
  embeddingModel: string;
  chunkText: string;
  vectorRef: string;
  metadata: Record<string, unknown>;
};
```

# AI Notes

Vector search finds candidates. It does not decide whether a Worker is allowed to read them.

