---
title: Metrics Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - metrics
related:
  - "[[Metrics-Part01]]"
  - "[[Metrics-Part03]]"
  - "[[RefinementLoop-Part01]]"
---

# Metrics Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Metrics Model
Part 02 - Cost and Token Estimation
Part 03 - Dashboards and Visualization
Part 04 - Budgets, Alerts, and AI Notes

# Token Estimation

Every AI call reports tokens in and out. The metrics layer sums tokens per worker, per task, per workflow run, and per project. Estimation is shown before a run where feasible (especially Ultra mode) so the user knows the cost before committing.

# Cost Estimation

Cost is computed from token counts and the configured provider/model rate. Multi-provider BYOK means rates are per-model-profile settings. A run shows an estimated and an actual cost; variance is surfaced so the user learns model behavior.

# Refinement Cost

Refinement multiplies cost: Ultra can run up to 8 refine passes. The estimate MUST reflect the selected mode's max iterations, and the actual cost is attributed to the node that ran the loop. This is the core "quality per dollar" dial made visible.

# Related Documents

- [[Metrics-Part03]]
- [[RefinementLoop-Part01]]
