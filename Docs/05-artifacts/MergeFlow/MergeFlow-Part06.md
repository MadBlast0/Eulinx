---
title: MergeFlow Specification - Part 06
status: draft
version: 1.0
tags:
  - artifacts
  - merge-flow
  - git
related:
  - "[[MergeFlow-Part05]]"
  - "[[11-features/Git/Git-Part01]]"
---

# MergeFlow Specification (Part 06)

## Document Index

Part 01 - Purpose, the fail-closed rule, and the merge pipeline
Part 02 - Eligibility, locks, and permission checks
Part 03 - Approval gates and human-in-the-loop
Part 04 - Conflict detection and resolution
Part 05 - Apply, rollback, and merge history
Part 06 - Git integration and workspace integrity

# Git Integration

The MergeManager owns git operations; patches and Artifacts MUST NOT touch `.git` internals directly (PatchArtifacts Part 04). After applying a merge to the working tree, the MergeManager MAY:

- stage the affected paths (per the workspace git policy)
- commit with a message referencing the merged Artifact id and the producing task
- push only if the Worker's permission profile allows `git push` AND the user approved (destructive/external gate)

Git commit/push are themselves gated and recorded. A commit is not a separate unverified mutation; it captures a verified, merged Artifact.

# Workspace Integrity

The MergeManager is the guardian of workspace integrity:

- it enforces that every trusted-state change came through a verified, approved, locked, conflict-free merge
- it refuses Artifacts whose paths escape the workspace
- it refuses Artifacts that would corrupt another Worker's merged dependency
- it keeps the workspace reachable for Replay (every merged change references an Artifact)

# Concurrent Merges

Multiple Workers may produce merge candidates. The LockManager serializes overlapping ones; non-overlapping merges may proceed in parallel. The MergeManager MUST NOT let a fast merge clobber a slow one's in-flight changes; locks and base-hash checks enforce this. Two candidates for the same file are a `lock_conflict` and are sequenced or escalated.

# Failure And Workspace Restore

If git operations fail (for example a pre-commit hook rejects), the MergeManager treats it like any apply failure: roll back the working tree to pre-merge, set `mergeState = rejected` (or `merge_failed`), and emit an event. The repo is left consistent; a failed commit does not strand the workspace in a broken state.

# Invariants

```text
Git is owned by MergeManager; Artifacts never touch .git internals.
Commit/push are gated by permission + approval, and recorded.
Every trusted change traces to a verified, merged Artifact.
Concurrent merges are serialized by lock; never clobber.
Git failure rolls back the working tree; repo stays consistent.
```

# AI Notes

Do not let a patch "handle git" by writing into `.git`. Git is the MergeManager's job after apply; keep patches as file deltas.

Do not push without approval. Push is external and destructive; the human gate applies even after verification.

Do not let a failed commit leave the workspace broken. Roll back; consistency beats progress.

# Related Documents

- [[MergeFlow-Part05]]
- [[02-runtime/MergeManager/MergeManager-Part06]]
- [[11-features/Git/Git-Part01]]
- [[02-runtime/LockManager/LockManager-Part01]]
- [[PatchArtifacts-Part04]]
