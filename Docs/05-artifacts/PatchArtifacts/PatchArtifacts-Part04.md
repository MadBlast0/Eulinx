---
title: PatchArtifacts Specification - Part 04
status: draft
version: 1.0
tags:
  - artifacts
  - patch-artifacts
  - validation
related:
  - "[[PatchArtifacts-Part03]]"
  - "[[MergeFlow-Part04]]"
---

# PatchArtifacts Specification (Part 04)

## Document Index

Part 01 - What a patch Artifact IS and why it is the primary merge unit
Part 02 - The patch format, hunk model, and addressing
Part 03 - Application model and idempotency
Part 04 - Validation, conflict surface, and special cases

# Validation

At creation (ArtifactLifecycle Part 02) a patch Artifact is validated structurally:

- the document parses into `base` + `operations`
- every `op` is one of the allowed set
- every `modify` has hunks with valid anchors and non-overlapping regions
- every path is workspace-relative and inside the root
- `rename` has both `oldPath` and `path`; `delete`/`modify` declare a base hash
- no operation targets a path outside the workspace
- binary changes reference an Artifact, not inline bytes

A patch failing any check is `rejected` at validation, before any Verifier runs.

# Conflict Surface

The patch declares the conflict surface the MergeManager will later use:

- which files it touches (`paths`)
- the base hashes it anchors to
- whether it deletes or renames (higher-risk operations)

This surface lets the MergeManager acquire the right locks up front and detect overlap with other pending merges. Two patches touching the same file with overlapping hunks and different base hashes are a predicted conflict.

# Special Cases

- Empty patch (no operations): valid but usually rejected as "no-op" by the workflow unless explicitly allowed (for example a deliberate "no change" signal).
- Patch touching `.git` internals: MUST be rejected; the MergeManager owns git integration, not patches ([[MergeFlow-Part06]]).
- Patch with `delete` of a file another Worker's merged patch depends on: conflict with dependency; escalate, never silently drop the dependency.
- Patch referencing a file outside scope: rejected at validation.

# Deterministic Verifiability

A patch is deterministically verifiable: applying it to the declared base in a sandbox yields a fixed result tree, which a `build`/`test` Verifier can check. This is why patch Artifacts are the safest merge unit — the Verifier verifies the result of applying the patch, not a free-form file the Builder edited.

# Invariants

```text
Validation rejects malformed patches before verification.
A patch must not touch .git internals.
Deletes that orphan another Worker's dependency are conflicts, not drops.
The conflict surface is declared up front for locking.
```

# AI Notes

Do not let a patch "also update git". Git is the MergeManager's job after apply; the patch is only the file delta.

Do not skip structural validation because "the Verifier will catch it". Malformed patches must fail early and cheaply.

Do not let a delete silently remove a file another merge depends on. That is a dependency conflict and must escalate.

# Related Documents

- [[PatchArtifacts-Part03]]
- [[MergeFlow-Part04]]
- [[MergeFlow-Part06]]
- [[ArtifactLifecycle-Part02]]
- [[Verification-Part03]]
