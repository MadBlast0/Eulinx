---
title: BuilderNodes Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - builder-nodes
  - safety
related:
  - "[[06-workflow-engine/README]]"
  - "[[BuilderNodes-Part01]]"
  - "[[BuilderNodes-Part03]]"
  - "[[PermissionManager-Part01]]"
---

# BuilderNodes Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Builder Contract, and the Artifact Boundary
Part 02 - Prompt Binding, Context Assembly, and the Worker Invocation
Part 03 - Artifact Emission, the Artifact Reference, and Output Ports
Part 04 - The "MUST NOT Write The Project" Rule and Its Enforcement
Part 05 - Retries, Timeouts, Partial Artifacts, and Failure Modes
Part 06 - Validation, the Implementation Checklist, and Worked Examples
Diagrams - BuilderNodes-Diagrams.md

# Purpose

Part 04 is the enforcement half of the Builder's central rule: a Builder MUST NOT write to the project.

This is not a suggestion. It is the safety property that makes the entire build-and-verify loop trustworthy. If a Builder could write the project directly, a buggy or hijacked Worker could mutate user files with no verification and no permission gate. The rule is enforced at three layers: permission, artifact store isolation, and validation.

# The Rule

A Builder node, and the Worker it invokes, MUST NOT:

- open or modify any file under the project or workspace tree;
- call any tool that performs a file write, a delete, or a rename in trusted state;
- emit anything that the MergeManager would treat as an already-applied change;
- hold or receive a permission profile that grants project-write.

A Builder MAY read project files (read-only) to inform what it builds, subject to its read-only profile. Reading is safe; writing is not.

# Enforcement Layer 1 — Permission

The Builder's `ExecutionRequest` carries a read-only permission profile by default (see [[PermissionManager-Part01]]). The ExecutionEngine evaluates permission per execution; a write attempt is denied with `permission_denied` (fatal). This is the primary, runtime enforcement: even a Worker that tried to write would be blocked by the adapter's permission check.

# Enforcement Layer 2 — Artifact Store Isolation

The Builder writes only to the artifact store, which is a separate, content-addressed store, not the project tree. There is no code path by which a Builder's output reaches the project except through a Merge node that consumes the `artifact-ref`. The store and the project are physically distinct locations, so "accidental" writes are structurally impossible.

# Enforcement Layer 3 — Validation

At graph-validation time, the engine checks that a Builder node's config does not request a write permission profile and is not wired (via an illegal edge) to anything that would apply its output without a Verifier and a Merge in between. A graph that tries to wire a Builder straight to trusted state is rejected as `graph_invalid`. This catches design errors before any Worker runs.

# Why Read-Only Is Enough

A Builder only needs to propose. It reads the project to understand context, builds an Artifact describing the change, and emits the reference. The change becomes real only when a Verifier confirms it and a Merge applies it under an explicit permission decision. Read-only is therefore not a limitation; it is the correct division of labor.

# Invariants

```text
A Builder runs under a read-only permission profile by default.
A Builder writes only to the artifact store, never the project tree.
A Builder may not hold a write permission profile.
A graph wiring a Builder straight to trusted state is rejected.
A write attempt at runtime fails with permission_denied.
The only path from Builder to project is Verifier then Merge.
```

# AI Notes

Do not grant a Builder a write profile "just in case". There is no case. If a step must write, it is a Worker or a Merge, not a Builder. Granting write to a Builder is the single most common way teams accidentally bypass verification.

Do not let a Builder emit an already-applied change. The Artifact is a proposal. If it is applied, that is the MergeManager's act, under permission, after verification. The Builder never applies.

Do not treat read-only as optional for replay safety. Replay re-runs Builders; a Builder that wrote the project during the original run would make replay non-idempotent and dangerous. Read-only is what makes replay safe to re-execute.

# Related Documents

- [[06-workflow-engine/README]]
- [[BuilderNodes-Part01]]
- [[BuilderNodes-Part03]]
- [[BuilderNodes-Part05]]
- [[BuilderNodes-Diagrams]]
- [[PermissionManager-Part01]]
- [[MergeManager-Part01]]
- [[VerifierNodes-Part01]]
- [[Artifact-Part01]]
