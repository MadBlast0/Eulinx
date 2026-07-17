---
title: Automations Specification - Part 02
status: draft
version: 1.0
tags:
  - features
  - automations
related:
  - "[[Automations-Part01]]"
  - "[[Automations-Part03]]"
  - "[[EventBus-Part01]]"
---

# Automations Specification (Part 02)

## Document Index

Part 01 - Purpose, Scope, and the Automation Model
Part 02 - Triggers and Actions
Part 03 - AI-Native Nodes and Logic Gates
Part 04 - Scheduled and Recurring Execution
Part 05 - Templates, Safety, and AI Notes

# Triggers

A trigger is an entry node that starts an automation. Supported triggers:

- file change in the project (watched via the Rust FS service)
- schedule (cron-like)
- webhook (received by a local endpoint)
- manual (user clicks run)
- agent-output condition (when agent X outputs Y)

A trigger emits an EventBus event that the ExecutionEngine consumes to instantiate a run.

# Actions

An action node performs work:

- run an agent (delegates to a worker)
- call an API or MCP tool
- send a message to a channel
- write a file (as an Artifact, then merge)
- run a command in a terminal

Every authority-bearing action MUST pass through the PermissionManager. Writing a file still goes through the Artifact/Merge path, never a raw write.

# Edge Semantics

An edge from A to B means B receives A's output plus selected context. Two flow kinds exist:

- data flow (payloads)
- control flow (gate decisions)

Both MUST be shown on the canvas with distinct edge styles so the user can read a branching workflow at a glance.

# Related Documents

- [[Automations-Part03]]
- [[EventBus-Part01]]
