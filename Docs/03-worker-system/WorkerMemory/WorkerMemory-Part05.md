---
title: WorkerMemory Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-memory
  - implementation
related:
  - "[[WorkerMemory-Part01]]"
---

# WorkerMemory Specification (Part 05)

## Document Index

Part 01 - Purpose, Scope, and Memory Model
Part 02 - Working Memory, Task Memory, and Summaries
Part 03 - Context Injection and Retrieval Rules
Part 04 - Retention, Redaction, and Safety
Part 05 - Events, UI, and Implementation Checklist

# Events

```text
worker.memory.created
worker.memory.updated
worker.memory.summarized
worker.memory.redacted
worker.memory.handoff_created
worker.memory.deleted
```

# UI

Worker memory UI should show:

- current Worker summary
- recent important notes
- artifacts referenced
- handoff package
- redaction warnings

# Implementation Checklist

```text
[ ] Define WorkerMemoryRecord
[ ] Add Worker memory scopes
[ ] Add summarization
[ ] Add handoff package
[ ] Add redaction
[ ] Add ContextManager integration
[ ] Add UI panel
[ ] Add tests for memory isolation
```

# Final AI Notes

Worker memory is not a personality.

It is operational continuity for temporary AI terminal workers.

# Related Documents

- [[WorkerMemory-Part01]]
- [[MemoryManager-Part01]]

