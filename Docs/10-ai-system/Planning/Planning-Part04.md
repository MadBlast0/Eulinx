---
title: Planning Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - planning
  - replanning
related:
  - "[[Planning-Part03]]"
  - "[[Planning-Part05]]"
---

# Planning Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Plan Types
Part 02 - Goal Decomposition and Phase/Task Hierarchy
Part 03 - Dependencies, Ordering, and Parallelism
Part 04 - Replanning and Dynamic Growth
Part 05 - Implementation Checklist and Future Expansion

# Replanning

Plans are not fixed. When a Worker discovers a missing step, an unexpected issue, or a better approach, the owning Orchestrator MAY rewrite its slice of the plan. Replanning is a first-class capability, not an error condition.

# Dynamic Growth

Because Workers can spawn sub-workers and Orchestrators can add phases, the graph literally grows while running. The plan tree and the node graph stay in sync through runtime events.

# Bounding Replanning

Replanning MUST stay within the orchestrator's scope and budget. A Phase Orchestrator cannot silently re-scope the whole project; it reports changes upward.

# Plan Versioning

Each significant plan change SHOULD create a new plan revision so Replay and history can show how the plan evolved.

# Related Documents

- [[Planning-Part02]]
- [[AIArchitecture-Part02]]
- [[04-memory/Replay/Replay-Part01]]
- [[RefinementLoop-Part06]]
