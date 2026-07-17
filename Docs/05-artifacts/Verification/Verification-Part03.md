---
title: Verification Specification - Part 03
status: draft
version: 1.0
tags:
  - artifacts
  - verification
  - ai-verifier
related:
  - "[[Verification-Part02]]"
  - "[[10-ai-system/Critic/Critic-Part01]]"
---

# Verification Specification (Part 03)

## Document Index

Part 01 - Purpose, the verify-don't-mutate rule, and deterministic vs AI precedence
Part 02 - Deterministic verifiers (schema, lint, typecheck, build, test)
Part 03 - AI verifiers (critic, judge) and advisory scoring
Part 04 - Authorship exclusion, gates, and the pipeline boundary

# AI Verifiers

AI verifiers ask a model to judge an Artifact. Two baseline kinds:

- `critic`: produces a `review` Artifact `references`-ing the candidate, listing findings (clarity, correctness concerns, missing cases). Advisory.
- `judge`: scores the candidate against a rubric and emits a `score` vs `threshold`. Advisory. Used by the refine loop to decide stop-or-continue ([[10-ai-system/Judge/Judge-Part01]]).

# Advisory Scoring

An AI verdict carries:

- `score`: a number from the model
- `threshold`: the configured passing threshold
- `outcome`: derived as `pass` if `score >= threshold`, else `fail` — but `authoritative` is ALWAYS `false`
- `findings`: the model's comments, severity-assigned by the verifier

The `outcome` here is a suggestion. It informs the user and the refine loop, but it MUST NOT, on its own, move an Artifact to `verified` if a required deterministic check failed, and it MUST NOT flip a deterministic `fail` to `pass`.

# Why Advisory

A model judging its own kind is an opinion. Eulinx's safety model rests on facts (build exits 0) being the floor. The AI verdict adds signal: it can catch things a linter cannot (a subtle logic error, a missing edge case, a misleading doc). But it can also be wrong, biased, or sycophantic. Labeling it "suggested" (per the product PRD) and keeping it non-authoritative is what makes the system honest.

# Using AI Verdicts In The Loop

The refine loop uses AI verdicts as guidance, not gates:

- critic findings become the refine Worker's todo for the next version
- judge score trends tell the loop whether quality is improving
- the loop stops on a deterministic fail, a judge "no improvement", or budget exhaustion — not on an AI "looks good"

# Invariants

```text
AI verdicts are always advisory (authoritative = false).
score/threshold exist only for AI verdicts.
An AI fail does not block merge if deterministic passed, unless a hard AI gate is configured as soft-only guidance.
An AI pass does not unblock a deterministic fail.
```

# AI Notes

Do not present an AI verdict to the user as "correct". The PRD says label judge output as "suggested". Keep that label in the UI and in the Verdict.

Do not let the refine loop stop purely because the judge said "good". Also require deterministic health and budget awareness.

Do not use the same Worker as both builder and judge. Authorship exclusion applies to AI verifiers too (Part 04).

# Related Documents

- [[Verification-Part01]]
- [[Verification-Part02]]
- [[Verification-Part04]]
- [[10-ai-system/Critic/Critic-Part01]]
- [[10-ai-system/Judge/Judge-Part01]]
- [[ArtifactVersioning-Part02]]
