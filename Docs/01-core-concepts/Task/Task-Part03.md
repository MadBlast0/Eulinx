---
title: TaskSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - task
related:
  - "[[01-core-concepts/README]]"
  - "[Task-Part01]"
  - "[Task-Part02]"
---

# Task Specification (Part 03)

## Scheduling

The Scheduler evaluates every Task before execution.

Inputs:
- Priority
- Dependencies
- Worker availability
- Estimated duration
- Resource limits
- Current runtime load

Tasks SHOULD be scheduled to maximize safe parallelism.

---

## Parallel Execution

Independent Tasks MAY execute simultaneously.

The Runtime MUST prevent conflicts using:

- File locks
- Symbol ownership
- Dependency graphs
- Artifact validation

---

## Worker Coordination

A Task may be:

- Assigned to one Worker
- Split into multiple Subtasks
- Coordinated by one Task Orchestrator

Workers report progress through runtime events rather than direct communication.

---

## Progress Tracking

Each Task records:

- Percentage complete
- Current state
- Assigned Worker
- Active blockers
- Generated artifacts
- Estimated remaining time

---

## Blocking Conditions

A Task enters Blocked when:

- Dependency is incomplete
- Permission is denied
- Required tool is unavailable
- Human approval is pending
- Runtime policy prevents execution

Blocked Tasks MUST be reevaluated automatically when conditions change.

---

## AI Notes

Tasks should remain focused and independently verifiable whenever possible.
Avoid oversized Tasks that require excessive context.

