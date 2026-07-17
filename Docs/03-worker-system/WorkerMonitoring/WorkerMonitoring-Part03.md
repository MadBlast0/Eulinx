---
title: WorkerMonitoring Specification - Part 03
status: draft
version: 1.0
tags:
  - worker-system
  - worker-monitoring
  - recovery
related:
  - "[[WorkerMonitoring-Part02]]"
---

# WorkerMonitoring Specification (Part 03)

## Document Index

Part 01 - Purpose, Health, and Monitoring Model
Part 02 - Heartbeats, Stalls, Logs, and Process Watch
Part 03 - Alerts, Recovery, and Human Intervention
Part 04 - Events, UI, and Implementation Checklist

# Alerts

Eulinx should alert when:

- Worker stalls
- Worker exceeds budget
- Worker repeats failures
- Worker violates policy
- Worker needs approval
- Worker crashes

# Recovery Actions

Possible actions:

- wait
- send nudge
- pause Worker
- terminate Worker
- spawn replacement Worker
- ask Orchestrator to replan
- ask human

# Human Intervention

User should be able to:

- inspect terminal
- stop Worker
- approve action
- deny action
- add instruction
- create handoff

# AI Notes

Monitoring should not automatically kill every quiet Worker. It should classify the situation first.

# Related Documents

- [[WorkerMonitoring-Part04]]
- [[WorkerTermination-Part01]]

