---
title: MergeFlow Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - merge-flow
  - eligibility
related:
  - "[[MergeFlow-Part01]]"
  - "[[02-runtime/LockManager/LockManager-Part01]]"
---

# MergeFlow Specification (Part 02)

## Document Index

Part 01 - Purpose, the fail-closed rule, and the merge pipeline
Part 02 - Eligibility, locks, and permission checks
Part 03 - Approval gates and human-in-the-loop
Part 04 - Conflict detection and resolution
Part 05 - Apply, rollback, and merge history
Part 06 - Git integration and workspace integrity

# Eligibility

The MergeManager first confirms the Artifact is eligible:

- `status == verified` (passed authoritative verification; see Verification Part 04)
- `verificationState == passed`
- `mergeState` is `eligible` or unset (not already `merged`, `rejected`, or `conflicted`)
- the Artifact is not expired (ArtifactLifecycle Part 06)
- the Artifact is within the active workspace scope

An eligible Artifact is a candidate. Eligibility is necessary but not sufficient; locks, permissions, approvals, and conflicts are checked next.

# Lock Acquisition

The MergeManager acquires locks on every path the Artifact touches ([[02-runtime/LockManager/LockManager-Part01]]). Locking:

- prevents two merges from touching the same file concurrently
- lets the MergeManager detect overlap with another pending merge (a predicted conflict)
- is held for the duration of apply + record, then released

If a required lock cannot be acquired (another merge holds it), the merge waits briefly, then escalates as a `lock_conflict` rather than forcing. Fail-closed: never steal a lock.

# Permission Checks

The MergeManager consults the PermissionManager ([[02-runtime/PermissionManager/PermissionManager-Part01]]) for the producing Worker's profile:

- does the Worker have `write files`?
- does it have `delete files` (for a delete operation)?
- does it have `git push` (if the merge will later commit/push)?
- does it have `publish` / external scope (if the Artifact implies it)?

If the operation exceeds the Worker's permissions, the merge is rejected or escalated for human approval with elevated rights. The MergeManager MUST NOT widen permissions on its own.

# Scope Enforcement

All paths in the Artifact MUST resolve inside the workspace root. A path escaping the workspace (absolute path, `..` traversal, or a symlink pointing out) is rejected at eligibility. This enforces the product's workspace-isolation principle: an Agent never messes up another project.

# Invariants

```text
Eligibility requires verified + unmerged + unexpired + in-scope.
Locks are acquired before apply and held through record.
Permission is checked against the producer's profile; never widened.
Paths must resolve inside the workspace root.
Lock unobtainable => escalate, never steal.
```

# AI Notes

Do not skip eligibility because "it looks verified". Read `verificationState`; a `pending` Artifact is not mergeable.

Do not let the merge widen a Worker's permissions. If the op needs delete and the Worker lacks it, escalate, do not grant.

Do not let a symlink or `..` escape the workspace. Reject at scope check; this is the isolation guarantee.

# Related Documents

- [[MergeFlow-Part01]]
- [[MergeFlow-Part03]]
- [[02-runtime/LockManager/LockManager-Part01]]
- [[02-runtime/PermissionManager/PermissionManager-Part01]]
- [[Verification-Part04]]
- [[ArtifactLifecycle-Part04]]
