---
title: WorkerMetrics Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-metrics
  - implementation
related:
  - "[[WorkerMetrics-Part01]]"
---

# WorkerMetrics Specification (Part 04)

## Document Index

Part 01 - Purpose, Metric Categories, and Data Model
Part 02 - Cost, Tokens, Time, and Resource Metrics
Part 03 - Quality, Reliability, and Outcome Metrics
Part 04 - Events, UI, Dashboards, and Implementation Checklist

# Events

```text
worker.metric.recorded
worker.metric.threshold_exceeded
worker.metric.summary_created
```

# UI

Worker metric UI should show:

- runtime
- cost/tokens
- current status
- blockers
- artifacts produced
- retry count
- approval wait

# Implementation Checklist

```text
[ ] Define WorkerMetric
[ ] Track runtime duration
[ ] Track token/cost where possible
[ ] Track artifacts
[ ] Track retries
[ ] Track blocked time
[ ] Add metrics panel
[ ] Add tests for metric aggregation
```

# Final AI Notes

Metrics are not vanity. They help Eulinx decide whether a multi-worker run is healthy.

# Related Documents

- [[WorkerMetrics-Part01]]
- [[WorkerMonitoring-Part01]]

