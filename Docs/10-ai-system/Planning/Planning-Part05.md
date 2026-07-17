---
title: Planning Specification - Part 05
status: draft
version: 1.0
tags:
  - ai-system
  - planning
  - implementation
related:
  - "[[Planning-Part04]]"
---

# Planning Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, and Plan Types
Part 02 - Goal Decomposition and Phase/Task Hierarchy
Part 03 - Dependencies, Ordering, and Parallelism
Part 04 - Replanning and Dynamic Growth
Part 05 - Implementation Checklist and Future Expansion

# Implementation Checklist

1. Goal intake with user intent and constraints.
2. Root decomposition into phases with budgets.
3. Phase decomposition into tasks with checklists.
4. Dependency and ordering annotation.
5. Worker spawn requests per ready task.
6. Replanning hook on discovery or failure.
7. Plan revision persistence and event emission.

# Future Expansion

- Template plans for common project types.
- Learned decomposition patterns from past runs.
- User-editable plans before execution (approval gate).
- Critical-path-aware budget allocation.

# AI Notes

Do not try to plan the entire project in one giant prompt. Decompose hierarchically so each model call stays small and context-isolated.

Do not let a Worker rewrite the whole project plan. Replanning is scoped to the owning orchestrator.

Do not skip checklists. They are the acceptance criteria the Judge and Verifier rely on.

# Related Documents

- [[Planning-Part01]]
- [[AIArchitecture-Part02]]
- [[RefinementLoop-Part01]]
