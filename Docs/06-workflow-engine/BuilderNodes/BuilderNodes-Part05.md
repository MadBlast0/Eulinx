---
title: BuilderNodes Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - builder-nodes
  - failures
related:
  - "[[06-workflow-engine/README]]"
  - "[[BuilderNodes-Part01]]"
  - "[[BuilderNodes-Part04]]"
  - "[[NodeArchitecture-Part04]]"
---

# BuilderNodes Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Builder Contract, and the Artifact Boundary
Part 02 - Prompt Binding, Context Assembly, and the Worker Invocation
Part 03 - Artifact Emission, the Artifact Reference, and Output Ports
Part 04 - The "MUST NOT Write The Project" Rule and Its Enforcement
Part 05 - Retries, Timeouts, Partial Artifacts, and Failure Modes
Part 06 - Validation, the Implementation Checklist, and Worked Examples
Diagrams - BuilderNodes-Diagrams.md

# Purpose

Part 05 defines the Builder's retry and timeout behavior, how partial Artifacts are handled, and its named failure modes.

# Retries and Timeouts

A Builder inherits the base retry and timeout policy from [[NodeArchitecture-Part04]], with Builder-specific defaults: `maxAttempts` defaults to 3 (Builders run AI Workers, which are transiently flaky), and `timeoutMs` defaults to 300000. A retry re-dispatches the Builder with the same `iterationIndex` and discards the prior attempt's partial output. Retries apply only to retryable failures (Worker unavailable, timeout, transient tool error); they never apply to fatal failures (`artifact_missing`, `permission_denied`, `config_invalid`).

# Partial Artifacts

A Worker may emit a partial Artifact before failing (e.g. it crashed mid-generation). The Builder MUST NOT emit a partial Artifact as if it were complete. On a retryable failure, any partial Artifact from the failed attempt is discarded; the store may keep it for debugging but it is never referenced by the node's output port. On a terminal failure, the node is `failed` and emits no `artifactRef`. A partial Artifact must never reach a Verifier, because a Verifier would verify an incomplete build and might wrongly pass.

# Failure Modes

From the shared taxonomy ([[NodeTypes-Part05]]):

- `artifact_missing` — fatal. The Worker finished but emitted no Artifact.
- `worker_unavailable` — retryable. The Worker could not be started.
- `permission_denied` — fatal. The Builder or Worker attempted a write (see Part 04).
- `timeout` — retryable up to policy, then terminal.
- `config_invalid` — fatal. The Builder config failed schema validation.
- `prompt_bind_error` — fatal. A template referenced an undeclared port.

# Interaction With Refine Loops

When a Builder sits inside a [[LoopNodes-Part01]] refine loop (Builder -> Verifier -> back to Builder), each iteration's Artifact is a distinct reference. The loop's accumulator may collect references across iterations. The termination condition (Verifier passed, or iteration limit) decides when the loop exits. A Builder in a refine loop still obeys the no-write rule; only the final, verified Artifact is what a downstream Merge would apply.

# Invariants

```text
Retries re-dispatch with the same iterationIndex and discard partial output.
A partial Artifact never reaches the output port or a Verifier.
artifact_missing, permission_denied, config_invalid are never retried.
A Builder in a refine loop emits a distinct reference per iteration.
Timeouts are enforced by the ExecutionEngine, not the tick loop.
```

# AI Notes

Do not emit a partial Artifact on retryable failure. A Verifier that sees a half-built file may pass it, and then a Merge applies garbage. Discard partial output on failure; only a completed Artifact is reference-worthy.

Do not retry `artifact_missing`. If the Worker finished without producing an Artifact, retrying the same config will likely do it again. Fail closed and let the author fix the Worker or the prompt.

Do not let a refine loop's earlier Artifacts accumulate without bound. The loop accumulator should reference them, but the store's retention policy (not the engine) bounds the bytes. The RunContext holds only references.

# Related Documents

- [[06-workflow-engine/README]]
- [[BuilderNodes-Part01]]
- [[BuilderNodes-Part04]]
- [[BuilderNodes-Part06]]
- [[BuilderNodes-Diagrams]]
- [[NodeArchitecture-Part04]]
- [[NodeTypes-Part05]]
- [[LoopNodes-Part01]]
- [[VerifierNodes-Part01]]
