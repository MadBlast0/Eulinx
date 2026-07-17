---
title: MemorySpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - memory
related:
  - "[[01-core-concepts/README]]"
  - "[Memory-Part01]"
  - "[Memory-Part01]"
---

# Memory Specification (Part 02)

## Memory Lifecycle

Created
↓
Indexed
↓
Available
↓
Retrieved
↓
Updated
↓
Archived
↓
Deleted (optional)

---

## Retrieval

The Runtime retrieves memory using:

- Semantic similarity
- Keywords
- Tags
- Scope
- Recency
- Relevance

Only relevant memory SHOULD be injected into Worker context.

---

## Scopes

Memory scopes:

- Worker
- Task
- Session
- Workspace
- Global (system only)

Lower scopes expire sooner than higher scopes.

---

## Indexing

Memory SHOULD support:

- Embeddings
- Metadata
- Tags
- Artifact references
- Source tracking

---

## Context Injection

Before execution the Runtime selects:

- Relevant memories
- Related artifacts
- Previous decisions
- Important summaries

The Runtime MUST avoid unnecessary context expansion.

---

## AI Notes

Memory retrieval should optimize quality while minimizing token usage.
Memory is a runtime capability, not a prompt engineering technique.

