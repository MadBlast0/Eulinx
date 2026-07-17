---
title: Tasks Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - tasks
related:
  - "[[Tasks-Part02]]"
  - "[[Tasks-Part04]]"
  - "[[ArtifactManager-Part01]]"
---

# Tasks Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Task Object
Part 02 - Natural-Language Capture and Decomposition
Part 03 - Assignment, Execution, and Evidence
Part 04 - Recurring Tasks and Scheduling
Part 05 - Progress Aggregation and AI Notes

# Assignment to Agents

A subtask is delegated to a worker terminal. Assignment may be parallel: multiple independent tasks run on multiple workers simultaneously (hierarchical fan-out), each with its own context window for reliability.

Assignment respects the worker hierarchy: a task orchestrator owns tasks; phase orchestrators own task groups; the root orchestrator owns phases. Workers never receive the full project context, only their task plus relevant channel summaries and the specific upstream output.

# Execution, Not Just Listing

A "task agent" does the item. It runs steps, uses tools, and marks the task done with evidence. Evidence is the artifact, log, or output produced, attached to the Task record.

A task is not complete because an agent said so. Completion requires:

- the declared output exists as an Artifact
- the verification record passes (or is explicitly waived by a human)
- the evidence is linked to the Task

# Dependencies

A task with unmet dependencies MUST NOT be admitted by the Scheduler. Dependency edges are first-class and visualized on the task board.

# Related Documents

- [[Tasks-Part04]]
- [[ArtifactManager-Part01]]
