---
title: RefinementLoop Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
  - stopping
related:
  - "[[RefinementLoop-Part03]]"
  - "[[RefinementLoop-Part05]]"
---

# RefinementLoop Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and Loop Definition
Part 02 - Mode Model (Low / Medium / High / Ultra)
Part 03 - Phases: Builder, Verifier, Critic, Judge
Part 04 - Stopping Rules and Budgets
Part 05 - Pass Counting, UX, and Honest Claims
Part 06 - Failure Routing and Loop Exit
Part 07 - Implementation Checklist and Future Expansion

# Stopping Rules

The loop MUST stop when ANY of these is true:

- The Judge returns accept.
- The iteration count reaches the mode's cap (Low 1, Medium 2, High 4, Ultra 8).
- The token/cost budget for the run is exhausted.
- A fatal, non-recoverable error occurs in a phase.

The Judge verdict is the preferred termination; caps and budgets are safety nets.

# Budget Enforcement

Before each pass, the loop MUST query `CostOptimization` for remaining budget. If the next pass cannot be afforded, the loop stops and the best current artifact is sent to the Judge for a final accept decision.

# No Infinite Loops

A loop without a stopping rule is a bug, not a feature. The runtime MUST enforce the cap even if the Judge misbehaves.

# Related Documents

- [[RefinementLoop-Part05]]
- [[CostOptimization-Part01]]
- [[Judge-Part01]]
- [[AIArchitecture-Part06]]
