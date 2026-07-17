---
title: WorkerMonitoring Specification - Part 02
status: draft
version: 1.0
tags:
  - worker-system
  - worker-monitoring
related:
  - "[[WorkerMonitoring-Part01]]"
---

# WorkerMonitoring Specification (Part 02)

## Document Index

Part 01 - Purpose, Health, and Monitoring Model
Part 02 - Heartbeats, Stalls, Logs, and Process Watch
Part 03 - Alerts, Recovery, and Human Intervention
Part 04 - Events, UI, and Implementation Checklist

# Heartbeats

Workers should emit or imply heartbeats through:

- terminal output
- process activity
- tool events
- status updates

# Stall Detection

Stalls may include:

- no output for too long
- repeated same command
- waiting for input
- approval pending
- infinite retry
- process alive but unresponsive

# Logs

Monitoring should collect:

- terminal logs
- tool logs
- runtime events
- permission denials
- errors

# Process Watch

ProcessLifecycle should report:

- process exists
- exit code
- child processes
- resource usage where possible

# AI Notes

No output is not always failure. Some commands run silently. Use task context and process state together.

# Related Documents

- [[WorkerMonitoring-Part03]]
- [[ProcessLifecycle-Part01]]

