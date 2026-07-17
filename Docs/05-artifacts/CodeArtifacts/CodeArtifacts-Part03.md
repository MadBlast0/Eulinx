---
title: CodeArtifacts Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - code-artifacts
  - merge
related:
  - "[[CodeArtifacts-Part02]]"
  - "[[PatchArtifacts-Part03]]"
---

# CodeArtifacts Specification (Part 03)

## Document Index

Part 01 - What a code Artifact IS and its structure
Part 02 - Review rules and language-agnostic handling
Part 03 - Verification obligations and merge semantics

# Verification Obligations

A code Artifact destined to change the project SHOULD be verified by deterministic Verifiers appropriate to its language:

- `lint` for style and obvious errors
- `typecheck` when the language has a type checker (TypeScript, Rust, etc.)
- `build` to confirm it compiles in the sandbox
- `test` to confirm behavior

The Verifier runs against the code Artifact's bytes (or a sandbox tree built from a derived patch), never against the live project, so it checks the proposed change, not the pre-existing code ([[Verification-Part03]]).

# Merge Semantics

A code Artifact is usually NOT merged directly. The safer path is:

1. the code Artifact is turned into a `patch` Artifact (by a Builder or a conversion step) that describes exactly how to write the files
2. the patch is verified and merged by the MergeManager

Direct merge of a code Artifact (writing its `targetPath` content) is permitted only for single-file, non-destructive adds under an allowing permission profile, and still goes through the MergeManager. Multi-file or modifying code Artifacts MUST go through a patch.

# Refine Loop On Code

Code is the most common refine-loop target. Each refine pass produces a new code Artifact version; the Judge diffs them on structure and behavior (test results). The selected verified version becomes the patch that merges (ArtifactVersioning Part 02).

# Invariants

```text
Code meant to change files is merged via a derived patch, not directly.
Verification runs against the Artifact bytes / sandbox, not live project.
Multi-file or modifying code requires a patch for merge.
The merged version is explicitly selected by the Judge.
```

# AI Notes

Do not merge a multi-file code Artifact by writing files one by one outside a patch. That loses atomicity and rollback.

Do not verify code against the real repo. Verify the proposed Artifact so the verdict means something.

Do not skip the typecheck/build because "it's just a small change". Small changes break builds too, and the deterministic Verifier is the floor.

# Related Documents

- [[CodeArtifacts-Part02]]
- [[PatchArtifacts-Part01]]
- [[PatchArtifacts-Part03]]
- [[Verification-Part03]]
- [[ArtifactVersioning-Part02]]
