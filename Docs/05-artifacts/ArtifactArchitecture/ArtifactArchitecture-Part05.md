---
title: ArtifactArchitecture Specification - Part 05
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-architecture
  - addressing
related:
  - "[[ArtifactArchitecture-Part04]]"
  - "[[ArtifactRelationships-Part01]]"
---

# ArtifactArchitecture Specification (Part 05)

## Document Index

Part 01 - What an Artifact IS, the Artifact contract, and the propose/don't-mutate boundary
Part 02 - The metadata envelope (every field and its meaning)
Part 03 - Content addressing, immutability, and the content reference
Part 04 - Artifact kinds catalog and the type registry
Part 05 - Addressing, resolution, and how everything refers to an Artifact

# Addressing An Artifact

Everything in Eulinx that refers to a piece of work refers to it by Artifact reference, not by embedding bytes. The canonical reference form is the `artifact-ref`:

- it carries the `id`
- it MAY carry the `version` when a specific version is meant
- it MAY carry the `contentHash` when a content-stable pointer is needed
- it does NOT carry the bytes

An `artifact-ref` is what a Builder emits on its output port. It is what a Verifier receives on its input port. It is what a MergeManager is handed. It is what memory and context injection store instead of the full content (see [[04-memory/MemoryArchitecture/MemoryArchitecture-Part01]]).

# Resolution

Resolution always goes through the ArtifactManager. No service reads an Artifact's bytes by guessing a path. The resolution steps:

1. take the `artifact-ref`
2. look up the Artifact record by `id` (and `version` if present)
3. read the `contentRef`
4. load the bytes from the addressed store
5. verify the `contentHash` matches
6. return the bytes plus the envelope

If any step fails, resolution fails and the caller MUST NOT substitute a fallback read from the filesystem. The Artifact is the only sanctioned source of those bytes.

# Why References, Not Copies

Copying Artifact bytes into chats, memory, or other Artifacts causes drift: the copy diverges from the verified original, and the Verifier's verdict no longer applies to what is actually used. References keep a single immutable source of truth. Memory SHOULD prefer references to Artifacts over raw copied content ([[04-memory/README]]).

# Cross-References Between Topics

This section defines the Artifact object. The other topics in `05-artifacts` build on it:

- ArtifactLifecycle defines how the `status` field moves.
- ArtifactRelationships defines how `parentArtifactId` and `references` are used.
- ArtifactVersioning defines how `version` and the version chain work.
- The typed specs (PatchArtifacts, CodeArtifacts, and others) define per-kind rules.
- Verification defines how `verificationState` is set.
- MergeFlow defines how `mergeState` is set and how the Artifact is applied.

# Invariants

```text
An artifact-ref carries id, optionally version and contentHash, never bytes.
Resolution always routes through ArtifactManager.
A failed resolution never falls back to a filesystem read.
References are preferred over copied content in memory and context.
```

# AI Notes

Do not embed Artifact bytes into a chat message or another Artifact. Store the `artifact-ref` and let the consumer resolve it.

Do not resolve an Artifact by reading a guessed file path. The whole safety model depends on ArtifactManager being the single gate to those bytes.

Do not assume an `artifact-ref` with no `version` means "latest". It means "the Artifact identified by this id at its current version"; if a specific version matters, include it.

# Related Documents

- [[ArtifactArchitecture-Part04]]
- [[ArtifactRelationships-Part01]]
- [[ArtifactLifecycle-Part01]]
- [[Verification-Part01]]
- [[MergeFlow-Part01]]
- [[04-memory/MemoryArchitecture/MemoryArchitecture-Part01]]
