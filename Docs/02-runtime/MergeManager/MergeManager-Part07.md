---
title: Merge Manager Part 07 - Events, Metrics, UI
status: draft
version: 1.0
tags:
  - runtime
  - merge-manager
  - ui
related:
  - "[[EventBus-Part01]]"
  - "[[NodeGraph]]"
---

# Merge Manager Part 07 - Events, Metrics, UI

## Events

```text
merge.candidate_created
merge.eligible
merge.blocked
merge.verification_started
merge.verification_failed
merge.approval_required
merge.conflict_detected
merge.applied
merge.rolled_back
merge.rejected
```

## Metrics

Track:

- merge duration
- conflict rate
- rollback rate
- verification failure rate
- files changed
- Workers contributing patches
- human approval frequency

## UI Surfaces

Eulinx should show:

- merge queue
- patch preview
- affected files
- verification status
- approval state
- conflict view
- rollback action
- merge history

## Graph Representation

Patch Artifacts should visually flow into MergeManager, then into the Workspace node.

## AI Notes

The user must be able to understand why a merge is blocked without opening raw logs.

