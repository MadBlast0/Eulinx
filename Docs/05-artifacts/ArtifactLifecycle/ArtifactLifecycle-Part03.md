---
title: ArtifactLifecycle Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - artifact-lifecycle
  - verification
related:
  - "[[ArtifactLifecycle-Part02]]"
  - "[[Verification-Part01]]"
---

# ArtifactLifecycle Specification (Part 03)

## Document Index

Part 01 - Purpose, the lifecycle state machine, and the boundary rule
Part 02 - Creation by Builder/Worker and validation
Part 03 - Verification entry and the verified state
Part 04 - Approval gates and human-in-the-loop
Part 05 - Merge and the merged state
Part 06 - Expiry, archival, and garbage collection

# Verification Entry

The `validated -> verified` (or `validated -> rejected`) transition is driven by Verification. A VerifierNode receives the Artifact's `artifact-ref`, runs its method, and emits a Verdict ([[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]).

The Artifact's `verificationState` is updated from the Verdict:

- `pass` -> `verificationState = passed`, and if the Verifier was a hard gate, `status = verified`.
- `fail` / `timeout` / `error` -> `verificationState = failed`, `status = rejected`.
- `skipped` -> `verificationState = pending`, `status` stays `validated` (the gate did not block, but the Artifact is not yet verified).

# Authoritative Verification

Deterministic verification (schema, lint, typecheck, build, test) is authoritative. An Artifact reaches `verified` only when its required deterministic checks pass. AI verification (critic, judge) is advisory and MUST NOT, on its own, move an Artifact to `verified` if a required deterministic check failed ([[Verification-Part01]]).

# Multiple Verifiers

An Artifact may be checked by several Verifiers in a workflow. The lifecycle tracks the overall state:

- if ANY required hard-gate deterministic Verifier fails -> `rejected`.
- if all required Verifiers pass -> `verified`.
- if only soft-gate or AI Verifiers have run -> `validated` (pending authoritative confirmation).

This is why `verificationState` is on the Artifact, not inside a single Verdict: it is the aggregation the MergeManager consults.

# Re-Verification After Revision

When a refine loop produces a new Artifact version (ArtifactVersioning), that new version starts at `created` and must be validated and verified independently. The old version keeps its verdicts. A passing verdict on version 2 does not retroactively verify version 1.

# Invariants

```text
verified requires a passing authoritative (deterministic) verdict.
An AI verdict alone cannot set verified when a deterministic check failed.
verificationState is the aggregation the MergeManager reads.
Each version is verified independently; verdicts are not inherited across versions.
```

# AI Notes

Do not set an Artifact to `verified` because a critic "liked it". The deterministic floor must pass.

Do not carry a version 1 verdict onto version 2. The bytes changed; the verdict does not travel.

Do not let the producer Worker also be the Verifier. Authorship exclusion is enforced by the engine, not configured by the author ([[06-workflow-engine/VerifierNodes/VerifierNodes-Part05]]).

# Related Documents

- [[ArtifactLifecycle-Part02]]
- [[ArtifactLifecycle-Part04]]
- [[Verification-Part01]]
- [[Verification-Part03]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]
