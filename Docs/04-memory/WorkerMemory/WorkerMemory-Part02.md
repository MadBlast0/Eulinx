---
title: WorkerMemory - Part 02
status: draft
version: 1.0
tags: [memory, worker-memory, handoff]
related:
  - "[[WorkerMemory-Part01]]"
  - "[[WorkerTermination-Part03]]"
---

# WorkerMemory - Part 02

## Document Index

Part 01 - Purpose, Scope, and Worker-Owned Memory
Part 02 - Handoff, Summaries, and Promotion
Part 03 - Safety, UI, and Implementation Checklist

# Handoff

When a Worker stops, Eulinx should create a handoff memory package if the task may continue.

```text
Worker notes
  -> summarize
  -> link artifacts
  -> list blockers
  -> recommend next action
  -> pass to replacement Worker or parent Orchestrator
```

# Promotion

WorkerMemory can be promoted to TaskMemory or WorkspaceMemory only through review or summarization.

Good promotion candidates:

- stable project rule
- discovered test command
- important blocker
- architectural decision

Bad candidates:

- raw terminal spam
- failed speculation
- sensitive output
- stale instructions

# AI Notes

Summaries should be factual and compact. A lower-cost model should be able to read the handoff and continue work without rereading every log.

