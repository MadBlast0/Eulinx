---
title: ArtifactArchitecture Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-architecture
  - metadata
related:
  - "[[ArtifactArchitecture-Part01]]"
  - "[[ArtifactLifecycle-Part01]]"
---

# ArtifactArchitecture Specification (Part 02)

## Document Index

Part 01 - What an Artifact IS, the Artifact contract, and the propose/don't-mutate boundary
Part 02 - The metadata envelope (every field and its meaning)
Part 03 - Content addressing, immutability, and the content reference
Part 04 - Artifact kinds catalog and the type registry
Part 05 - Addressing, resolution, and how everything refers to an Artifact

# The Metadata Envelope

Every Artifact carries a metadata envelope. This is the data that makes an Artifact traceable, searchable, verifiable, replayable, and safely mergeable. The bytes are meaningless without it.

The envelope MUST contain the following fields. Each field has one meaning and one owner.

- `id`: the stable unique identifier assigned by the ArtifactManager at creation. Never reused, never reassigned.
- `workspaceId`: the workspace this Artifact belongs to. Artifacts MUST NOT cross workspace boundaries.
- `projectId`: the project folder the Artifact is scoped to, when one is active.
- `sessionId`: the terminal/agent session that produced it, when applicable.
- `executionId`: the runtime execution that produced it, when applicable.
- `workflowId`: the workflow that produced it, when applicable.
- `taskId`: the Task this Artifact is an output of, when applicable.
- `workerId`: the Worker (or Builder node's bound Worker) that produced it. This is the authorship record used by the Verifier's exclusion set.
- `rootWorkerId`: the root of the worker tree that produced it, used for tree-scoped authorship exclusion.
- `kind`: the artifact kind from the registry (for example `patch`, `code`, `markdown`, `json`, `image`, `test_report`).
- `title`: a short human-readable title.
- `description`: an optional longer description of what the Artifact represents.
- `contentRef`: a stable reference to where the bytes live (see Part 03).
- `contentType`: the MIME-ish content type of the bytes (for example `text/x-patch`, `text/markdown`, `application/json`, `image/png`).
- `status`: the lifecycle state (`draft`, `created`, `validated`, `verified`, `rejected`, `merged`, `archived`).
- `version`: the version number within the Artifact's version chain (see ArtifactVersioning).
- `parentArtifactId`: the Artifact this one derives from, when it is a refinement or revision.
- `sensitivity`: one of `public`, `internal`, `sensitive`, `secret`. Drives redaction and access control.
- `contentHash`: a content hash of the bytes, used for caching, dedup, diffing, and verification identity.
- `verificationState`: the latest verification outcome for this Artifact (`unverified`, `pending`, `passed`, `failed`).
- `mergeState`: the latest merge outcome (`unmerged`, `eligible`, `merged`, `rejected`, `conflicted`).
- `createdAt`: creation timestamp.
- `updatedAt`: last transition timestamp.

# Optional Extended Metadata

The envelope MAY carry additional structured metadata:

- `tags`: free-form labels for search and grouping.
- `sourceNodeId`: the workflow node that emitted the Artifact.
- `provenanceChain`: an ordered list of ancestor Artifact ids for audit.
- `sizeBytes`: the byte size of the content.
- `checksumAlgo`: the algorithm used for `contentHash`.
- `expiresAt`: an optional expiry timestamp after which the Artifact may be garbage-collected (see ArtifactLifecycle).
- `schemaRef`: for structured kinds, a reference to the schema the content claims to satisfy.

# Sensitivity And Redaction

The `sensitivity` field is not decorative. It is enforced:

- `public`: safe to surface in any Worker context.
- `internal`: surfaced within the workspace only.
- `sensitive`: surfaced only to authorized Workers and the user; redacted from broad context injection.
- `secret`: MUST NOT be injected into any Worker context and MUST NOT be indexed for semantic search. Stored encrypted at rest where the platform supports it.

Memory and context injection MUST respect `sensitivity` (see [[04-memory/MemoryRules/MemoryRules-Part01]]). An Artifact MUST NOT be summarized or referenced into a Worker's context if that would expose a higher-sensitivity Artifact than the Worker is permitted to see.

# Invariants

```text
id is assigned by ArtifactManager and is immutable.
workspaceId is set at creation and never changes.
workerId and rootWorkerId are set at creation for authorship enforcement.
contentHash is computed from the bytes and recomputed never (bytes immutable).
sensitivity is set at creation and may only be raised, never lowered, without human approval.
status transitions only through the lifecycle state machine.
```

# AI Notes

Do not drop the metadata to save effort. A bare file with no envelope is not an Artifact and cannot be verified, merged, replayed, or audited. The metadata is the product.

Do not lower an Artifact's sensitivity after the fact. If something was `secret`, promoting it to `internal` requires explicit human approval; otherwise the redaction model breaks.

Do not let `workerId` be "unknown". Authorship exclusion (Verification) and conflict ownership (MergeFlow) depend on it being accurate.

# Related Documents

- [[ArtifactArchitecture-Part01]]
- [[ArtifactArchitecture-Part03]]
- [[ArtifactLifecycle-Part01]]
- [[ArtifactVersioning-Part01]]
- [[04-memory/MemoryRules/MemoryRules-Part01]]
