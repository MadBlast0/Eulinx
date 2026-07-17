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
  - "[Execution-Part05]"
---

# Execution Specification (Part 06)

## Failure Handling

Execution failures are expected and must be recoverable.

Failure categories:
- Worker failure
- Tool failure
- Runtime failure
- Verification failure
- Merge failure
- User cancellation

---

## Retry Strategy

The Runtime may:

- Retry the same Worker
- Spawn a replacement Worker
- Replan the task
- Escalate to the Orchestrator
- Request human intervention

Retries should use exponential backoff where appropriate.

---

## Rollback

Only verified merges affect the Workspace.

If a merge introduces problems, the Runtime should support:

- Patch rollback
- Snapshot restoration
- Replay from the last stable state

---

## Recovery

Recovery goals:

- Preserve completed work
- Avoid duplicate execution
- Restore Runtime state
- Resume safely

---

## Human Approval

Execution may pause for:

- Destructive operations
- Sensitive file changes
- Policy violations
- Manual review gates

---

## AI Notes

Execution must favor safe recovery over blind retries.
Every failure should leave enough information for diagnosis and replay.

