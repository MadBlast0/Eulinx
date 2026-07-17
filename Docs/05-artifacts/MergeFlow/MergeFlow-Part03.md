---
title: MergeFlow Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - merge-flow
  - approval
related:
  - "[[MergeFlow-Part02]]"
  - "[[ArtifactLifecycle-Part04]]"
---

# MergeFlow Specification (Part 03)

## Document Index

Part 01 - Purpose, the fail-closed rule, and the merge pipeline
Part 02 - Eligibility, locks, and permission checks
Part 03 - Approval gates and human-in-the-loop
Part 04 - Conflict detection and resolution
Part 05 - Apply, rollback, and merge history
Part 06 - Git integration and workspace integrity

# Approval Gates

After eligibility, locks, and permissions pass, the MergeManager checks approval gates (ArtifactLifecycle Part 04). Approval is about consent, distinct from correctness (which verification already established).

Approval is required when the Artifact's operation is destructive or external:

- `delete` of any file
- `rename` that moves files
- any operation the PermissionManager flags as needing consent (git push, publish, external call)
- any Artifact explicitly marked `requiresApproval` by a workflow template or human-in-the-loop node

When approval is required, the Artifact waits with `mergeState = eligible` and an approval request is surfaced in the UI. The merge proceeds only when a human (or an authorized approval node) grants it.

# Human-In-The-Loop

Eulinx's rule is that agents ask when blocked or uncertain. For merges this means:

- destructive/external ops MUST have an approval gate
- a `soft`-gate Verifier that found a serious semantic issue SHOULD raise a human prompt rather than auto-merge
- a conflict the MergeManager cannot resolve MUST be escalated, never force-merged

The approver is recorded: `approvedBy` (actor ref) and `approvedAt` (timestamp) on the Artifact metadata and in the `merge_result`. This record is what Replay and audit show.

# Auto-Approvable Cases

Some merges are safe enough to auto-approve:

- non-destructive documentation (`markdown`) or data (`json`) within the workspace, under an allowing permission profile
- `patch` Artifacts that only add new files and pass all deterministic checks, when the Worker profile allows
- Artifacts explicitly marked auto-approvable by a trusted workflow template

Auto-approval still runs the full pipeline (eligibility, lock, permission, conflict). Fail-closed still applies; auto-approval only removes the human prompt, not the checks.

# Invariants

```text
Destructive/external ops require a human approval gate.
Approval is recorded with actor and timestamp.
Unsolvable conflict escalates; never force-merged.
Auto-approval skips the human prompt, not the checks.
```

# AI Notes

Do not auto-merge a delete or push because verification passed. Verification is about correctness; approval is about consent.

Do not let a Worker approve its own Artifact. Approval is a separate actor, consistent with authorship exclusion.

Do not drop the approval record. Audit and Replay depend on knowing who approved a merged change.

# Related Documents

- [[MergeFlow-Part02]]
- [[MergeFlow-Part04]]
- [[ArtifactLifecycle-Part04]]
- [[02-runtime/PermissionManager/PermissionManager-Part01]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part05]]
