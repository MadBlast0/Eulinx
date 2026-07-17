---
title: WorkerMetrics Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-metrics
  - cost
related:
  - "[[WorkerMetrics-Part01]]"
---

# WorkerMetrics Specification (Part 02)

## Document Index

Part 01 - Purpose, Metric Categories, and Data Model
Part 02 - Cost, Tokens, Time, and Resource Metrics
Part 03 - Quality, Reliability, and Outcome Metrics
Part 04 - Events, UI, Dashboards, and Implementation Checklist

# Cost Metrics

Track:

- estimated cost
- actual cost where available
- provider cost
- model cost
- tool cost

# Token Metrics

Track:

- input tokens
- output tokens
- cached tokens
- context package size
- wasted retry tokens

# Time Metrics

Track:

- queue wait time
- runtime duration
- terminal active time
- blocked time
- approval wait time

# Resource Metrics

Track:

- process count
- memory estimate
- CPU estimate
- file writes
- network requests
- child Workers spawned

# AI Notes

On free or local models, "cost" still includes time, CPU, memory, and user attention.

# Related Documents

- [[WorkerMetrics-Part03]]
- [[Scheduler-Part04]]

