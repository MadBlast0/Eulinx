---
title: VerifierNodes Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - verifier-nodes
  - authorship
  - gates
related:
  - "[[06-workflow-engine/README]]"
  - [[VerifierNodes-Part01]]
  - [[VerifierNodes-Part04]]
  - [[BuilderNodes-Part04]]
---

# VerifierNodes Specification ( Part 05 )

## Document Index

Part 01 - Purpose, philosophy, object model, states, invariants
Part 02 - The verifier node config and its validation
Part 03 - Deterministic verifiers: schema, lint, typecheck, build, test
Part 04 - AI verifiers: critic and judge, scoring, thresholds
Part 05 - The authorship rule, gates, and the pipeline boundary
Part 06 - Caching, failure routing, timeouts, checklist, examples
Diagrams - VerifierNodes-Diagrams.md

# Purpose

Part 05 states the two rules that make verifiers trustworthy: the authorship rule (a verifier must not verify its own artifact) and the gate rule (how a verdict becomes a pipeline boundary that blocks or allows a merge).

# The Authorship Rule

A Verifier node MUST NOT verify an Artifact that the same node produced. More precisely, within a run, a Verifier MUST NOT consume an `artifact-ref` whose producing node is the Verifier itself, nor one whose producing Builder shares the Verifier's lineage such that the check is circular. This is enforced two ways:

- At graph-validation time, the engine rejects a graph where a Verifier's `artifactRef` input traces back (through edges) to that same Verifier as the producer.
- At run time, if a Builder and a Verifier are the same node kind instance or are wired in a direct cycle, the run fails with `graph_invalid`.

The rationale is independence: verification is only meaningful if the checker did not also create the thing being checked. Self-verification gives false confidence and defeats the safety model. In a refine loop (Builder -> Verifier -> back to Builder), the Verifier checks the Builder's output, which is independent; the Builder that produced the artifact is a different node instance than the Verifier, so the rule is satisfied.

# The Gate Rule

A Verifier is a gate. Its `verdict.passed` decides what happens downstream:

- `passed = true`: the artifact may proceed to a Merge ([[MergeManager-Part01]]) or to the next pipeline stage. Downstream nodes become `ready`.
- `passed = false`: the artifact is blocked. Downstream merge/apply nodes are `skipped` (or, if configured, routed to a fix branch). The run does not fail merely because a verification failed; failure is a signal, and the graph decides what to do with it (retry the Builder, alert, or end).

A Verifier therefore turns a quality judgment into a control-flow decision. It is the hinge between "built" and "applied".

# When an AI Verdict Is Authoritative

An AI verdict may be treated as authoritative only when:

- a deterministic verifier (Part 03) also passed (the AI check is a second opinion, not the only check); or
- the node config explicitly marks `aiVerdictAuthoritative: true` AND the pipeline is non-safety-critical (e.g. a document polish check, not a code merge); or
- a downstream Human-approval node ([[NodeTypes-Part05]]) confirms it.

Otherwise the AI verdict is advisory and must be confirmed by a deterministic gate or a human before any trusted-state change.

# Invariants

```text
A Verifier never verifies an artifact it produced.
Self-verification is rejected at validation as graph_invalid.
passed=true lets the artifact proceed; passed=false blocks it.
A failed verification skips downstream apply nodes; it does not itself fail the run.
An AI verdict is advisory unless confirmed by a deterministic gate or human.
A refine loop's Builder and Verifier are distinct instances, so the rule holds.
```

# AI Notes

Do not let a Builder and a Verifier be the same node "for convenience". That is self-verification and is forbidden. Use two nodes; the graph makes the independence visible.

Do not let a failed verification crash the run by default. Verification failure is information; the graph should route it (retry, alert, end). Failing the whole run on a check is usually wrong.

Do not mark `aiVerdictAuthoritative: true` on a code-merge pipeline. AI verdicts are approximations; a deterministic gate or a human must confirm before trusted state changes.

# Related Documents

- [[06-workflow-engine/README]]
- [[VerifierNodes-Part01]]
- [[VerifierNodes-Part04]]
- [[VerifierNodes-Part06]]
- [[VerifierNodes-Diagrams]]
- [[BuilderNodes-Part04]]
- [[MergeManager-Part01]]
- [[NodeTypes-Part05]]
- [[LoopNodes-Part01]]
