---
title: WorkerExamples - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - examples
  - verification
related:
  - "[[WorkerExamples-Part01]]"
---

# WorkerExamples (Part 02)

## Document Index

Part 01 - Coding Workflow Examples
Part 02 - Review, Repair, and Verification Examples
Part 03 - Failure, Recovery, and Anti-Examples

# Example: Review Worker

```text
Builder Worker creates patch.
Review Worker receives patch artifact, not full terminal transcript.
Review Worker creates review artifact.
Verifier runs tests.
MergeManager waits for approval.
```

# Example: Repair Loop

```text
Tests fail.
Verifier creates failure artifact.
Orchestrator spawns Repair Worker.
Repair Worker creates patch.
Tests rerun.
Loop stops when tests pass or retry limit reached.
```

# Example: Human Approval

```text
Worker proposes dependency update.
PermissionManager marks high risk.
User approves once.
MergeManager applies patch.
```

# AI Notes

Review Workers should generally be restricted Workers with artifact read and review output permissions.

# Related Documents

- [[WorkerExamples-Part03]]
- [[WorkerPermissions-Part01]]

