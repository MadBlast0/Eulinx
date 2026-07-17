---
title: Coding Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - coding
related:
  - "[[Coding-Part02]]"
  - "[[Coding-Part04]]"
  - "[[ArtifactManager-Part01]]"
---

# Coding Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Coding Feature Model
Part 02 - Agentic Coding Loop and Multi-File Refactors
Part 03 - Inline Editor, Diffs, and Artifact Review
Part 04 - PR / Commit Automation and Release Notes
Part 05 - Refinement on Code, Safety, and AI Notes

# Inline Editor

Eulinx provides an inline editor surface for reviewing and tweaking Artifacts before they are merged. The editor is a feature-layer component only; it MUST NOT hold the source of truth for a file. The source of truth is the workspace tree (read through the Rust FS service) and the Artifact store (the pending change).

The inline editor lets the user:

- open a file from the project tree
- open a pending Artifact (a patch) side by side
- make small manual edits to the proposed change
- stage the edited Artifact back into the merge queue

# Diffs

Every Artifact that modifies files exposes a diff. The diff viewer MUST show:

- the file path
- the hunk range
- added lines, removed lines, and context
- the owning worker (for provenance)
- the verification status of the Artifact

Diffs are read-only with respect to the live tree until the user accepts the merge. The MergeManager is the only authority that writes accepted changes back to disk.

# Artifact Review

The review surface is where the user decides what to accept. For each Artifact the user may:

- accept (queue for merge)
- reject (discard the Artifact, worker is notified)
- comment (attaches a note that flows back to the owning worker's channel)
- request changes (routes back to the worker for another loop)

Review MUST support batches: accept all verified Artifacts in a phase with one action, subject to a permission check for destructive or external effects.

# Related Documents

- [[Coding-Part04]]
- [[ArtifactManager-Part01]]
