---
title: BuilderNodes Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - builder-nodes
  - validation
  - checklist
related:
  - "[[06-workflow-engine/README]]"
  - "[[BuilderNodes-Part01]]"
  - "[[BuilderNodes-Part05]]"
  - "[[WorkflowEngine-Part02]]"
---

# BuilderNodes Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, the Builder Contract, and the Artifact Boundary
Part 02 - Prompt Binding, Context Assembly, and the Worker Invocation
Part 03 - Artifact Emission, the Artifact Reference, and Output Ports
Part 04 - The "MUST NOT Write The Project" Rule and Its Enforcement
Part 05 - Retries, Timeouts, Partial Artifacts, and Failure Modes
Part 06 - Validation, the Implementation Checklist, and Worked Examples
Diagrams - BuilderNodes-Diagrams.md

# Purpose

Part 06 covers the Builder's validation at graph load, an implementer checklist, and two worked examples showing a Builder in isolation and in a refine loop.

# Validation at Graph Load

Before a run starts, every Builder node is checked:

- its config schema validates (`workerId`, `promptTemplate`, `artifactKind`, `storeId`);
- its `promptTemplate` references only declared input ports;
- its `permissionProfileId`, if overridden, is read-only; a write profile is rejected as `graph_invalid`;
- its output port `artifactRef` is connected to a downstream node (a Builder with no consumer is allowed only if it is an explicit terminal, but normally it feeds a Verifier);
- it is not wired directly to trusted-state input of any node without a Verifier and Merge in between.

# Implementer Checklist

- Resolve inputs; bind prompt; assemble serializable context package.
- Build an `ExecutionRequest` with a read-only profile; hand to ExecutionEngine.
- On result, require an emitted Artifact; store it content-addressed.
- Emit `artifactRef`; mark `succeeded`. On missing Artifact, fail `artifact_missing`.
- Discard partial output on retryable failure; never emit it.
- Persist the node transition with `runSeq`; emit events after commit.

# Worked Example 1 — Builder Alone

A single Builder node `build` takes `spec = "add a retry helper to utils.ts"`, binds the prompt, runs the Worker read-only, and emits `artifactRef = store:default/hash:abc123 (kind: source-diff)`. A Verifier node downstream consumes that reference. The project files are untouched until the Merge applies the verified diff.

# Worked Example 2 — Builder in a Refine Loop

A [[LoopNodes-Part01]] refine loop contains `build` (Builder) -> `check` (Verifier) -> Condition `passed?` -> back to `build` or out to `merge`. Each iteration emits a new `artifactRef`. The loop exits when `check` returns `passed` or `maxIterations` is hit. The final verified reference flows to the Merge. Across the loop, the project is never written; only the artifact store accumulates candidate diffs.

# Invariants

```text
A Builder's prompt binds only to declared ports.
A Builder's profile is read-only; a write profile fails validation.
A Builder emits exactly one artifactRef on success.
Partial output is discarded on failure and never emitted.
A Builder feeds a Verifier, not trusted state, directly.
```

# AI Notes

Do not skip the "read-only profile" validation check. It is the cheapest, most reliable guard against a Builder writing the project, and it runs before any Worker is spawned.

Do not let a Builder with no downstream consumer pass silently in a safety-critical graph. A Builder that builds but is never verified or merged is dead work; flag it in validation as a warning at minimum.

Do not forget to persist the emitted reference inside the same transaction as the `succeeded` state. If the reference is written but the state commit fails, replay will see a `succeeded` node with no value and the run breaks.

# Related Documents

- [[06-workflow-engine/README]]
- [[BuilderNodes-Part01]]
- [[BuilderNodes-Part05]]
- [[BuilderNodes-Diagrams]]
- [[WorkflowEngine-Part02]]
- [[LoopNodes-Part01]]
- [[VerifierNodes-Part01]]
- [[MergeManager-Part01]]
- [[PermissionManager-Part01]]
