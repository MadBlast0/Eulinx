---
title: WorkerMemory Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-memory
  - context
related:
  - "[[ContextManager-Part01]]"
---

# WorkerMemory Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and Memory Model
Part 02 - Working Memory, Task Memory, and Summaries
Part 03 - Context Injection and Retrieval Rules
Part 04 - Retention, Redaction, and Safety
Part 05 - Events, UI, and Implementation Checklist

# Retrieval Rules

Worker memory retrieval should consider:

- current Task
- parent Orchestrator
- active Workflow node
- artifact references
- permission scope
- sensitivity
- recency
- relevance

# Context Injection

Worker memory should be injected through ContextManager, not directly by MemoryManager.

The injection package should include:

- brief task memory
- relevant artifact references
- previous Worker handoff if any
- constraints
- open blockers

# Do Not Inject

Avoid injecting:

- unrelated Worker logs
- stale failed plan versions
- secret values
- huge terminal transcripts
- unrelated project history

# AI Notes

Context injection is where cheap models can get confused. Keep Worker memory concise and task-specific.

# Related Documents

- [[WorkerMemory-Part04]]
- [[ContextManager-Part01]]

