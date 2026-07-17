---
title: MergeFlow Specification - Part 04
status: draft
version: 1.0
tags:
  - artifacts
  - merge-flow
  - conflicts
related:
  - "[[MergeFlow-Part03]]"
  - "[[PatchArtifacts-Part04]]"
  - "[[02-runtime/MergeManager/MergeManager-Part04]]"
---

# MergeFlow Specification - Part 04)

## Document Index

Part 01 - Purpose, the fail-closed rule, and the merge pipeline
Part 02 - Eligibility, locks, and permission checks
Part 03 - Approval gates and human-in-the-loop
Part 04 - Conflict detection and resolution
Part 05 - Apply, rollback, and merge history
Part 06 - Git integration and workspace integrity

# Conflict Detection

Before applying, the MergeManager compares the Artifact's declared base to the current workspace state. Conflicts arise when the workspace moved under the Artifact.

Conflict types:

- `base_revision_mismatch`: the file's current hash differs from the Artifact's anchored base hash
- `same_line_conflict`: two hunks edit the same lines with different content
- `file_deleted`: the Artifact modifies/deletes a file another Worker already deleted or changed
- `file_renamed`: the target was renamed out from under the Artifact
- `symbol_modified`: a dependency symbol the Artifact assumes changed elsewhere
- `dependency_conflict`: the Artifact deletes/modifies a file another merged Artifact depends on
- `generated_file_exists`: the Artifact adds a file that now exists as generated output
- `permission_conflict`: the op needs a permission the Worker lacks
- `lock_conflict`: another merge holds a required lock

The patch's declared conflict surface (PatchArtifacts Part 04) lets the MergeManager detect `same_line_conflict` and `lock_conflict` up front.

# Resolution Strategies

When a conflict is detected, the MergeManager tries strategies in order, stopping at the first that succeeds:

1. `auto_rebase`: re-anchor the hunk to the current file using its context lines, if the region is unambiguous
2. `three_way_merge`: use the original base, the Artifact's change, and current state to merge when semantically safe (text only)
3. `worker_repair`: dispatch a Worker to produce a new Artifact version resolving the conflict; that Worker emits a new Artifact (never edits trusted files directly)
4. `reviewer_worker`: a reviewer Worker assesses and proposes; again, it emits an Artifact
5. `human_merge`: escalate to the user with a clear diff and options
6. `reject`: if nothing works, reject the merge (fail-closed)

# The Non-Negotiable Rule

The MergeManager MUST NOT silently discard changes from another Worker. If resolving a conflict would drop a previously merged change, that resolution is forbidden; the merge MUST escalate or reject. Another Worker's merged work is sacred until explicitly superseded by an approved, verified Artifact.

# AI-In-Conflict

If a `worker_repair` or `reviewer_worker` strategy is used, that Worker produces a NEW Artifact (with `parentArtifactId`), which must itself be validated and verified before it can merge. The AI never edits trusted files during conflict resolution. This keeps the verify-then-merge boundary intact even under conflict.

# Invariants

```text
Conflicts are detected by comparing declared base to current state.
Resolution tries auto_rebase -> 3way -> worker -> human -> reject.
Another Worker's merged change is never silently discarded.
AI conflict resolution emits a new Artifact; it never edits trusted files.
Unsolvable conflict escalates; fail-closed.
```

# AI Notes

Do not let conflict resolution "just overwrite" the current file. That discards another Worker's merged work and breaks the non-negotiable rule.

Do not have an AI fix a conflict by editing the project directly. It emits a new Artifact that is verified and merged like any other.

Do not treat `lock_conflict` as a reason to retry forever. Escalate; the other merge will finish or fail on its own.

# Related Documents

- [[MergeFlow-Part03]]
- [[MergeFlow-Part05]]
- [[PatchArtifacts-Part04]]
- [[02-runtime/MergeManager/MergeManager-Part04]]
- [[ArtifactVersioning-Part01]]
