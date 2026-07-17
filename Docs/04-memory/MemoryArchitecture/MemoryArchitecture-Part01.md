---
title: MemoryArchitecture Specification - Part 01
status: draft
version: 1.0
tags:
  - memory
  - memory-architecture
related:
  - "[[04-memory/README]]"
  - "[[MemoryManager-Part01]]"
---

# MemoryArchitecture Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Memory Layers
Part 02 - Scope Model, Ownership, and Access
Part 03 - Storage, Indexing, and Retrieval
Part 04 - Safety, Retention, and Implementation Checklist

# Purpose

MemoryArchitecture defines the complete memory model for Eulinx.

It explains which kinds of memory exist, who owns them, how they are retrieved, and how they are safely injected into Workers.

# Philosophy

Memory should make Workers more capable, not more confused.

The goal is not to remember everything. The goal is to preserve the useful facts, decisions, artifacts, and context that help future work.

# Memory Layers

```text
Workspace Memory
Project Memory
Session Memory
Execution Memory
Orchestrator Memory
Task Memory
Worker Memory
Temporary Memory
Long-Term Memory
Vector Memory
Knowledge Base
Replay Memory
```

# Memory Is Not

Memory is not:

- a raw transcript dump
- a hidden global prompt
- unrestricted cross-worker shared state
- a replacement for artifacts
- automatically safe to inject

# Related Documents

- [[MemoryArchitecture-Part02]]
- [[WorkspaceMemory-Part01]]
- [[WorkerMemory-Part01]]

