---
title: Metrics Specification - Part 03
status: draft
version: 1.0
tags:
  - features
  - metrics
related:
  - "[[Metrics-Part02]]"
  - "[[Metrics-Part04]]"
---

# Metrics Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and the Metrics Model
Part 02 - Cost and Token Estimation
Part 03 - Dashboards and Visualization
Part 04 - Budgets, Alerts, and AI Notes

# Dashboards

The metrics dashboard renders one consistent component family fed by the metric shape: a gauge or bar (used vs limit), a pressure color, a trend arrow, and an alert state. Dimensions shown:

- tokens (per agent / workflow / project)
- cost (per agent / workflow / project)
- execution time (per run)
- success rate (verified vs failed)
- worker concurrency (vs plan limit)

# Visualization

Execution time and success rate are visualized per run so the user can spot slow or failing nodes. The dashboard links each metric back to its source object (worker, run, task) for drill-down.

# Component Consistency

Tokens, cost, time, and concurrency all use the same component with different units. Consistency is a hard requirement: the panel must be readable at a glance across seven very different resources.

# Related Documents

- [[Metrics-Part04]]
