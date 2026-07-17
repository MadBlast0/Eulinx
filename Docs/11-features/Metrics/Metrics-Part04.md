---
title: Metrics Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - metrics
related:
  - "[[Metrics-Part03]]"
  - "[[Notifications-Part01]]"
---

# Metrics Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Metrics Model
Part 02 - Cost and Token Estimation
Part 03 - Dashboards and Visualization
Part 04 - Budgets, Alerts, and AI Notes

# Budgets

The user configures token and cost budgets per workspace and per run. Budgets are enforced by the ResourceManager admission authority; the metrics feature only configures and displays them. Free shows basic budgets; Plus/Pro show full cost analytics.

# Alerts

When a `resource_critical` or `budget_hard` event arrives, the metrics surface raises a user-facing alert through the notification system, not merely a colored bar. A spent cost cap is something the user must acknowledge, not discover later in a log.

# AI Notes

Do not implement metrics as a passive chart panel; it configures budgets that the ResourceManager enforces.

Do not show cost without a per-run breakdown; aggregate numbers hide which node is expensive.

Do not let Ultra run without a pre-run estimate when a budget is configured.

Do not duplicate measurement; read the unified metrics model from ResourceMonitoring.

# Related Documents

- [[Notifications-Part01]]
