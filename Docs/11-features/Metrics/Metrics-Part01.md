---
title: Metrics Specification - Part 01
status: draft
version: 1.0
tags:
  - features
  - metrics
related:
  - "[[11-features/README]]"
  - "[[Metrics-Part02]]"
  - "[[ResourceMonitoring-Part01]]"
---

# Metrics Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and the Metrics Model
Part 02 - Cost and Token Estimation
Part 03 - Dashboards and Visualization
Part 04 - Budgets, Alerts, and AI Notes

# Purpose

The Metrics feature gives the user visibility into cost and usage: per-run token and cost estimates, budgets, success rates, and execution time, broken down by agent, workflow, and project. It is the "am I spending too much?" surface and the accountability layer for multi-agent work.

Metrics is the user-facing rendering of the ResourceMonitoring model. The feature reads the unified metrics model produced by ResourceMonitoring and turns it into dashboards; it does not measure or enforce.

# Scope

Metrics are scoped per workspace and project. A user can see their own usage; team-wide aggregation is a later collaboration-phase capability.

# The Metrics Model

The metrics shape describes a measurable dimension:

- current used versus limit
- a pressure color (ok / warn / critical)
- a trend arrow (rising / falling)
- an alert state

Tokens and cost use the same shape with currency or token units. Consistency across dimensions is what makes the panel readable at a glance.

# What Metrics Owns

The metrics feature owns:

- the cost/usage dashboard UI
- the per-run token/cost estimate display
- the budget configuration surface
- the success-rate and execution-time visualizations

It does NOT own admission, throttling, or enforcement; those are ResourceManager and Scheduler.

# Related Documents

- [[Metrics-Part02]]
- [[ResourceMonitoring-Part01]]
