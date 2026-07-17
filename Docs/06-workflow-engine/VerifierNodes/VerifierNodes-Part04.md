---
title: VerifierNodes Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - verifier-nodes
  - ai-verifier
  - scoring
related:
  - "[[06-workflow-engine/README]]"
  - [[VerifierNodes-Part01]]
  - [[VerifierNodes-Part03]]
  - [[BuilderNodes-Part01]]
---

# VerifierNodes Specification (Part 04)

## Document Index

Part 01 - Purpose, philosophy, object model, states, invariants
Part 02 - The verifier node config and its validation
Part 03 - Deterministic verifiers: schema, lint, typecheck, build, test
Part 04 - AI verifiers: critic and judge, scoring, thresholds
Part 05 - The authorship rule, gates, and the pipeline boundary
Part 06 - Caching, failure routing, timeouts, checklist, examples
Diagrams - VerifierNodes-Diagrams.md

# Purpose

Part 04 defines the AI-backed verifier: the critic and judge patterns, how a score is produced, and how a threshold turns a score into a pass or fail verdict.

Not every check can be deterministic. "Does this diff read well?", "Is this explanation correct?", "Would a reviewer accept this?" are judgments a cheap model can approximate. Eulinx allows AI verifiers, but treats their verdict as advisory unless a deterministic gate agrees. The AI verifier is a scorer, not an authority.

# The Critic and Judge Patterns

Two AI verifier shapes exist:

- Critic: the model is given the Artifact and a rubric, and returns structured criticism (list of issues, each with severity). The critic does not pass or fail; it reports. The node then maps the criticism to a verdict using the `threshold` and `severityPolicy` from config.
- Judge: the model is asked a direct yes/no question (e.g. "does this pass?") with a confidence score, and returns `passed` plus `score` plus `reasons`. The judge is a single binary with justification.

Both return a `verdict` json: `passed` (boolean), `score` (number 0..1), `reasons` (list), and optionally `evidence` (an `artifact-ref` to a critique document).

# Scoring and Thresholds

The verdict's `score` is derived deterministically from the model output: for a critic, it is a function of issue severities (e.g. any `blocker` severity forces `score=0`); for a judge, it is the returned confidence. The node compares `score` to the configured `threshold`:

- `score >= threshold` -> `passed = true`.
- `score < threshold` -> `passed = false`.

The threshold is part of the frozen config, so replay ([[WorkflowEngine-Part07]]) reaches the same verdict from the same recorded model output. The model output itself is recorded, not re-generated.

# Determinism Note

The model call is non-deterministic in reality, but the engine treats the recorded result as the truth during replay. The score-to-verdict mapping is a pure function of the recorded output and the frozen threshold, so the verdict is reproducible even though the underlying model is not. The seed ([[WorkflowEngine-Part01]]) is NOT used to make the model call deterministic; instead, the result is recorded and replayed. This is the same boundary as every other external adapter.

# Advisory vs Authoritative

An AI verifier's `passed` is advisory by default. A pipeline that requires certainty uses a deterministic verifier (Part 03) as the authoritative gate, with the AI verifier providing context (its `reasons` and `evidence`) to a human or to a downstream decision. The boundary rule in Part 05 explains when an AI verdict may be treated as authoritative.

# Invariants

```text
An AI verifier returns a verdict: passed, score, reasons, optional evidence.
The score-to-verdict mapping is a pure function of recorded output and threshold.
The threshold is frozen in config; replay uses the recorded model output.
An AI verdict is advisory unless a deterministic gate agrees (Part 05).
The model output is recorded, never re-generated during replay.
score >= threshold => passed; otherwise failed.
```

# AI Notes

Do not let an AI verifier's `passed` silently become the sole authority in a safety-critical merge. AI verdicts are approximations; pair them with a deterministic gate or a human approval ([[NodeTypes-Part05]]).

Do not compute the score inside the model and trust it blindly. Derive `score` from the structured output via the frozen mapping so it is inspectable and replayable. A model that returns "score: 0.95" with no rubric basis is not auditable.

Do not re-call the model during replay. The recorded output is the truth. Re-calling wastes cost and can flip the verdict, breaking the run's reproducibility.

# Related Documents

- [[06-workflow-engine/README]]
- [[VerifierNodes-Part01]]
- [[VerifierNodes-Part03]]
- [[VerifierNodes-Part05]]
- [[VerifierNodes-Diagrams]]
- [[BuilderNodes-Part01]]
- [[WorkflowEngine-Part07]]
- [[NodeTypes-Part05]]
