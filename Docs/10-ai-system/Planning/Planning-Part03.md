---
title: Planning Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - planning
  - dependencies
related:
  - "[[Planning-Part02]]"
  - "[[Planning-Part04]]"
---

# Planning Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Plan Types
Part 02 - Goal Decomposition and Phase/Task Hierarchy
Part 03 - Dependencies, Ordering, and Parallelism
Part 04 - Replanning and Dynamic Growth
Part 05 - Implementation Checklist and Future Expansion

# Dependencies

Plan nodes declare dependencies. A task cannot start until its dependencies are verified complete. Dependencies are recorded as edges in the plan graph and enforced by the runtime `Scheduler`.

# Ordering

Within a phase, some tasks are sequential (design schema before create tables) and some are parallel (frontend and backend can proceed independently once interfaces are agreed). Planning labels each task with its ordering constraints.

# Parallelism

Parallel tasks become parallel Workers, subject to the concurrency limit of the plan tier. The AI subsystem proposes parallelism; the runtime enforces it.

# Critical Path

Planning SHOULD identify the critical path so the UI can show which tasks gate overall progress. This feeds the upward progress aggregation.

# Related Documents

- [[Planning-Part02]]
- [[02-runtime/Scheduler/Scheduler-Part01]]
- [[06-workflow-engine/README]]
