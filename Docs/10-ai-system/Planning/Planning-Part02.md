---
title: Planning Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - planning
  - decomposition
related:
  - "[[Planning-Part01]]"
  - "[[Planning-Part03]]"
---

# Planning Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Plan Types
Part 02 - Goal Decomposition and Phase/Task Hierarchy
Part 03 - Dependencies, Ordering, and Parallelism
Part 04 - Replanning and Dynamic Growth
Part 05 - Implementation Checklist and Future Expansion

# Decomposition

Given "Build a SaaS application," the Root Orchestrator produces phases such as Authentication, Database, Frontend, Backend API, and Testing. Each phase becomes a Phase Orchestrator.

Each Phase Orchestrator decomposes its phase into tasks. For Authentication: research libraries, design schema, create tables, implement JWT, middleware, routes, tests.

# Context Isolation

Each decomposed unit owns its own context. Database workers never receive frontend memory. Frontend workers never receive testing memory. This is the core token-saving mechanism of the hierarchy.

# Checklists

Planning SHOULD emit an explicit checklist per task so progress is observable and so the Refinement Loop has clear acceptance criteria. Checklists become the basis for the Judge's criteria.

# Worker Spawning from Plan

When a task is ready, the owning Orchestrator requests Workers from the runtime `WorkerSpawner`. The plan node records the spawned worker ids and their status.

# Related Documents

- [[AIArchitecture-Part02]]
- [[RefinementLoop-Part01]]
- [[02-runtime/WorkerSpawner/WorkerSpawner-Part01]]
- [[01-core-concepts/Orchestrator/Orchestrator-Part01]]
