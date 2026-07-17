---
title: MemoryArchitecture Specification - Part 02
status: draft
version: 1.0
tags:
  - memory
  - scope
related:
  - "[[MemoryArchitecture-Part01]]"
---

# MemoryArchitecture Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Memory Layers
Part 02 - Scope Model, Ownership, and Access
Part 03 - Storage, Indexing, and Retrieval
Part 04 - Safety, Retention, and Implementation Checklist

# Scope Model

Memory is scoped by ownership and relevance.

```text
Workspace
  Project
    Session
      Execution
        Orchestrator
          Task
            Worker
```

# Ownership

Every memory record MUST have:

- Workspace id
- scope type
- scope id
- source
- sensitivity
- retention policy

# Access

Access requires:

- Workspace match
- permission check
- sensitivity check
- relevance check
- context budget check

# Promotion

Memory can move upward only through summarization or explicit promotion.

Example:

```text
Worker observation -> Task summary -> Workspace memory
```

# Related Documents

- [[MemoryArchitecture-Part03]]
- [[MemoryRules-Part01]]

