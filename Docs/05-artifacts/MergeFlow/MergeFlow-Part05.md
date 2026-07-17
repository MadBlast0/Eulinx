---
title: MergeFlow Specification - Part 05
status: draft
version: 1.0
tags:
  - artifacts
  - merge-flow
  - apply
related:
  - "[[MergeFlow-Part04]]"
  - "[[PatchArtifacts-Part03]]"
---

# MergeFlow Specification (Part 05)

## Document Index

Part 01 - Purpose, the fail-closed rule, and the merge pipeline
Part 02 - Eligibility, locks, and permission checks
Part 03 - Approval gates and human-in-the-loop
Part 04 - Conflict detection and resolution
Part 05 - Apply, rollback, and merge history
Part 06 - Git integration and workspace integrity

# Apply

If all gates pass, the MergeManager applies the Artifact (PatchArtifacts Part 03 for patches; the typed specs for other kinds). Application is atomic within the locked scope:

- for a `patch`: apply all hunks, or roll back the whole patch on any unresolvable hunk conflict
- for `markdown`/`json`/`code` (via patch): write the declared content to `targetPath`
- for `image`: copy referenced bytes to `targetPath`
- for multi-file: all files succeed or the whole merge rolls back

# Rollback

Before applying, the MergeManager snapshots the pre-merge state of every affected path (content + mode). If application fails at any point (disk error, lost lock, partial write, thrown exception), the MergeManager restores the snapshot under the same lock. The result is: either the merge fully applied, or the workspace is exactly as it was before. There is no half-state.

The rollback uses the computed reverse patch for patch Artifacts, or the content snapshot for full-replace kinds.

# Merge History And Result

On success, the MergeManager:

- sets `status = merged`, `mergeState = merged`
- emits `artifact.merged` on the EventBus
- writes a `merge_result` Artifact (read-only mirror) recording: the applied Artifact ref, before/after revision, affected paths, actor, timestamp, and the strategy used
- records the relationship `supersedes` when the merged Artifact replaces a prior one

The `merge_result` is itself an Artifact but is never a merge candidate; it is audit trail and Replay input.

# Idempotency Guard

Re-applying an already-merged patch is detected (anchored hashes will not match the now-changed file) and treated as a conflict or no-op per policy, never a silent second write. The merge history prevents duplicate application.

# Invariants

```text
Apply is atomic within the locked scope; all-or-nothing.
Any failure rolls back to the pre-merge snapshot.
Success records status, event, and a merge_result mirror.
No half-applied workspace state is ever left behind.
Re-application is a conflict, not a silent write.
```

# AI Notes

Do not apply hunks without rollback. A half-applied file is worse than a rejected Artifact.

Do not skip the merge_result. Audit and Replay need the record of what was applied and by whom.

Do not leave the workspace in a half-state on error. Restore the snapshot; fail-closed means clean stop.

# Related Documents

- [[MergeFlow-Part04]]
- [[MergeFlow-Part06]]
- [[PatchArtifacts-Part03]]
- [[ArtifactLifecycle-Part05]]
- [[04-memory/Replay/Replay-Part01]]
