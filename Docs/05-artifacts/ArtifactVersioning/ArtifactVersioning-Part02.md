---
title: ArtifactVersioning Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-versioning
  - diffs
related:
  - "[[ArtifactVersioning-Part01]]"
  - "[[10-ai-system/RefinementLoop/RefinementLoop-Part01]]"
---

# ArtifactVersioning Specification (Part 02)

## Document Index

Part 01 - Version model, content-addressed immutability, and the version chain
Part 02 - Diffs between versions and the refine loop
Part 03 - Version queries, reconstruction, and integrity

# Diffs Between Versions

A diff compares two versions of an Artifact by their `contentHash`. Because both versions are immutable and content-addressed, the diff is deterministic and cacheable.

Diff rules by kind:

- `patch`: a diff is itself a patch describing the difference between the two patch texts (hunk-level).
- `code` / `markdown`: a line-level diff of the text content.
- `json`: a structural diff (added/removed/changed keys), not just text.
- `image`: a diff is not byte-text; instead a similarity score and, optionally, a visual diff overlay is recorded.
- `test_report`: a diff compares pass/fail counts and per-test outcomes.

A diff is a computed view, never a stored mutation. It is produced on demand by the ArtifactManager or a diff tool, keyed by the two content hashes.

# The Refine Loop And Versions

The refinement loop ([[10-ai-system/RefinementLoop/RefinementLoop-Part01]]) is the primary producer of versions:

1. version 1 is the base model's draft.
2. a critic produces a `review` Artifact `references`-ing version 1.
3. a refine Worker produces version 2 (`parentArtifactId` = version 1), addressing the review.
4. the Judge compares version 1 and version 2 via diff, scores improvement, and decides continue or stop.
5. the loop repeats up to the mode's max iterations (Low=1, Medium=2, High=4, Ultra=8).

Each version is verified independently. The MergeManager merges whichever version the Judge (and approval gates) select — usually the latest that passes, but the system MUST allow merging an earlier version if the Judge determines later passes regressed.

# Which Version Merges

The selected version is recorded when the merge is requested. The MergeManager merges exactly that version's bytes, not "the latest in the chain" by default. This prevents a stray Ultra-pass regression from being auto-applied over a known-good version.

# Invariants

```text
A diff is computed from two content hashes, never from mutable state.
Each refine pass is a new version with its own verdicts.
The merged version is explicitly selected, not assumed latest.
A diff view is never stored as a mutation of either version.
```

# AI Notes

Do not let the merge blindly take "the highest version number". The Judge may find version 3 regressed; merge the selected, verified version.

Do not store diffs as edits to Artifacts. Diffs are views; the Artifacts stay immutable.

Do not skip per-version verification in the refine loop. A later version that was never verified MUST NOT be merged.

# Related Documents

- [[ArtifactVersioning-Part01]]
- [[ArtifactVersioning-Part03]]
- [[10-ai-system/RefinementLoop/RefinementLoop-Part01]]
- [[10-ai-system/Judge/Judge-Part01]]
- [[MergeFlow-Part01]]
