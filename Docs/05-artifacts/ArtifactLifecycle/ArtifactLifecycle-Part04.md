---
title: ArtifactLifecycle Specification - Part 04
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-lifecycle
  - approval
related:
  - "[[ArtifactLifecycle-Part03]]"
  - "[[MergeFlow-Part03]]"
---

# ArtifactLifecycle Specification (Part 04)

## Document Index

Part 01 - Purpose, the lifecycle state machine, and the boundary rule
Part 02 - Creation by Builder/Worker and validation
Part 03 - Verification entry and the verified state
Part 04 - Approval gates and human-in-the-loop
Part 05 - Merge and the merged state
Part 06 - Expiry, archival, and garbage collection

# Approval Gates

A `verified` Artifact is eligible to merge, but eligibility is not automatic application. Eulinx uses approval gates so that destructive or external changes are confirmed by a human.

Approval requirements are derived from:

- the `kind` (a `patch` that deletes files requires approval; a `markdown` doc usually does not)
- the PermissionManager policy for the producing Worker
- the operation's blast radius (does it touch git push, delete, publish, or external services?)
- explicit "human approval" nodes in the workflow

When approval is required, the Artifact waits in `verified` with `mergeState = eligible` until a human (or an authorized approval node) grants it. The UI surfaces a pending-approval queue.

# Human-In-The-Loop

Eulinx's architectural rule is that agents ask the user when blocked or uncertain. For Artifacts this means:

- destructive operations (delete, push, publish, external call) MUST have an approval gate.
- a Verifier in `soft` gate mode that finds a serious semantic issue SHOULD raise a human prompt rather than auto-merge.
- a conflict the MergeManager cannot resolve automatically MUST be escalated to a human (MergeFlow Part 04), not silently forced.

The user's approval is recorded on the Artifact metadata (`approvedBy`, `approvedAt`) and emitted as an event so Replay can show exactly who approved what.

# Auto-Approvable Cases

Some Artifacts are safe enough to auto-merge without a human:

- non-destructive `markdown` or `json` documentation/data within the workspace
- `patch` Artifacts that only add new files and pass all deterministic checks, when the Worker's permission profile allows it
- Artifacts explicitly marked auto-approvable by a workflow template the user trusted

Even auto-approvable merges still go through the MergeManager and are fail-closed.

# Invariants

```text
Destructive operations require a human approval gate.
Approval is recorded with actor and timestamp.
A conflict requiring judgment is escalated, never force-merged.
Auto-approval never bypasses the MergeManager or fail-closed rules.
```

# AI Notes

Do not auto-merge a delete or a push just because verification passed. Verification checks correctness, not consent. Approval checks consent.

Do not let a Worker approve its own Artifact. Approval is a separate actor (human or authorized approval node), consistent with the authorship-exclusion principle.

Do not drop the approval record. Replay and audit depend on knowing who approved a merged change.

# Related Documents

- [[ArtifactLifecycle-Part03]]
- [[ArtifactLifecycle-Part05]]
- [[MergeFlow-Part03]]
- [[02-runtime/PermissionManager/PermissionManager-Part01]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part05]]
