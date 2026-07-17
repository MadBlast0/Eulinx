---
title: ArtifactLifecycle Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-lifecycle
  - creation
related:
  - "[[ArtifactLifecycle-Part01]]"
  - "[[02-runtime/ArtifactManager/ArtifactManager-Part03]]"
---

# ArtifactLifecycle Specification (Part 02)

## Document Index

Part 01 - Purpose, the lifecycle state machine, and the boundary rule
Part 02 - Creation by Builder/Worker and validation
Part 03 - Verification entry and the verified state
Part 04 - Approval gates and human-in-the-loop
Part 05 - Merge and the merged state
Part 06 - Expiry, archival, and garbage collection

# Creation

Creation is the `draft -> created` transition. It is owned by the ArtifactManager and triggered when a Builder node emits an `artifact-ref` or a Worker calls the artifact-creation service.

Steps:

1. The producer supplies the bytes, the `kind`, and minimal metadata (title, producing Worker, task/workflow/execution ids).
2. The ArtifactManager assigns `id`, sets `workspaceId`, records provenance (`workerId`, `rootWorkerId`), and computes `contentHash`.
3. The bytes are written to the store addressed by `contentRef`.
4. The `status` is set to `created`.
5. The EventBus emits `artifact.created`.

At this point the Artifact is immutable. Any further change is a new Artifact that derives from this one.

# Who May Create

- A Builder node creates Artifacts as its primary output ([[06-workflow-engine/BuilderNodes/BuilderNodes-Part01]]).
- A Worker MAY create Artifacts when granted the artifact-creation capability, but it MUST route through the ArtifactManager, never write the file and call it an Artifact.
- A Tool MAY create Artifacts as outputs (for example a web-search tool creating a `json` Artifact).
- The user MAY create Artifacts manually (for example uploading a reference document as a `markdown` or `json` Artifact).

# Validation

Validation is the `created -> validated` transition. It confirms the bytes satisfy the structural rules of the `kind`:

- `patch` MUST parse as a valid patch (see PatchArtifacts).
- `json` MUST parse as JSON and, if `schemaRef` is present, satisfy the schema (see JSONArtifacts).
- `markdown` MUST be well-formed markdown with valid frontmatter when required.
- `image` MUST have a recognized binary header and match `contentType`.
- `code` MUST be non-empty text of a recognized language when `contentType` is set.

Validation is structural, not semantic. It answers "is this shape valid?", not "is this correct?". Correctness is Verification's job.

# Validation Failure

If validation fails, the Artifact transitions to `rejected` with a rejection reason recorded in metadata. The producer is informed via the EventBus (`artifact.rejected`) and, in a workflow, the Builder node's failure route is taken.

# Invariants

```text
Creation assigns id, workspaceId, provenance, and contentHash atomically.
After created, bytes are immutable.
Validation checks structure per kind, not correctness.
Validation failure leads to rejected, not to a retry-with-mutation.
```

# AI Notes

Do not create an Artifact by writing a file and then registering it later. Register through the ArtifactManager so id, hash, and provenance are captured at the same moment.

Do not let validation pass a malformed patch "because the merge will catch it". The merge operates on a validated, verified Artifact; malformed input must stop early.

Do not confuse validation with verification. Validation is cheap structure-checking at creation; verification is the authoritative check before merge.

# Related Documents

- [[ArtifactLifecycle-Part01]]
- [[ArtifactLifecycle-Part03]]
- [[02-runtime/ArtifactManager/ArtifactManager-Part03]]
- [[PatchArtifacts-Part01]]
- [[JSONArtifacts-Part01]]
