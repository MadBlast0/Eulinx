---
title: WorkerMetrics Specification - Part 01
status: draft
version: 1.0
tags:
  - worker-system
  - worker-metrics
related:
  - "[[WorkerMonitoring-Part01]]"
  - "[[Execution-Part07]]"
---

# WorkerMetrics Specification (Part 01)

## Document Index

Part 01 - Purpose, Metric Categories, and Data Model
Part 02 - Cost, Tokens, Time, and Resource Metrics
Part 03 - Quality, Reliability, and Outcome Metrics
Part 04 - Events, UI, Dashboards, and Implementation Checklist

# Purpose

WorkerMetrics defines how Eulinx measures Worker behavior, cost, resource usage, quality, and reliability.

# Metric Categories

```text
runtime
cost
tokens
resource
quality
reliability
artifact
permission
communication
```

# WorkerMetric Object

```ts
type WorkerMetric = {
  id: string;
  workerId: string;
  workspaceId: string;
  metricName: string;
  metricValue: number;
  unit: string;
  recordedAt: string;
};
```

# AI Notes

Metrics should help users understand which Workers are effective, expensive, blocked, or noisy.

# Related Documents

- [[WorkerMetrics-Part02]]
- [[WorkerMonitoring-Part01]]

