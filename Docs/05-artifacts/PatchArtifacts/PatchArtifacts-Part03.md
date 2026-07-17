---
title: PatchArtifacts Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - patch-artifacts
  - application
related:
  - "[[PatchArtifacts-Part02]]"
  - "[[MergeFlow-Part05]]"
---

# PatchArtifacts Specification (Part 03)

## Document Index

Part 01 - What a patch Artifact IS and why it is the primary merge unit
Part 02 - The patch format, hunk model, and addressing
Part 03 - Application model and idempotency
Part 04 - Validation, conflict surface, and special cases

# Application Model

The MergeManager applies a patch Artifact operation by operation, hunk by hunk. For each `modify` hunk:

1. read the current file at `path`
2. verify the anchored `fileHash` matches the current base (drift check)
3. if it matches, locate the hunk region via `oldStart`/`context`
4. replace the region with the hunk's new lines
5. if it does not match, this hunk is a conflict (MergeFlow Part 04)

`delete` requires the current file hash to match the declared base hash, else conflict. `add` requires the path to not exist (or to be an intentional overwrite under permission). `rename` requires the source to exist and the destination to not. `mode` sets the file mode.

# Idempotency And Re-Application

A patch is intended to apply once. Re-applying the same patch to an already-applied file MUST be detected: the anchored hashes will not match, and the MergeManager treats a second application as a conflict or a no-op depending on policy. A patch is NOT expected to be idempotent by design; correctness comes from applying it exactly once under a lock.

# Rollback

Because a patch is a delta anchored to base hashes, a reverse patch is computable: swap `old`/`new` regions and invert `add`/`delete`. The MergeManager records the applied patch and its reverse so that a failed or rejected merge can be rolled back to the pre-merge state ([[MergeFlow-Part05]]). Rollback operates on the same locked paths.

# Partial Application And Safety

If a patch has ten hunks and hunk 7 conflicts, the MergeManager MUST NOT leave hunks 1-6 applied and 7-10 not. It either:

- applies all hunks atomically within the locked scope, or
- rolls back the entire patch on any conflict it cannot auto-resolve

This all-or-nothing behavior is the fail-closed guarantee at the hunk level.

# Invariants

```text
Each hunk is drift-checked against its anchored hash before applying.
A conflict on any unresolvable hunk rolls back the whole patch.
Rollback uses the computed reverse patch under the same lock.
Re-application to an applied file is a conflict, not a silent no-op.
```

# AI Notes

Do not apply a patch hunk-by-hunk without rollback. A half-applied file is worse than a rejected patch.

Do not "force" a hunk whose base hash drifted. That is how unrelated Worker changes get clobbered. Escalate the conflict.

Do not treat a patch as idempotent. Apply once, under lock, with rollback ready.

# Related Documents

- [[PatchArtifacts-Part02]]
- [[PatchArtifacts-Part04]]
- [[MergeFlow-Part04]]
- [[MergeFlow-Part05]]
- [[02-runtime/LockManager/LockManager-Part01]]
