---
title: WorkerMemory Specification - Part 06
status: draft
version: 1.0
tags:
  - worker-system
  - worker-memory
  - future
related:
  - "[[WorkerMemory-Part01]]"
---

# WorkerMemory Specification (Part 06)

## Document Index

Part 01 - Purpose, Scope, and Memory Model
Part 02 - Working Memory, Task Memory, and Summaries
Part 03 - Context Injection and Retrieval Rules
Part 04 - Retention, Redaction, and Safety
Part 05 - Events, UI, and Implementation Checklist
Part 06 - Handoff, Promotion, Forgetting, and Future Expansion

# Handoff

Worker memory should become a handoff package when a Worker is replaced or terminated before completion.

# Promotion

Worker memory may be promoted to Task, Session, or Workspace memory only when it contains durable value.

# Forgetting

Worker memory should be forgettable when:

- it is temporary
- it is sensitive
- it is stale
- it came from failed reasoning
- the user requests deletion

# Final AI Notes

Remembering everything is not intelligence. Keeping the right memory at the right scope is intelligence.

# Related Documents

- [[WorkerMemory-Part01]]
- [[MemoryManager-Part01]]

