---
title: ArtifactArchitecture Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-architecture
  - content-addressing
related:
  - "[[ArtifactArchitecture-Part02]]"
  - "[[PatchArtifacts-Part01]]"
---

# ArtifactArchitecture Specification (Part 03)

## Document Index

Part 01 - What an Artifact IS, the Artifact contract, and the propose/don't-mutate boundary
Part 02 - The metadata envelope (every field and its meaning)
Part 03 - Content addressing, immutability, and the content reference
Part 04 - Artifact kinds catalog and the type registry
Part 05 - Addressing, resolution, and how everything refers to an Artifact

# Content Addressing

An Artifact's bytes are addressed by content, not by name or path. The `contentHash` is derived from the bytes at creation and is the stable identity used for:

- deduplication (byte-identical content reuses one stored blob)
- caching of Verdicts (a Verdict is cached on `contentHash` plus verifier fingerprint)
- diffing between versions (the refine loop produces new bytes; diffing compares hashes)
- integrity checking (a corrupt blob fails the hash check and is rejected)

The `contentRef` is a stable pointer to where the bytes live. It is independent of the hash so that storage location can change without breaking references. Recommended reference forms:

- `sqlite://artifact_content/{id}` for small artifacts stored inline in SQLite
- `file://workspace/.Eulinx/artifacts/{id}` for large artifacts stored as files
- `blob://artifact-store/{id}` for artifacts in the dedicated blob store

The implementation may choose the concrete store, but the `contentRef` scheme MUST remain stable so that ArtifactManager, Verifier, and MergeManager all resolve the same bytes.

# Immutability

Once an Artifact reaches `created`, its bytes are immutable. No service may rewrite the blob behind a `contentRef`. If a Worker produces a change:

- it emits a NEW Artifact
- the new Artifact records `parentArtifactId` pointing at the old one
- the old Artifact keeps its bytes, hash, and verdicts exactly as they were

This immutability is what lets a Verifier and a MergeManager agree on exactly what was checked. It is also what makes Replay sound: a historical Verdict references a hash that can never change.

# Storage Tiers

The ArtifactManager SHOULD use storage tiers:

- Small text artifacts (patches, markdown, json, small code) MAY be stored inline in SQLite for fast indexing and search.
- Large artifacts (images, big logs, large code trees) SHOULD be stored as files addressed by `contentRef`, with metadata in SQLite.
- Binary artifacts MUST be stored as blobs, never inline, to keep the SQLite row small.
- Patch artifacts MUST be stored immutably and SHOULD be retained even after merge so the exact applied change is reconstructable.

# Integrity Checks

On every read through `contentRef`, the ArtifactManager SHOULD recompute or verify the `contentHash`. A mismatch MUST be treated as corruption:

- the Artifact MUST be marked `rejected` (or a dedicated `corrupt` substate)
- the EventBus MUST emit an integrity failure event
- the MergeManager MUST refuse to merge a corrupted Artifact

# Invariants

```text
contentHash is computed once, at creation, from the bytes.
contentRef points to immutable bytes.
A new revision is a new Artifact, not a mutated old one.
A corrupted Artifact is never merged.
Storage location may change; contentRef meaning must not.
```

# AI Notes

Do not cache or compare Artifacts by `id`. Use `contentHash` plus kind plus verifier fingerprint. IDs are per-version and a refine loop produces new IDs for byte-identical content more often than expected; caching on ID silently disables the cache.

Do not "patch" an existing Artifact's bytes to "fix" it. That breaks every Verdict and replay record that points at the old hash. Emit a new Artifact that derives from the old one.

Do not store binary blobs inline in SQLite. It bloats the database and slows every query that touches the row.

# Related Documents

- [[ArtifactArchitecture-Part02]]
- [[ArtifactArchitecture-Part04]]
- [[PatchArtifacts-Part01]]
- [[ArtifactVersioning-Part01]]
- [[04-memory/Replay/Replay-Part01]]
