---
title: WorkerMetrics Specification - Part 05
status: draft
version: 1.0
tags:
  - worker-system
  - worker-metrics
  - future
related:
  - "[[WorkerMetrics-Part01]]"
---

# WorkerMetrics Specification (Part 05)

## Document Index

Part 01 - Purpose, Metric Categories, and Data Model
Part 02 - Cost, Tokens, Time, and Resource Metrics
Part 03 - Quality, Reliability, and Outcome Metrics
Part 04 - Events, UI, Dashboards, and Implementation Checklist
Part 05 - Aggregation, Thresholds, Reports, and Future Expansion

# Aggregation

Worker metrics should aggregate upward:

```text
Worker -> Task -> Orchestrator -> Workflow -> Session -> Workspace
```

# Thresholds

Threshold examples:

- max retries
- max token use
- max idle time
- max approval wait
- max child Workers

# Reports

Eulinx should eventually generate Worker performance reports per Session and Workspace.

# Future Expansion

Future metrics:

- Worker usefulness score
- model comparison per task type
- cost prediction
- automatic Worker profile recommendations

# Final AI Notes

Metrics should guide better runtime decisions, not become decoration.

# Related Documents

- [[WorkerMetrics-Part01]]
- [[WorkerMonitoring-Part01]]

