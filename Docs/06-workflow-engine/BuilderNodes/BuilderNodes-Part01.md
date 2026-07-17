---
title: BuilderNodes Specification - Part 01
status: draft
version: 1.0
tags:
  - workflow-engine
  - builder-nodes
  - artifacts
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part02]]"
  - "[[VerifierNodes-Part01]]"
  - "[[BuilderNodes-Diagrams]]"
---

# BuilderNodes Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Builder Contract, and the Artifact Boundary
Part 02 - Prompt Binding, Context Assembly, and the Worker Invocation
Part 03 - Artifact Emission, the Artifact Reference, and Output Ports
Part 04 - The "MUST NOT Write The Project" Rule and Its Enforcement
Part 05 - Retries, Timeouts, Partial Artifacts, and Failure Modes
Part 06 - Validation, the Implementation Checklist, and Worked Examples
Diagrams - BuilderNodes-Diagrams.md

# Purpose

BuilderNodes defines the node family that produces Artifacts through AI Workers.

A Builder is the creative half of Eulinx's build-and-verify loop. Where a [[VerifierNodes-Part01]] checks, a Builder makes. But a Builder never applies what it makes. It proposes. It runs an AI Worker, captures the Worker's output as an Artifact, and emits an `artifact-ref` on its output port. What happens to that Artifact next — verification, then merging — is the job of other nodes and the [[MergeManager-Part01]]. The Builder is deliberately powerless over trusted project state.

This separation is the core safety property of the workflow engine. The README states it as a global principle: the WorkflowEngine MUST NOT let a node mutate trusted project state. The Builder is the node where that principle is most tested, because its whole purpose is to produce something a user wants in their project. It produces it as an Artifact instead.

# The Builder Contract

A Builder node obeys the base contract in [[NodeArchitecture-Part01]] with these specifics:

- Its `nodeKind` is `Builder`.
- Its required input is `spec` (text): the description of what to build.
- Its required output is `artifactRef` (artifact-ref): a reference to the produced Artifact.
- Its config selects the Worker, the prompt template, and the `artifactKind`.
- Its handler runs the Worker under a read-only permission profile by default.

The contract says nothing about files. It says "emit an artifact reference". That reference is the only thing that leaves the node toward the rest of the graph.

# The Artifact Boundary

The Artifact boundary is the line between "proposed change" and "applied change". A Builder stays on the proposed side:

```text
Builder  -> produces Artifact  -> artifact-ref on output port
Verifier -> checks Artifact    -> verdict
Merge    -> applies Artifact   -> trusted project state (under permission)
```

Nothing else may cross that line. A Builder that writes a file directly skips verification and the merge gate, defeating the entire safety model. This is why the [[NodeTypes-Part02]] catalog entry stresses that a Builder MUST NOT write the project.

# Invariants

```text
A Builder emits an artifact-ref, never a direct file write.
A Builder runs under a read-only permission profile by default.
A Builder's output is verified before it is merged.
A Builder reads only its declared input ports.
A Builder never opens a PTY or calls a provider API outside the ExecutionEngine.
The produced Artifact is content-addressed and immutable once stored.
```

# AI Notes

Do not let a Builder "helpfully" write its result to disk. That single convenience collapses the verify-then-merge boundary and makes unverified, unpermissioned changes to the user's project. The Builder proposes; the MergeManager applies.

Do not confuse Builder with Worker. A Worker may be granted writes; a Builder may not. If a step needs to edit files directly under permission, it is a Worker step, not a Builder step. Use the right kind.

Do not treat the Artifact as mutable after emission. Once stored, the Artifact is content-addressed and immutable; a later change is a new Artifact with a new reference. This immutability is what lets a Verifier and a Merge agree on exactly what was built.

# Related Documents

- [[06-workflow-engine/README]]
- [[BuilderNodes-Part02]]
- [[BuilderNodes-Diagrams]]
- [[NodeTypes-Part02]]
- [[VerifierNodes-Part01]]
- [[MergeManager-Part01]]
- [[Artifact-Part01]]
- [[NodeArchitecture-Part01]]
- [[PermissionManager-Part01]]
