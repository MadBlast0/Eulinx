---
title: PatchArtifacts Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - patch-artifacts
  - patch-format
related:
  - "[[PatchArtifacts-Part01]]"
  - "[[MergeFlow-Part04]]"
---

# PatchArtifacts Specification (Part 02)

## Document Index

Part 01 - What a patch Artifact IS and why it is the primary merge unit
Part 02 - The patch format, hunk model, and addressing
Part 03 - Application model and idempotency
Part 04 - Validation, conflict surface, and special cases

# The Patch Format

A patch Artifact's content is a structured, machine-readable patch document. It is NOT required to be a literal `diff` text blob; it MUST be parseable into the operation model below. A text `diff` is one acceptable serialization.

The document contains:

- `base`: the workspace revision (or per-file base hashes) the patch is anchored to
- `operations`: an ordered list of file operations

Each operation has:

- `op`: one of `add`, `modify`, `delete`, `rename`, `mode`
- `path`: the workspace-relative target path
- `oldPath`: for `rename`, the source path
- `mode`: for `mode`, the new file mode
- `hunks`: for `modify`, an ordered list of hunks
- `content`: for `add`, the full new file content
- `hash`: base content hash for `modify`/`delete` to anchor the change

# The Hunk Model

A hunk describes a contiguous region of a `modify` operation:

- `fileHash`: the hash of the file content the hunk is anchored to
- `oldStart` / `oldLines`: the region in the base file
- `newStart` / `newLines`: the region in the result file
- `lines`: the new content lines (with leading `+`/`-`/context markers in text form)
- `contextBefore` / `contextAfter`: surrounding unchanged lines used to relocate the hunk if the file shifted

Hunks are independent units. The MergeManager applies them per file; a conflict is reported per hunk, not per whole patch, so partial application with rollback is possible.

# Addressing And Paths

All paths are workspace-relative and MUST be inside the workspace root. A patch that references a path outside the workspace MUST be rejected at validation ([[ArtifactLifecycle-Part02]]). Absolute paths and `..` traversal are illegal in patch paths.

# Binary Files In Patches

A patch MUST NOT carry binary deltas inline. For binary changes (images, etc.) the patch references an `image` Artifact by `artifact-ref` and declares `add`/`modify` with that reference; the MergeManager copies the referenced bytes. This keeps patches text and reviewable.

# Invariants

```text
Every modify hunk anchors to a file hash for drift detection.
Paths are workspace-relative and inside the workspace root.
A patch parses into operations + hunks deterministically.
Binary changes are referenced, not inlined.
```

# AI Notes

Do not inlinine binary blobs into a patch. Reference an image Artifact; keep the patch text.

Do not use absolute paths in a patch. They are rejected and the whole Artifact fails validation.

Do not make hunks overlap within a file. Overlapping hunks make application ambiguous; the validator MUST reject them.

# Related Documents

- [[PatchArtifacts-Part01]]
- [[PatchArtifacts-Part03]]
- [[MergeFlow-Part04]]
- [[ImageArtifacts-Part01]]
- [[ArtifactLifecycle-Part02]]
