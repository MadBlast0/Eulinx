---
title: WorkerMemory - Part 01
status: draft
version: 1.0
tags: [memory, worker-memory]
related:
  - "[[WorkerMemory-Part01]]"
  - "[[MemoryManager-Part01]]"
---

# WorkerMemory - Part 01

## Document Index

Part 01 - Purpose, Scope, and Worker-Owned Memory
Part 02 - Handoff, Summaries, and Promotion
Part 03 - Safety, UI, and Implementation Checklist

# Purpose

WorkerMemory defines the memory available to one Worker during its lifetime and the memory created from that Worker after it stops.

Worker memory is local, temporary by default, and tied to a task. It should help the Worker stay coherent without becoming a permanent personality.

# Scope

WorkerMemory may include:

- current objective
- working notes
- terminal summary
- files inspected
- tools used
- blockers
- artifacts created
- pending next step

WorkerMemory MUST belong to exactly one Worker and one Workspace.

# Runtime Rule

WorkerMemory is accessed through MemoryManager and ContextManager. Workers do not directly write trusted durable memory.

# AI Notes

Do not treat WorkerMemory as a character profile. It is operational memory for a temporary AI terminal process.

