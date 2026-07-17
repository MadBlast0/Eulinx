---
title: MemoryManager Specification - Part 03
status: draft
version: 1.0
tags:
  - runtime
  - memory-manager
  - retrieval
related:
  - "[[MemoryManager-Part02]]"
  - "[[ContextManager-Part01]]"
---

# MemoryManager Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Responsibilities
Part 02 - Memory Types, Stores, and Scope Boundaries
Part 03 - Read, Write, Summarization, and Retrieval
Part 04 - Vector Memory, Knowledge Base, and Indexing
Part 05 - Safety, Permissions, Retention, and Redaction
Part 06 - Implementation Checklist, Events, and Future Expansion

# Purpose

This part defines how memory is written, retrieved, summarized, and prepared for context.

# Write Flow

```text
Runtime object produces memory candidate
  |
  v
MemoryManager validates scope
  |
  v
PermissionManager checks write access
  |
  v
MemoryManager stores record
  |
  v
EventBus emits memory.created
```

# Memory Write Request

```ts
type MemoryWriteRequest = {
  workspaceId: string;
  scopeType: string;
  scopeId: string;
  type: string;
  content: string;
  source: string;
  sensitivity?: string;
  ttl?: string;
};
```

# Read Flow

```text
ContextManager requests memory
  |
  v
MemoryManager finds candidates
  |
  v
PermissionManager filters access
  |
  v
MemoryManager ranks relevance
  |
  v
ContextManager receives selected memory
```

# Retrieval Modes

Eulinx SHOULD support:

```text
by_scope
by_id
by_time
by_relevance
by_artifact
by_task
by_worker
by_query
hybrid
```

# Summarization

Summaries are needed because raw memory grows too large.

Summaries SHOULD preserve:

- decisions
- constraints
- user preferences
- unresolved issues
- final results
- links to source records

Summaries MUST NOT silently discard important safety or approval information.

# Retrieval Ranking

Memory ranking SHOULD consider:

- scope closeness
- recency
- relevance
- importance
- source reliability
- sensitivity
- token cost
- user pinning

# AI Notes

Do not retrieve memory only by text similarity.

Scope and permissions matter as much as semantic relevance.

# Related Documents

- [[MemoryManager-Part04]]
- [[ContextManager-Part01]]
- [[Permission-Part01]]

