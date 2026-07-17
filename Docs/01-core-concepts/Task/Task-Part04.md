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
  - "[Task-Part03]"
---

# Task Specification (Part 04)

## Artifact Production

Every completed Task SHOULD produce one or more Artifacts.

Examples:
- Code Patch
- Test Report
- Documentation
- Design Proposal
- Configuration Change
- Validation Report

Artifacts MUST be associated with the originating Task.

---

## Verification

Before a Task is considered complete:

- Required artifacts exist
- Success criteria are satisfied
- Validation passes
- Required approvals are obtained
- Completion event is recorded

Verification failures return the Task to an appropriate execution state.

---

## Retry Strategy

The Runtime MAY retry a Task when:

- Worker crashes
- Tool execution fails
- Temporary resources are unavailable
- AI output fails validation

Retries SHOULD preserve completed work whenever possible.

---

## Audit Trail

Each Task maintains:

- Creation timestamp
- Assignment history
- State transitions
- Worker history
- Artifact references
- Verification results
- Completion timestamp

This history MUST remain immutable after completion.

---

## Metrics

Track:

- Execution duration
- Queue time
- Retry count
- Verification failures
- Artifact count
- Success rate

---

## AI Notes

Tasks are immutable records of planned work.
Execution history should always be reproducible through stored events and artifacts.

