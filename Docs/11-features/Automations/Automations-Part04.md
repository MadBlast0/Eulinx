---
title: Automations Specification - Part 04
status: draft
version: 1.0
tags:
  - features
  - automations
related:
  - "[[Automations-Part03]]"
  - "[[Automations-Part05]]"
  - "[[Scheduler-Part01]]"
---

# Automations Specification (Part 04)

## Document Index

Part 01 - Purpose, Scope, and the Automation Model
Part 02 - Triggers and Actions
Part 03 - AI-Native Nodes and Logic Gates
Part 04 - Scheduled and Recurring Execution
Part 05 - Templates, Safety, and AI Notes

# Scheduled and Recurring Execution

An automation may run on a schedule (cron-like) or on a recurring trigger. The Scheduler admits runs using the same admission rules as tasks: resource availability, dependencies, concurrency limits, and budget.

# Run Lifecycle

Each automation run has a lifecycle: triggered, planning, executing, verifying, merging, done, error. The run's state is visible on the canvas via node status (idle/working/done/error) and animated packets along edges.

# Run History

The automation feature records each run: trigger, inputs, node outputs, artifacts produced, verification result, cost, and duration. This history feeds the Metrics dashboards and the replay/debugging surface.

# Related Documents

- [[Automations-Part05]]
- [[Scheduler-Part01]]
