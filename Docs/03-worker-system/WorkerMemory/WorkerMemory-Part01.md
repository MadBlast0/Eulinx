---
title: WorkerMemory Specification - Part 01
status: draft
version: 1.0
tags:
  - worker-system
  - worker-memory
  - memory
related:
  - "[[MemoryManager-Part01]]"
  - "[[WorkerLifecycle-Part01]]"
---

# WorkerMemory Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and Memory Model
Part 02 - Working Memory, Task Memory, and Summaries
Part 03 - Context Injection and Retrieval Rules
Part 04 - Retention, Redaction, and Safety
Part 05 - Events, UI, and Implementation Checklist

# Purpose

WorkerMemory defines what a Worker remembers during and after execution.

Worker memory is not global memory. It belongs to a Worker, its Task, and its Session context.

# Philosophy

Workers should have enough memory to continue useful work, but not so much memory that they receive irrelevant or unsafe context.

Worker memory should be:

- scoped
- temporary by default
- summarizable
- linked to artifacts
- safe to hand off
- visible in replay

# Worker Memory Types

```text
working_memory
terminal_summary
task_notes
tool_results
artifact_refs
blockers
decisions
handoff_summary
```

# Worker Memory Object

```ts
type WorkerMemoryRecord = {
  id: string;
  workerId: string;
  taskId?: string;
  workspaceId: string;
  type: string;
  content: string;
  source: "worker" | "runtime" | "tool" | "orchestrator";
  sensitivity: "public" | "internal" | "sensitive" | "secret";
  createdAt: string;
};
```

# AI Notes

Do not give every Worker every memory.

Worker memory should be local, scoped, and summarized upward only when useful.

# Related Documents

- [[WorkerMemory-Part02]]
- [[MemoryManager-Part01]]

