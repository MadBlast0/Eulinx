---
title: WorkerMemory Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-memory
related:
  - "[[WorkerMemory-Part01]]"
---

# WorkerMemory Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and Memory Model
Part 02 - Working Memory, Task Memory, and Summaries
Part 03 - Context Injection and Retrieval Rules
Part 04 - Retention, Redaction, and Safety
Part 05 - Events, UI, and Implementation Checklist

# Working Memory

Working memory contains short-lived information the Worker needs while active.

Examples:

- current objective
- current files inspected
- latest terminal state
- recent errors
- next planned step

# Task Memory

Task memory contains facts that should survive Worker replacement.

Examples:

- discovered dependency
- failed approach
- test command
- file ownership decision
- artifact references

# Summaries

Worker summaries should be created:

- periodically
- before termination
- before handoff
- after important artifact creation
- after failure

# Summary Shape

```text
Objective:
Progress:
Files touched:
Artifacts created:
Open blockers:
Recommended next step:
Warnings:
```

# AI Notes

Summaries should preserve operational facts, not vague praise or generic status.

# Related Documents

- [[WorkerMemory-Part03]]
- [[WorkerTermination-Part03]]

