---
title: WorkerMonitoring Specification - Part 04
status: draft
version: 1.0
tags:
  - worker-system
  - worker-monitoring
  - implementation
related:
  - "[[WorkerMonitoring-Part01]]"
---

# WorkerMonitoring Specification (Part 04)

## Document Index

Part 01 - Purpose, Health, and Monitoring Model
Part 02 - Heartbeats, Stalls, Logs, and Process Watch
Part 03 - Alerts, Recovery, and Human Intervention
Part 04 - Events, UI, and Implementation Checklist

# Events

```text
worker.health.updated
worker.stalled
worker.unstalled
worker.alert.created
worker.recovery.requested
worker.monitoring.failed
```

# UI

Worker UI should show:

- health state
- last activity
- current blocker
- alerts
- recent logs
- suggested action

# Implementation Checklist

```text
[ ] Define WorkerHealthState
[ ] Track last activity
[ ] Detect stalls
[ ] Monitor process state
[ ] Collect logs
[ ] Emit health events
[ ] Add UI alerts
[ ] Add tests for stall detection
```

# Final AI Notes

WorkerMonitoring is how Eulinx keeps many terminals understandable.

# Related Documents

- [[WorkerMonitoring-Part01]]
- [[WorkerMetrics-Part01]]

