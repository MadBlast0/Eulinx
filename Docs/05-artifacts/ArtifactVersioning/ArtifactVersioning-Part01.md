---
title: ArtifactVersioning Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-versioning
  - immutability
related:
  - "[[05-artifacts/README]]"
  - "[[ArtifactVersioning-Diagrams]]"
  - "[[ArtifactArchitecture-Part03]]"
---

# ArtifactVersioning Specification (Part 01)

## Document Index

Part 01 - Version model, content-addressed immutability, and the version chain
Part 02 - Diffs between versions and the refine loop
Part 03 - Version queries, reconstruction, and integrity

# Purpose

ArtifactVersioning defines how Eulinx handles successive revisions of the same piece of work. Because Artifacts are immutable, a "new version" is a new Artifact that links to its predecessor. This part defines that model.

# The Version Model

Each Artifact has a `version` integer within its version chain. The chain is rooted at the first Artifact of a kind produced for a given intent (for example the first draft of a patch for a task).

Rules:

- the first Artifact in a chain has `version = 1` and no `parentArtifactId`.
- each subsequent revision has `version = parent.version + 1` and `parentArtifactId = parent.id`.
- the `id` is unique per Artifact; multiple versions have distinct ids. An `artifact-ref` without a `version` resolves to the Artifact by `id`, which is already a specific version.
- versions are append-only; there is no "delete version 3".

# Content-Addressed Immutability

Versioning leans entirely on immutability (ArtifactArchitecture Part 03). Because bytes never change:

- a version's `contentHash` is fixed forever
- a Verdict cached on that hash stays valid
- Replay can reproduce the exact bytes of any historical version
- diffing two versions is a pure function of their two hashes

There is no "edit in place". The refine loop's entire value is the sequence of immutable versions; if versions mutated, you could not show what changed between passes.

# Version Chain Versus Relationships

The version chain is a specific kind of relationship: strictly `parent-child` in order, monotonic `version` numbers. It is a subset of ArtifactRelationships. The chain is what the Judge and Replay walk for "this work item's history"; broader `derived-from` edges describe cross-item dependence (plan -> code).

# Invariants

```text
version is monotonic within a chain.
A new version is a new Artifact with a new id and hash.
parentArtifactId links version N to version N-1.
No version is ever mutated or deleted; only archived.
The chain is reconstructable from parent-child edges.
```

# AI Notes

Do not implement "versions" by overwriting one Artifact's bytes. That destroys the history the refine loop and Replay depend on.

Do not let `version` be a mutable label. It is assigned by the parent link; treat it as derived, not editable.

Do not assume version 1 is "best". The Judge decides which version (if any) is merged; later is not automatically better.

# Related Documents

- [[05-artifacts/README]]
- [[ArtifactVersioning-Part02]]
- [[ArtifactVersioning-Diagrams]]
- [[ArtifactArchitecture-Part03]]
- [[ArtifactRelationships-Part02]]
