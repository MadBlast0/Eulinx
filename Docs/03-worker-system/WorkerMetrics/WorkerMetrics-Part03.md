---
title: WorkerMetrics Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-metrics
  - quality
related:
  - "[[WorkerMetrics-Part02]]"
---

# WorkerMetrics Specification (Part 03)

## Document Index

Part 01 - Purpose, Metric Categories, and Data Model
Part 02 - Cost, Tokens, Time, and Resource Metrics
Part 03 - Quality, Reliability, and Outcome Metrics
Part 04 - Events, UI, Dashboards, and Implementation Checklist

# Quality Metrics

Track:

- artifacts accepted
- artifacts rejected
- verification pass rate
- tests passed
- reviewer score
- human approval rate

# Reliability Metrics

Track:

- crashes
- retries
- permission denials
- timeout count
- blocked count
- handoff success

# Outcome Metrics

Track:

- task completed
- task failed
- merge success
- bug introduced
- rollback needed

# AI Notes

Quality metrics should not be used to blindly rank Workers without context. A hard task may fail more often than an easy task.

# Related Documents

- [[WorkerMetrics-Part04]]
- [[WorkerMonitoring-Part01]]

