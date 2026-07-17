---
title: BuilderNodes Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - builder-nodes
  - artifact-emission
related:
  - "[[06-workflow-engine/README]]"
  - "[[BuilderNodes-Part01]]"
  - "[[BuilderNodes-Part02]]"
  - "[[Artifact-Part01]]"
---

# BuilderNodes Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Builder Contract, and the Artifact Boundary
Part 02 - Prompt Binding, Context Assembly, and the Worker Invocation
Part 03 - Artifact Emission, the Artifact Reference, and Output Ports
Part 04 - The "MUST NOT Write The Project" Rule and Its Enforcement
Part 05 - Retries, Timeouts, Partial Artifacts, and Failure Modes
Part 06 - Validation, the Implementation Checklist, and Worked Examples
Diagrams - BuilderNodes-Diagrams.md

# Purpose

Part 03 defines how a Builder's Worker output becomes an Artifact and how that Artifact leaves the node as an `artifact-ref`.

# Artifact Emission

When the ExecutionEngine returns a `NodeResult` for a Builder, the result carries the Worker's emitted Artifact (or a marker that none was emitted). The Builder handler:

1. Validates that an Artifact was actually emitted. If the Worker returned text but no Artifact, the node fails with `artifact_missing` (fatal) — a Builder that produces no Artifact is broken, not merely empty.
2. Stores the Artifact in the artifact store under the `storeId` from config, content-addressed by its hash.
3. Produces an `artifactRef` value: the store id plus the content hash, optionally with a human label.
4. Writes that `artifactRef` to the node's `artifactRef` output port in the RunContext.
5. Marks the node `succeeded`.

The Artifact itself lives in the artifact store, not in the RunContext (which holds only the small reference). This keeps the RunContext bounded even for large generated files.

# The Artifact Reference

An `artifact-ref` is a value, not a file handle. It names:

- `storeId`: which artifact store holds the bytes.
- `contentHash`: the content address, so the reference is immutable and self-verifying.
- `kind`: the `artifactKind` (e.g. `source-diff`, `document`, `config`).
- `label`: an optional human-readable name for the UI.

Downstream nodes (a Verifier, a Merge) consume the reference and resolve the bytes from the store on demand. They never receive the bytes inline unless the edge explicitly requests expansion (and even then, the bytes come from the store, not from the Builder's memory).

# Immutability

Once stored, an Artifact is immutable. A later Builder run that "changes" the output stores a new Artifact with a new hash and emits a new reference. The old reference still points at the old, unchanged bytes. This immutability is what lets a Verifier and a Merge agree on exactly what was built, and it is what makes the verify-then-merge sequence safe under replay.

# Invariants

```text
A Builder with no emitted Artifact fails with artifact_missing.
The Artifact is stored content-addressed before the node succeeds.
The output port carries an artifact-ref, not the bytes.
An Artifact is immutable once stored.
A new build is a new Artifact with a new reference.
The RunContext holds the reference, not the bytes.
```

# AI Notes

Do not emit the Artifact bytes inline on the output port. The RunContext is for references and small values; large bytes belong in the store. Inline bytes bloat every checkpoint and every replay record.

Do not let a Builder "update" an existing Artifact. Emitting a new reference for a new build is what preserves immutability. Update-in-place makes verification and replay unsound.

Do not succeed a Builder that produced only free-text and no Artifact. A Builder's contract is to produce an Artifact; text alone is a Worker's job. Failing with `artifact_missing` surfaces the design error early.

# Related Documents

- [[06-workflow-engine/README]]
- [[BuilderNodes-Part01]]
- [[BuilderNodes-Part02]]
- [[BuilderNodes-Part04]]
- [[BuilderNodes-Diagrams]]
- [[Artifact-Part01]]
- [[VerifierNodes-Part01]]
- [[MergeManager-Part01]]
- [[NodeArchitecture-Part02]]
