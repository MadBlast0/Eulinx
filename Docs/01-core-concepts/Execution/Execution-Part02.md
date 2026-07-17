---
title: ExecutionSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - execution
related:
  - "[[01-core-concepts/README]]"
  - "[Execution-Part01]"
  - "[Execution-Part01]"
---
# Execution Specification (Part 02)

## Execution Lifecycle

Every execution follows a formal lifecycle.

Requested
↓
Accepted
↓
Planned
↓
Decomposed
↓
Scheduled
↓
Executing
↓
Reviewing
↓
Verified
↓
Merged
↓
Completed

Alternative states:

- Blocked
- Waiting
- Retrying
- Failed
- Cancelled

---

## State Definitions

### Requested
A user submits a goal.

### Accepted
The Runtime validates the request.

### Planned
The Root Orchestrator creates an execution strategy.

### Decomposed
The strategy becomes phases and tasks.

### Scheduled
The Scheduler allocates execution resources.

### Executing
Workers actively perform assigned work.

### Reviewing
Artifacts are inspected and validated.

### Verified
Artifacts satisfy quality requirements.

### Merged
Verified artifacts are applied to the Workspace.

### Completed
Execution finishes successfully.

---

## Transition Rules

Execution MUST NOT skip verification.

Execution MAY return to earlier states when retries or replanning are required.

Only the Runtime controls lifecycle transitions.

---

## Cancellation

Users may cancel execution at any point.

The Runtime MUST:
- stop new work
- preserve completed artifacts
- save execution history
- terminate workers safely

---

## AI Notes

All later execution documents extend this lifecycle and MUST remain consistent with it.

