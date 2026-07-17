---
title: ArtifactVersioning Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-versioning
  - integrity
related:
  - "[[ArtifactVersioning-Part02]]"
  - "[[04-memory/Replay/Replay-Part01]]"
---

# ArtifactVersioning Specification (Part 03)

## Document Index

Part 01 - Version model, content-addressed immutability, and the version chain
Part 02 - Diffs between versions and the refine loop
Part 03 - Version queries, reconstruction, and integrity

# Version Queries

The ArtifactManager exposes version queries:

- list all versions of a chain (walk `parentArtifactId` from the latest back to root)
- get a specific version by `id` or by `version` number within a chain
- get the latest verified version (the newest version whose `verificationState = passed`)
- get the diff between any two versions
- get the full derivation+version graph for a task

These queries power the UI's version timeline and the refine-loop visualization (the "pass counter" in the product PRD).

# Reconstruction

Reconstruction rebuilds a work item's history purely from stored records:

1. find the root Artifact (version 1, no parent)
2. follow `parentArtifactId` to each descendant
3. for each, resolve bytes via `artifact-ref`
4. attach the Verdicts and merge results linked to that version

Because every step reads immutable stored data, reconstruction is exact and repeatable. This is the backbone of Replay ([[04-memory/Replay/Replay-Part01]]).

# Integrity

Version integrity checks:

- every version's `parentArtifactId` MUST resolve to an existing (or archived) Artifact in the same workspace.
- `version` numbers MUST be contiguous from 1 with no gaps and no duplicates within a chain.
- a version's `contentHash` MUST match its stored bytes on read (corruption => reject, never silently fix).
- no version MAY be `derived-from` a descendant of itself (cycle rule from ArtifactRelationships).

The ArtifactManager runs these checks during indexing and on demand. A broken chain MUST be flagged for the user; it MUST NOT be auto-repaired by guessing links.

# Invariants

```text
Version queries walk parent-child edges only.
Reconstruction reads immutable stored data exclusively.
version numbers are contiguous and unique per chain.
A broken chain is flagged, never auto-guessed.
```

# AI Notes

Do not reconstruct history by re-running Workers. Stored versions are the source of truth; re-running changes the result.

Do not auto-repair a broken version chain by inventing a parent link. Flag it; guessing links corrupts provenance.

Do not let `version` gaps go unflagged. A gap means a version was lost or misrecorded; that is an integrity event.

# Related Documents

- [[ArtifactVersioning-Part01]]
- [[ArtifactVersioning-Part02]]
- [[04-memory/Replay/Replay-Part01]]
- [[ArtifactRelationships-Part03]]
- [[ArtifactArchitecture-Part03]]
