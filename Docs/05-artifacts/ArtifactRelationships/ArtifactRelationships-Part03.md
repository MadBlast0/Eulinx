---
title: ArtifactRelationships Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-relationships
  - indexing
related:
  - "[[ArtifactRelationships-Part02]]"
  - "[[04-memory/VectorMemory/VectorMemory-Part01]]"
---

# ArtifactRelationships Specification (Part 03)

## Document Index

Part 01 - Relationship types, the relationship record, and provenance
Part 02 - Derivation chains, the refine loop, and replay reconstruction
Part 03 - References, search indexing, and relationship integrity

# References In Context Injection

When context is assembled for a Worker ([[04-memory/ContextInjection/ContextInjection-Part01]]), related Artifacts are often more useful than the full transcript. The relationship graph drives selective injection:

- a Worker continuing a task receives the task's latest descendant Artifacts, not the whole chain
- a Worker reviewing code receives the `code`/`patch` plus its `review` references
- sensitivity is respected: a `secret` referenced Artifact is not injected into a Worker lacking clearance

References let Eulinx inject "the right Artifact" instead of "10,000 tokens of conversation" (per the product PRD).

# Search Indexing

The ArtifactManager indexes Artifacts for search ([[02-runtime/ArtifactManager/ArtifactManager-Part04]]). Relationship edges are indexed too, so a user can query "show me everything derived from this plan" or "show me the review for this patch". Tantivy provides the keyword/search index; LanceDB provides semantic search over embedded Artifact content ([[04-memory/VectorMemory/VectorMemory-Part01]]).

Secret and sensitive Artifacts MUST be excluded from semantic embeddings unless the workspace policy explicitly permits it.

# Relationship Integrity

Relationships MUST stay consistent:

- deleting or archiving an Artifact MUST NOT orphan required provenance; the edge remains but the target may be archived.
- a `parentArtifactId` MUST point at an Artifact in the same workspace.
- cycles are illegal: an Artifact MUST NOT be `derived-from` or `parent-child` of one of its own descendants. The ArtifactManager MUST reject a relationship that would create a cycle.
- dangling references (target Artifact id no longer exists and not archived) MUST be flagged and surfaced, never silently ignored.

# Invariants

```text
Relationships drive selective context injection.
Secret Artifacts are excluded from embeddings by default.
parentArtifactId stays within workspace.
Cycles are rejected at creation.
Dangling references are flagged, not ignored.
```

# AI Notes

Do not inject full Artifact chains into a Worker by default. Use the relationship graph to pick the minimal relevant set; this is the core context-blowup defense.

Do not let a relationship edges bypass sensitivity. A reference to a secret Artifact is still secret.

Do not allow cycles. A cycle makes "latest descendant" undefined and breaks replay.

# Related Documents

- [[ArtifactRelationships-Part01]]
- [[ArtifactRelationships-Part02]]
- [[04-memory/ContextInjection/ContextInjection-Part01]]
- [[04-memory/VectorMemory/VectorMemory-Part01]]
- [[02-runtime/ArtifactManager/ArtifactManager-Part04]]
