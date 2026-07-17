---
title: Planning Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - planning
related:
  - "[[10-ai-system/README]]"
  - "[[Planning-Part02]]"
---

# Planning Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Plan Types
Part 02 - Goal Decomposition and Phase/Task Hierarchy
Part 03 - Dependencies, Ordering, and Parallelism
Part 04 - Replanning and Dynamic Growth
Part 05 - Implementation Checklist and Future Expansion

# Purpose

Planning defines how Eulinx turns a User Goal into an executable structure of Phases, Tasks, and Workers. It is the first AI step after a goal is received and before any artifact is built.

# Philosophy

A goal is too large for one Worker or one context window. Planning breaks it into scoped, context-isolated units so each Worker receives only what it needs. This protects the context window and reduces token cost.

# Plan Types

- Project Plan: top-level decomposition owned by the Root Orchestrator.
- Phase Plan: decomposition of one phase owned by a Phase Orchestrator.
- Task Plan: step list for one task owned by a Task Orchestrator.
- Worker Sub-plan: a Worker MAY further decompose its task and request sub-workers.

# Output of Planning

Planning produces a tree of plan nodes. Each node has: intent, scope, owner orchestrator, estimated subtasks, dependencies, and a budget allocation. The plan is stored, not just held in memory.

# Related Documents

- [[Planning-Part02]]
- [[AIArchitecture-Part02]]
- [[01-core-concepts/Task/Task-Part01]]
