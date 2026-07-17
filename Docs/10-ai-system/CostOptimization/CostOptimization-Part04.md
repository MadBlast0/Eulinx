---
title: CostOptimization Specification - Part 04
status: draft
version: 1.0
tags:
  - ai-system
  - cost-optimization
  - ux
related:
  - "[[CostOptimization-Part03]]"
  - "[[CostOptimization-Part05]]"
---

# CostOptimization Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, and the Cost Model
Part 02 - Token and Cost Tracking
Part 03 - Budget Enforcement and Routing
Part 04 - Cost UX and Dashboards
Part 05 - Implementation Checklist and Future Expansion

# Cost UX

The UI MUST surface cost where decisions are made:

- per-run estimated and actual cost near the refinement slider,
- a warning before Ultra mode,
- a live token/cost estimate during a loop run,
- per-worker and per-task cost in the context panel.

# Dashboards

A workspace usage dashboard shows total spend, spend by model, spend by role, and trend over time. Free tier shows basic analytics; higher tiers show detailed cost analytics and token budgets.

# Honest Estimates

Estimates use current provider pricing and observed token rates. They MUST be labeled estimates, not guarantees, because streaming and caching make exact pre-cost impossible.

# Related Documents

- [[CostOptimization-Part01]]
- [[RefinementLoop-Part05]]
- [[07-ui-ux/README]]
