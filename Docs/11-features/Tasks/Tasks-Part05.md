---
title: Tasks Specification - Part 05
status: draft
version: 1.0
tags:
  - features
  - tasks
related:
  - "[[Tasks-Part04]]"
  - "[[Metrics-Part01]]"
---

# Tasks Specification (Part 05)

## Document Index

Part 01 - Purpose, Scope, and the Task Object
Part 02 - Natural-Language Capture and Decomposition
Part 03 - Assignment, Execution, and Evidence
Part 04 - Recurring Tasks and Scheduling
Part 05 - Progress Aggregation and AI Notes

# Progress Aggregation

Progress rolls up automatically. A worker at 45% feeds its task to 73%, the phase to 61%, and the project to 28%. Aggregation is computed, not manually entered. The task board shows this roll-up at every level.

# Task History Surface

The right sidebar shows task and agent session history per workspace and project. Each entry links to the Task record, its artifacts, and its logs. This is the observability surface for "what did my agents do".

# AI Notes

Do not represent work as chat messages; represent it as Tasks with artifacts and evidence.

Do not admit a task whose dependencies are unmet.

Do not mark a task complete without linked evidence and a passing verification record.

Do not spawn unbounded subtasks from a vague goal without user review of the checklist.

# Related Documents

- [[Metrics-Part01]]
