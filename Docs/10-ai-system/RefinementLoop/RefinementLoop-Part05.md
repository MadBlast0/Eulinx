---
title: RefinementLoop Specification - Part 05
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
  - ux
related:
  - "[[RefinementLoop-Part04]]"
  - "[[RefinementLoop-Part06]]"
---

# RefinementLoop Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, and Loop Definition
Part 02 - Mode Model (Low / Medium / High / Ultra)
Part 03 - Phases: Builder, Verifier, Critic, Judge
Part 04 - Stopping Rules and Budgets
Part 05 - Pass Counting, UX, and Honest Claims
Part 06 - Failure Routing and Loop Exit
Part 07 - Implementation Checklist and Future Expansion

# Pass Counting

The UI MUST show a live pass counter (e.g., "Pass 3 of 8") and a running token/cost estimate per run. This gives the user visibility into what the loop is doing and what it costs.

# Honest Claims

The product language MUST be "refined, higher-quality," never "equals a flagship model." The refinement slider is a quality-per-dollar dial, not a guarantee of perfection.

# Observability

While the loop runs, the node shows status (working/verifying/critiquing/judging) and an animated packet traveling along outgoing edges. This is the observability differentiator described in the PRD.

# Mode Indicators

Each agent/node displays its selected mode. Ultra mode displays an extra warning glyph before execution.

# Related Documents

- [[RefinementLoop-Part02]]
- [[CostOptimization-Part04]]
- [[07-ui-ux/README]]
