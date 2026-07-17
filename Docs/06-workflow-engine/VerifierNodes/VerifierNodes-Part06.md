---
title: VerifierNodes Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - verifier-nodes
  - caching
  - checklist
related:
  - "[[06-workflow-engine/README]]"
  - [[VerifierNodes-Part01]]
  - [[VerifierNodes-Part05]]
  - [[Artifact-Part01]]
---

# VerifierNodes Specification ( Part 06 )

## Document Index

Part 01 - Purpose, philosophy, object model, states, invariants
Part 02 - The verifier node config and its validation
Part 03 - Deterministic verifiers: schema, lint, typecheck, build, test
Part 04 - AI verifiers: critic and judge, scoring, thresholds
Part 05 - The authorship rule, gates, and the pipeline boundary
Part 06 - Caching, failure routing, timeouts, checklist, examples
Diagrams - VerifierNodes-Diagrams.md

# Purpose

Part 06 covers verifier caching, how failures route, timeout behavior, an implementer checklist, and a worked example of a verify-then-merge gate.

# Caching

A deterministic verifier's result is a pure function of the artifact's content hash and the verifier's config. The engine MAY cache the verdict keyed by `(contentHash, verifierConfigHash)`. On replay ([[WorkflowEngine-Part07]]) the recorded verdict is used regardless; caching only saves re-running an expensive deterministic check within the same run or across runs. An AI verifier's result is never speculatively cached across runs, because the model output is recorded per run and the cache key would not capture model drift; within a run, the recorded result is the cache.

# Failure Routing

A verifier may end in several ways:

- `passed=true`: downstream proceeds (Part 05 gate rule).
- `passed=false`: downstream apply is skipped; the graph routes per its edges (retry branch, alert, or end).
- `verdict_inconclusive`: the verifier could not decide (e.g. the artifact was unreadable, or the judge returned `score` exactly at the threshold with no reasons). This is retryable per policy; if it persists, the node fails. An inconclusive result is never silently treated as passed.
- `artifact_missing`: fatal; the referenced artifact does not exist.

# Timeouts

Deterministic verifiers (build, test) can be slow; their `timeoutMs` is enforced by the ExecutionEngine. An AI verifier's model call also has a `timeoutMs`; on timeout it is `verdict_inconclusive` (retryable). Timeouts are supervision concerns, not engine-tick concerns ([[NodeArchitecture-Part04]]).

# Implementer Checklist

- Resolve the `artifactRef`; fetch bytes from the store (Part 03/04).
- Run the deterministic check or invoke the AI critic/judge via the ExecutionEngine.
- Produce a `verdict` json; apply the threshold for AI verdicts.
- Enforce the authorship rule (Part 05) before producing a verdict.
- Emit `verdict` on the output port; mark `succeeded`.
- Persist the verdict and (for AI) the model output with the node state; emit after commit.
- Never treat `inconclusive` as `passed`.

# Worked Example — Verify-Then-Merge Gate

`Builder -> Verifier(typecheck, deterministic) -> Verifier(ai-judge, advisory) -> Condition(passed?) -> [Merge (true), Builder-retry (false)]`.

- The deterministic typecheck is authoritative; if it fails, the AI judge is moot and the Condition routes to `Builder-retry`.
- If typecheck passes, the AI judge gives an advisory score; with `aiVerdictAuthoritative: false`, the Condition still uses the deterministic `passed` (true) to proceed to Merge. The AI score informs a human reviewing the run but does not block.
- The artifact is merged only after the deterministic gate passed; the project was never written by the Builder ([[BuilderNodes-Part04]]).

# Invariants

```text
A deterministic verdict is cacheable by content and config hash.
An AI verdict is recorded per run; replay uses the record.
inconclusive is never treated as passed; it is retryable then fatal.
artifact_missing is fatal.
Timeouts are enforced by the ExecutionEngine, not the tick loop.
The authorship rule is checked before any verdict is produced.
```

# AI Notes

Do not cache an AI verdict across runs as if the model were stable. Model behavior drifts; the recorded per-run output is the only safe source for replay. Cache deterministic checks, not AI judgments.

Do not treat `inconclusive` as a soft pass. "Could not decide" is not "looks fine". Route it to retry or to a human; never to a merge.

Do not let a verifier write the artifact it checks. Verification is read-only on the artifact store; applying is the MergeManager's act ([[MergeManager-Part01]]).

# Related Documents

- [[06-workflow-engine/README]]
- [[VerifierNodes-Part01]]
- [[VerifierNodes-Part05]]
- [[VerifierNodes-Diagrams]]
- [[BuilderNodes-Part04]]
- [[MergeManager-Part01]]
- [[Artifact-Part01]]
- [[NodeArchitecture-Part04]]
- [[WorkflowEngine-Part07]]
