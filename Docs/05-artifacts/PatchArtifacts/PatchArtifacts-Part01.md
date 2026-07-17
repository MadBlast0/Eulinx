---
title: PatchArtifacts Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - patch-artifacts
  - merge-unit
related:
  - "[[05-artifacts/README]]"
  - "[[PatchArtifacts-Diagrams]]"
  - "[[MergeFlow-Part01]]"
---

# PatchArtifacts Specification (Part 01)

## Document Index

Part 01 - What a patch Artifact IS and why it is the primary merge unit
Part 02 - The patch format, hunk model, and addressing
Part 03 - Application model and idempotency
Part 04 - Validation, conflict surface, and special cases

# Purpose

PatchArtifacts defines the `patch` kind: a self-contained, reviewable, mergeable description of changes to project files. It is the primary unit the MergeManager applies.

Where a `code` Artifact is "here is some source", a `patch` Artifact is "here is exactly how to change the project". That precision is what makes verification and merge safe and reviewable.

# What A Patch Artifact IS

A patch Artifact contains:

- a list of file operations (add, modify, delete, rename, mode-change)
- for modifications, hunks expressed against the file's base content
- the base revision each hunk is anchored to (so the MergeManager can detect drift)
- the target workspace-relative paths
- nothing else — no side effects, no commands to run

It is the minimal complete description of a change. A Builder that wants to change files emits a patch Artifact, not a shell command.

# Why Primary Merge Unit

The MergeManager prefers patch Artifacts because:

- they are reviewable line-by-line (a Verifier and a human can read them)
- they are conflict-detectable (hunks anchor to base revisions)
- they are reversible (a reverse patch is computable for rollback)
- they are language-agnostic (any text file can be patched)
- they keep the Builder powerless over trusted state (it only describes the change)

Other kinds (`code`, `markdown`, `json`) are mergeable too, but a multi-file source change is almost always expressed as a patch.

# Invariants

```text
A patch describes changes; it does not perform them.
A patch anchors hunks to base revisions for drift detection.
A patch is self-contained: no external commands required to apply.
A reverse patch is computable for rollback.
A patch Artifact is immutable once created.
```

# AI Notes

Do not let a Builder emit a shell command "to apply the change". That is exactly the avoided anti-pattern. Emit a patch Artifact.

Do not omit base revisions from hunks. Without them the MergeManager cannot tell whether the file moved under it, and conflict detection breaks.

Do not pack side effects (run tests, send email) into a patch. A patch is a pure delta.

# Related Documents

- [[05-artifacts/README]]
- [[PatchArtifacts-Part02]]
- [[PatchArtifacts-Diagrams]]
- [[MergeFlow-Part01]]
- [[06-workflow-engine/BuilderNodes/BuilderNodes-Part01]]
