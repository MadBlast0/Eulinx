---
title: Judge Specification - Part 01
status: draft
version: 1.0
tags:
  - ai-system
  - judge
related:
  - "[[10-ai-system/README]]"
  - "[[Judge-Part02]]"
---

# Judge Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, and Verdicts
Part 02 - Acceptance Criteria and Scoring
Part 03 - Judge Models and Honesty
Part 04 - Implementation Checklist and Future Expansion

# Purpose

The Judge adjudicates. It decides whether an artifact is acceptable, whether the loop should continue, or whether it should stop due to budget or iteration limits. The Judge's accept verdict is what allows an artifact to proceed to the runtime Merge Manager.

# Philosophy

A loop without a Judge never knows when to stop. The Judge provides the stopping rule and the quality gate. Its verdict is authoritative for loop termination (subject to budget/cap, which the runtime enforces).

# Verdicts

The Judge returns exactly one of:

- accept: the artifact meets criteria; proceed to merge.
- reject: continue the loop; send feedback to the Builder.
- stop: terminate the loop (cap/budget reached) with the best current artifact.

# Relation to Critic

The Critic proposes improvements; the Judge decides. The Judge MAY use the Critic's feedback and the Verifier's report, but the decision is its own.

# Related Documents

- [[Judge-Part02]]
- [[RefinementLoop-Part04]]
- [[Critic-Part01]]
- [[Verifier-Part01]]
