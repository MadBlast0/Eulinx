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
  - "[Task-Part01]"
---

# Task Specification (Part 02)

## Lifecycle

Created
↓
Validated
↓
Ready
↓
Assigned
↓
Running
↓
Reviewing
↓
Verified
↓
Completed

Alternative states:
- Waiting
- Blocked
- Retrying
- Failed
- Cancelled

---

## Assignment

Tasks are assigned by an Orchestrator.

Assignment considers:
- Worker capabilities
- Current workload
- Permissions
- Dependencies
- Estimated cost

---

## Dependencies

Tasks may depend on:

- Other Tasks
- Artifacts
- External tools
- Human approvals

The Runtime MUST prevent execution until mandatory dependencies are satisfied.

---

## Priority

Suggested priorities:

- Critical
- High
- Normal
- Low
- Background

Priority influences scheduling but MUST NOT violate dependency ordering.

---

## Completion Criteria

A Task is complete only when:

- Required work is finished
- Success criteria are satisfied
- Required artifacts exist
- Verification passes
- Completion event is recorded

---

## AI Notes

Tasks describe intent.
Workers produce implementation.
The Runtime controls execution order.

