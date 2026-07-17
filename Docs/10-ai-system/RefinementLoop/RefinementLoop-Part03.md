---
title: RefinementLoop Specification - Part 03
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
  - roles
related:
  - "[[RefinementLoop-Part02]]"
  - "[[RefinementLoop-Part04]]"
---

# RefinementLoop Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, and Loop Definition
Part 02 - Mode Model (Low / Medium / High / Ultra)
Part 03 - Phases: Builder, Verifier, Critic, Judge
Part 04 - Stopping Rules and Budgets
Part 05 - Pass Counting, UX, and Honest Claims
Part 06 - Failure Routing and Loop Exit
Part 07 - Implementation Checklist and Future Expansion

# Phase Sequence

Each loop iteration runs these phases in order:

1. Builder generates or revises the artifact using the task, context, prior draft, and critic feedback.
2. Verifier runs objective checks (build, lint, test, type-check) and optionally a semantic check.
3. Critic reviews the artifact and verification report, producing structured feedback.
4. Judge evaluates the artifact against acceptance criteria and prior candidates, then returns accept, reject, or stop.

# Phase Inputs and Outputs

- Builder output: an artifact (or revised artifact) plus a change note.
- Verifier output: a verification report with per-check pass/fail and an optional semantic note.
- Critic output: a feedback list (issues, strengths, suggested changes).
- Judge output: a verdict (accept / reject / stop) plus a rationale and a quality score.

# Role Independence

Each phase is a separate role invocation. They MUST NOT be merged into one prompt, because merging removes the accountability that makes iteration work for cheap models.

# Related Documents

- [[Builder-Part01]]
- [[Verifier-Part01]]
- [[Critic-Part01]]
- [[Judge-Part01]]
- [[AIArchitecture-Part03]]
