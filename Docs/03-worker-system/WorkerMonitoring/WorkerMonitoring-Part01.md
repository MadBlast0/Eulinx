---
title: WorkerMonitoring Specification - Part 01
status: draft
version: 1.0
tags:
  - worker-system
  - worker-monitoring
related:
  - "[[WorkerMetrics-Part01]]"
  - "[[RuntimeManager-Part03]]"
---

# WorkerMonitoring Specification (Part 01)

## Document Index

Part 01 - Purpose, Health, and Monitoring Model
Part 02 - Heartbeats, Stalls, Logs, and Process Watch
Part 03 - Alerts, Recovery, and Human Intervention
Part 04 - Events, UI, and Implementation Checklist

# Purpose

WorkerMonitoring defines how Eulinx observes active Workers.

Monitoring answers:

```text
Is this Worker alive?
Is it useful?
Is it stuck?
Is it unsafe?
Does it need help?
```

# Worker Health States

```text
healthy
busy
waiting
blocked
stalled
unsafe
failed
terminated
```

# Monitoring Sources

- terminal output
- process state
- runtime events
- heartbeat
- tool activity
- artifact creation
- permission events
- metric changes

# AI Notes

Do not judge Worker health only by whether the process exists.

A Worker can be alive and still be stuck or unsafe.

# Related Documents

- [[WorkerMonitoring-Part02]]
- [[WorkerMetrics-Part01]]

