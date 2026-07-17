---
title: RefinementLoop Specification - Part 02
status: draft
version: 1.0
tags:
  - ai-system
  - refinement-loop
  - modes
related:
  - "[[RefinementLoop-Part01]]"
  - "[[RefinementLoop-Part03]]"
---

# RefinementLoop Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, and Loop Definition
Part 02 - Mode Model (Low / Medium / High / Ultra)
Part 03 - Phases: Builder, Verifier, Critic, Judge
Part 04 - Stopping Rules and Budgets
Part 05 - Pass Counting, UX, and Honest Claims
Part 06 - Failure Routing and Loop Exit
Part 07 - Implementation Checklist and Future Expansion

# Mode Model

The refinement slider exposes four modes. Each mode maps to a maximum number of refine passes and a critic strength.

- Low: one pass, draft only, no refine.
- Medium: up to two refine passes.
- High: up to four refine passes.
- Ultra: up to eight refine passes with a stronger critic.

These are tunable defaults, not hardcoded limits. A workspace or task MAY override them.

# Mode Selection

Mode is selected per agent/node and stored as part of the task or node configuration. The loop reads the mode at start and enforces its cap.

# Cost Warning

Higher modes cost more tokens. The UI MUST show an estimated cost per mode and MUST warn before running Ultra. Cost estimates come from `CostOptimization`.

# Mapping to Workers

A node with refinement enabled runs the full loop internally before its artifact is considered "done." Nodes without refinement enabled skip directly to a single Builder pass plus objective verification.

# Related Documents

- [[RefinementLoop-Part03]]
- [[CostOptimization-Part01]]
- [[Builder-Part01]]
