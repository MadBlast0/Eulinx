---
title: Tasks Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - tasks
related:
  - "[[Tasks-Part01]]"
  - "[[Tasks-Part03]]"
  - "[[Orchestrator-Part01]]"
---

# Tasks Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Task Object
Part 02 - Natural-Language Capture and Decomposition
Part 03 - Assignment, Execution, and Evidence
Part 04 - Recurring Tasks and Scheduling
Part 05 - Progress Aggregation and AI Notes

# Natural-Language Capture

The user types a goal in plain language. A capture agent (an orchestrator worker) decomposes the goal into a checklist of subtasks. Each subtask becomes a Task with a title, description, and inferred priority.

Decomposition MUST be reviewable: the user sees the proposed checklist before execution and may edit, split, merge, or delete subtasks. The system MUST NOT silently spawn unbounded work from a vague goal.

# Decomposition Rules

A subtask is a unit of executable work. Good decomposition:

- gives each task a single clear outcome
- names the artifact or output it should produce
- declares dependencies between tasks
- avoids "do the whole project" as one task

The orchestrator may rewrite the plan as execution reveals new needs. The graph can grow while running: a phase orchestrator may create Phase A1, A2, A3 when it hits an unexpected issue. This is a supported behavior, not an error.

# Human-in-the-Loop

When a goal is ambiguous or high-risk, capture MUST ask the user before delegating. The architectural rule stands: agents ask the user when blocked or uncertain.

# Related Documents

- [[Tasks-Part03]]
- [[Orchestrator-Part01]]
