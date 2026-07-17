---
title: RefinementLoop Specification - Part 07
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
  - implementation
related:
  - "[[RefinementLoop-Part06]]"
---

# RefinementLoop Specification (Part 07)

## Document Index

Part 01 - Purpose, Philosophy, and Loop Definition
Part 02 - Mode Model (Low / Medium / High / Ultra)
Part 03 - Phases: Builder, Verifier, Critic, Judge
Part 04 - Stopping Rules and Budgets
Part 05 - Pass Counting, UX, and Honest Claims
Part 06 - Failure Routing and Loop Exit
Part 07 - Implementation Checklist and Future Expansion

# Implementation Checklist

1. Define mode -> cap mapping in configuration.
2. Implement the four role invocations as independent calls.
3. Wire the Judge verdict to loop continuation.
4. Enforce iteration cap and budget before each pass.
5. Track pass count and cost for UI.
6. Persist each artifact candidate for replay and comparison.
7. Emit loop events to the `EventBus` (pass started, verified, critiqued, judged, stopped).

# Future Expansion

- Per-phase model selection (cheap builder, strong critic).
- Adaptive mode that raises itself when stuck.
- Offline simulation of the loop without applying artifacts.
- Learned stopping thresholds from historical acceptance rates.

# AI Notes

Do not merge the four roles into one prompt. The separation is what makes cheap models improve.

Do not continue past budget. Budget enforcement is correctness, not optimization.

Do not claim the loop equals a flagship model. State the honest quality gain.

# Related Documents

- [[RefinementLoop-Part01]]
- [[Builder-Part01]]
- [[Verifier-Part01]]
- [[Critic-Part01]]
- [[Judge-Part01]]
- [[CostOptimization-Part01]]
