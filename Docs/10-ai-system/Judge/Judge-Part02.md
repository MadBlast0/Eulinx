---
title: Judge Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - judge
related:
  - "[[Judge-Part01]]"
  - "[[Judge-Part03]]"
---

# Judge Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Verdicts
Part 02 - Acceptance Criteria and Scoring
Part 03 - Judge Models and Honesty
Part 04 - Implementation Checklist and Future Expansion

# Acceptance Criteria

The Judge evaluates against the task checklist produced during Planning and any objective verification results. Criteria SHOULD be explicit and stable so scoring is comparable across passes.

# Scoring

The Judge SHOULD return a quality score (for example 0 to 1 or 0 to 100) and a rationale. The score is used to pick the "best" artifact when the loop exits without acceptance.

# Comparison

On each pass, the Judge compares the current artifact to the previous best. If the current is not better, it MAY return reject and the loop MAY short-circuit if scores are stuck (see [[RefinementLoop-Part06]]).

# Hard Gates

Objective failures from the Verifier (build broken, tests failing) are hard gates. The Judge MUST NOT accept an artifact that fails a required objective check, regardless of semantic quality.

# Related Documents

- [[Judge-Part01]]
- [[Verifier-Part01]]
- [[Planning-Part02]]
- [[RefinementLoop-Part04]]
