---
title: Verification Specification - Part 01
status: draft
version: 1.0
tags:
  - artifacts
  - verification
  - verifier
related:
  - "[[05-artifacts/README]]"
  - "[[Verification-Diagrams]]"
  - "[[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]"
---

# Verification Specification (Part 01)

## Document Index

Part 01 - Purpose, the verify-don't-mutate rule, and deterministic vs AI precedence
Part 02 - Deterministic verifiers (schema, lint, typecheck, build, test)
Part 03 - AI verifiers (critic, judge) and advisory scoring
Part 04 - Authorship exclusion, gates, and the pipeline boundary

# Purpose

Verification defines how an Artifact is checked before it may be merged. It is the "Verify" in the Eulinx rule:

```text
Worker -> Artifact -> Verify -> Merge
```

Verification turns an Artifact into a Verdict. The Verdict is what the lifecycle and the MergeManager consult. This section defines the verification model at the Artifact level; the node-level mechanics live in [[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]].

# The Core Rule

Verification is not authorship. The thing that checks the work MUST NOT be the thing that did the work. A Worker asked "is your own Artifact correct?" answers yes. This is enforced structurally, not by prompt. The Verifier that checks an Artifact MUST NOT be the Worker that produced it (Part 04).

# Deterministic Versus AI Precedence

Two classes of verification exist:

- Deterministic: runs a tool on the Artifact bytes and reports an exit code / structured result. Examples: schema, lint, typecheck, build, test. This is authoritative.
- AI: asks a model to judge the Artifact. Examples: critic, judge. This is advisory.

The precedence rule is non-negotiable:

```text
A passing deterministic verdict is a fact.
An AI verdict is an opinion with a confidence.
An AI verdict MUST NOT override a failing deterministic verdict.
A workflow MUST NOT configure an AI verdict to flip a deterministic fail to pass.
```

This is why a VerifierNode binds exactly one method and tags it with `class` ([[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]). The engine combines verdicts under rules it owns; it never lets an AI opinion silently defeat a build failure.

# Verification Is A Pure Function Of Content

Given the same Artifact bytes and the same verifier config (fingerprint), the Verdict MUST be identical. This is what makes caching by `contentHash + fingerprint` sound, what makes Replay exact, and what makes a red build mean something. A verifier that reads the network, the clock, or mutable global state is a bug.

# Invariants

```text
Verification yields a Verdict, never a direct file change.
Deterministic verdicts are authoritative; AI verdicts are advisory.
Producer != verifier (authorship exclusion).
Same bytes + same fingerprint => same Verdict.
An AI verdict cannot flip a deterministic fail.
```

# AI Notes

Do not implement verification as "ask the model if it's good". That is an AI verdict and is advisory only. Pair it with a deterministic check for anything that touches trusted state.

Do not let a workflow author configure an AI verdict to override a build failure. The engine rejects such a graph at validation time.

Do not cache on Artifact id. Cache on `contentHash + verifierFingerprint` or stale green verdicts will pass broken changes.

# Related Documents

- [[05-artifacts/README]]
- [[Verification-Part02]]
- [[Verification-Diagrams]]
- [[06-workflow-engine/VerifierNodes/VerifierNodes-Part01]]
- [[ArtifactLifecycle-Part03]]
- [[MergeFlow-Part01]]
