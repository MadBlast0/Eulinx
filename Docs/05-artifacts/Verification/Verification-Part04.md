---
title: Verification Specification - Part 04
status: draft
version: 1.0
tags:
  - artifacts
  - verification
  - authorship
related:
  - "[[Verification-Part03]]"
  - "[[06-workflow-engine/VerifierNodes/VerifierNodes-Part05]]"
---

# Verification Specification (Part 04)

## Document Index

Part 01 - Purpose, the verify-don't-mutate rule, and deterministic vs AI precedence
Part 02 - Deterministic verifiers (schema, lint, typecheck, build, test)
Part 03 - AI verifiers (critic, judge) and advisory scoring
Part 04 - Authorship exclusion, gates, and the pipeline boundary

# Authorship Exclusion

The Verifier that checks an Artifact MUST NOT be the Worker that produced it. The engine computes the exclusion set from the Artifact's provenance at dispatch time; the workflow author MUST NOT be able to configure it away.

Two scopes:

- `node`: the verifying Worker's `workerId` MUST NOT equal the producer's `workerId`.
- `tree`: the verifying Worker's `rootWorkerId` MUST NOT equal the producer's `rootWorkerId` (catches the case where a child Worker "verifies" its parent's work).

If the producer is in the exclusion set, the Verifier emits `outcome: error` with `authorship_violation` and the Artifact cannot reach `verified` through that path.

# Gate Modes

A Verifier has a gate mode:

- `hard`: a non-pass verdict blocks every downstream edge. The Artifact cannot merge.
- `soft`: the verdict is recorded only; the graph proceeds. Used for advisory AI checks and non-blocking lints.

The precedence rule interacts with gates: a `hard` deterministic fail blocks regardless of any `soft` AI pass. A `hard` AI gate is contradictory (AI is advisory) and the engine MUST reject a graph that sets an AI method to `hard`, because that would let an opinion block merges — or worse, be configured to override facts.

# The Pipeline Boundary

Verification sits between Builder and MergeManager. The boundary rules:

- a Verifier MUST NOT mutate the project working tree
- a Verifier MUST NOT mutate the Artifact under verification
- a Verifier MUST NOT produce an Artifact of its own (the `verification_result` mirror is emitted by the runtime, not the node)
- a Verifier MUST NOT call the MergeManager

This keeps verification pure: same bytes in, same Verdict out, nothing else touched.

# Aggregation To Artifact State

When several Verifiers check one Artifact, the Artifact's `verificationState` aggregates:

- any hard deterministic `fail` -> `failed`, `status = rejected`
- all required checks `pass` -> `passed`, `status = verified`
- only soft/AI checks run -> `pending`, `status = validated`

The MergeManager reads this aggregation, never a single Verdict in isolation.

# Invariants

```text
Producer Worker != verifier Worker (node and tree scope).
A hard deterministic fail blocks merge.
An AI method cannot be a hard gate.
Verification mutates neither project nor Artifact.
verificationState aggregates all verifiers for the MergeManager.
```

# AI Notes

Do not let the author set `excludeWorkers: []`. The exclusion set is engine-computed; if the author could empty it, the core safety rule becomes a suggestion.

Do not make an AI verifier `hard`. AI is advisory; a hard AI gate is either meaningless or dangerous.

Do not let a Verifier write a "verification_result" Artifact itself. The runtime mirrors the Verdict; the node stays pure.

# Related Documents

- [[Verification-Part01]]
- [[Verification-Part02]]
- [[Verification-Part03]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part05]]
- [[ArtifactLifecycle-Part03]]
- [[MergeFlow-Part01]]
