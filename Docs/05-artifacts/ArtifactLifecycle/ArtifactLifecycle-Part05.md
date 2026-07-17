---
title: ArtifactLifecycle Specification - Part 05
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-lifecycle
  - merge
related:
  - "[[ArtifactLifecycle-Part04]]"
  - "[[MergeFlow-Part01]]"
---

# ArtifactLifecycle Specification (Part 05)

## Document Index

Part 01 - Purpose, the lifecycle state machine, and the boundary rule
Part 02 - Creation by Builder/Worker and validation
Part 03 - Verification entry and the verified state
Part 04 - Approval gates and human-in-the-loop
Part 05 - Merge and the merged state
Part 06 - Expiry, archival, and garbage collection

# Merge

The `verified -> merged` transition is performed ONLY by the MergeManager. It is the single moment trusted project state changes because of an Artifact.

Preconditions the MergeManager enforces before applying:

- the Artifact is `verified` (passed authoritative verification)
- approval gates are satisfied (Part 04)
- the required lock on affected files/paths is acquired ([[02-runtime/LockManager/LockManager-Part01]])
- no unresolvable conflict exists with current workspace state ([[MergeFlow-Part04]])
- the WorkspaceManager confirms the Artifact is within the workspace scope

If all hold, the MergeManager applies the Artifact (for a `patch`, by applying hunks; for `markdown`/`json`/`code`, by writing the content to the addressed path), then sets `status = merged` and `mergeState = merged`, and emits `artifact.merged`.

# What Merge Writes

Merge writes ONLY the content described by the Artifact, to the paths the Artifact declares. It does not "also" run the producer's side effects. The Artifact is the complete description of the change. This is why a patch Artifact must be self-contained (PatchArtifacts).

# Merge Failure

If application fails (lock lost, disk error, partial write), the MergeManager MUST roll back to the pre-merge state and set `mergeState = rejected` (or a dedicated `merge_failed` substate), NOT leave the workspace half-changed. Fail-closed means: on any uncertainty, stop and restore.

# Merge Result Artifact

The MergeManager MAY emit a `merge_result` Artifact (read-only mirror) recording what was applied, the before/after revision, and the actor. This is itself an Artifact but is never a merge candidate; it is audit trail.

# Invariants

```text
Only MergeManager performs verified -> merged.
Merge requires verified + approved + locked + conflict-free.
Merge writes only the Artifact's declared content to declared paths.
A failed merge rolls back; the workspace is never left half-applied.
merge_result is a mirror, never a candidate.
```

# AI Notes

Do not let any node other than MergeManager write trusted state from an Artifact. The Builder proposes; the Verifier checks; the MergeManager applies.

Do not let a merge "mostly succeed". Half-applied project state is worse than a rejected Artifact. Roll back on any error.

Do not treat merge as the producer's job. Even a Worker granted writes should prefer emitting an Artifact and letting MergeManager apply it, so the change is verified and recorded.

# Related Documents

- [[ArtifactLifecycle-Part04]]
- [[ArtifactLifecycle-Part06]]
- [[MergeFlow-Part01]]
- [[MergeFlow-Part05]]
- [[02-runtime/MergeManager/MergeManager-Part01]]
