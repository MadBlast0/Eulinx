---
title: ArtifactRelationships Specification - Part 02
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-relationships
  - derivation
related:
  - "[[ArtifactRelationships-Part01]]"
  - "[[ArtifactVersioning-Part01]]"
---

# ArtifactRelationships Specification (Part 02)

## Document Index

Part 01 - Relationship types, the relationship record, and provenance
Part 02 - Derivation chains, the refine loop, and replay reconstruction
Part 03 - References, search indexing, and relationship integrity

# Derivation Chains

A derivation chain is the ordered path of `parent-child` and `derived-from` edges from an initial Artifact to its latest descendant. For a coding task it typically looks like:

```text
plan
  -> task_list (derived-from plan)
     -> code (derived-from task_list item)
        -> patch (derived-from code)
           -> patch v2 (parent-child of patch v1, after refine)
              -> review (references patch v2)
```

Each link is recorded when created, so the chain is reconstructable without re-running anything.

# The Refine Loop

The refinement loop ([[10-ai-system/RefinementLoop/RefinementLoop-Part01]]) produces a sequence of Artifact versions. Each iteration:

1. takes the current candidate Artifact
2. a critic produces a `review` Artifact `references`-ing it
3. a refine Worker produces a new candidate Artifact with `parentArtifactId` = the old one
4. the new candidate is validated and verified independently

The chain of parent-child links IS the refine history. The Judge reads the chain to decide stop-or-continue. Replay reads the chain to show each pass.

# Replay Reconstruction

Replay ([[04-memory/Replay/Replay-Part01]]) reconstructs an execution by walking relationship edges:

- start from the triggering Artifact (for example a user `plan`)
- follow `derived-from` and `parent-child` to every downstream Artifact
- for each, resolve bytes via `artifact-ref` and replay the Verifier verdicts and merge results attached to it

Because relationships are explicit and Artifacts are immutable, replay is exact. Editing a result would break the chain; immutability guarantees it does not.

# Supersedes And Replacement

When a merged Artifact is later replaced (for example a bug fix patch supersedes the original), the replacement records `supersedes` pointing at the original. This lets the UI show "this change was later fixed by X" without altering the original's record. `supersedes` is informational; it does not change the original's `merged` status.

# Invariants

```text
Every refine iteration is a new Artifact with parent-child link.
The derivation chain is reconstructable from records alone.
Replay walks relationships; it never re-runs the Workers.
supersedes never mutates the superseded Artifact.
```

# AI Notes

Do not fake a refine loop by overwriting the same Artifact. Each pass is a new Artifact; the chain is the value.

Do not let Replay depend on live Workers. It depends on stored Artifacts and relationships, which is why immutability matters.

Do not drop `references` edges from reviews. The chain "code <- review" is how a human audits why a change was accepted or rejected.

# Related Documents

- [[ArtifactRelationships-Part01]]
- [[ArtifactRelationships-Part03]]
- [[ArtifactVersioning-Part01]]
- [[10-ai-system/RefinementLoop/RefinementLoop-Part01]]
- [[04-memory/Replay/Replay-Part01]]
