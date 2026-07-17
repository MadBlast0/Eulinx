---
title: ArtifactRelationships Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-relationships
  - provenance
related:
  - "[[05-artifacts/README]]"
  - "[[ArtifactRelationships-Diagrams]]"
  - "[[ArtifactArchitecture-Part02]]"
---

# ArtifactRelationships Specification (Part 01)

## Document Index

Part 01 - Relationship types, the relationship record, and provenance
Part 02 - Derivation chains, the refine loop, and replay reconstruction
Part 03 - References, search indexing, and relationship integrity

# Purpose

ArtifactRelationships defines how Artifacts connect to each other. An Artifact rarely stands alone: a plan Artifact becomes a task_list Artifact; a task_list spawns code Artifacts; a code Artifact becomes a patch Artifact; a patch is reviewed and produces a review Artifact. These links are what turn a pile of outputs into a traceable graph of work.

# Relationship Types

Eulinx recognizes these directed relationships between Artifacts:

- `parent-child`: a derived Artifact records its source via `parentArtifactId`. The child is a revision or specialization of the parent.
- `derived-from`: a explicit "was produced using this Artifact as input" edge. Broader than parent-child; a code Artifact may be `derived-from` a plan Artifact without being a revision of it.
- `references`: a non-derivative pointer. An Artifact mentions or depends on another without producing it. For example a `review` Artifact `references` the `code` Artifact it reviewed.
- `supersedes`: a newer version that intentionally replaces an older one for a given purpose (used by the refine loop and by merge replacement).
- `attached-to`: an Artifact is supplementary context for another (for example a `log` attached to a `test_report`).

# The Relationship Record

Each relationship is stored as a small record, not inferred from free text:

- `fromArtifactId`: the dependent Artifact
- `toArtifactId`: the source Artifact
- `relation`: one of the type names above
- `createdAt`: when the edge was recorded
- `createdBy`: the actor (Worker, node, or system) that established it
- `context`: optional note (for example "refine pass 3", "review of hunk 2")

The ArtifactManager writes these records at creation or when a node declares an output dependency. They are first-class and queryable.

# Provenance Versus Relationships

Provenance (who produced the Artifact: `workerId`, `taskId`, `workflowId`) answers "where did THIS come from?". Relationships answer "how does THIS connect to OTHER work?". Both are kept: provenance is on the envelope; relationships are the graph. A `review` Artifact has provenance (the critic Worker) and a `references` edge to the code it reviewed.

# Invariants

```text
Relationships are explicit records, not parsed from content.
parentArtifactId is set at creation of the child.
A relationship never changes the referenced Artifact's bytes (immutability).
derived-from and parent-child both preserve the chain for replay.
```

# AI Notes

Do not bury relationships inside Artifact text. Store them as relationship records so search, replay, and the UI can traverse the graph.

Do not create a `derived-from` edge that points at a different workspace. Relationships MUST stay within workspace scope.

Do not let a relationship imply a content change. Pointing at an Artifact never mutates it.

# Related Documents

- [[05-artifacts/README]]
- [[ArtifactRelationships-Part02]]
- [[ArtifactRelationships-Diagrams]]
- [[ArtifactArchitecture-Part02]]
- [[ArtifactVersioning-Part01]]
