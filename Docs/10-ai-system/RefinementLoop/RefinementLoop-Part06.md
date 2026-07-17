---
title: RefinementLoop Specification - Part 06
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
  - failure
related:
  - "[[RefinementLoop-Part05]]"
  - "[[RefinementLoop-Part07]]"
---

# RefinementLoop Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, and Loop Definition
Part 02 - Mode Model (Low / Medium / High / Ultra)
Part 03 - Phases: Builder, Verifier, Critic, Judge
Part 04 - Stopping Rules and Budgets
Part 05 - Pass Counting, UX, and Honest Claims
Part 06 - Failure Routing and Loop Exit
Part 07 - Implementation Checklist and Future Expansion

# Failure Routing

When the Verifier reports a hard failure (build broken, tests failing), the loop routes back to the Builder with the verification report attached as feedback. The Critic may be skipped on objective failures to save tokens, because the verification report is already concrete.

# Loop Exit with No Accept

If the cap or budget is hit without a Judge accept, the loop exits with the best artifact produced so far. "Best" is the highest Judge quality score, or the last verified artifact if scoring is unavailable.

# Human-in-the-Loop on Exit

A loop that exits without acceptance SHOULD surface the result to the user with the critic and verification summaries, allowing manual accept, edit, or restart at a higher mode.

# Stuck Detection

If the Judge quality score does not improve for two consecutive passes, the loop MAY short-circuit to stop to avoid wasting budget. This is a configurable heuristic.

# Related Documents

- [[Verifier-Part01]]
- [[Judge-Part01]]
- [[RefinementLoop-Part04]]
- [[CostOptimization-Part01]]
