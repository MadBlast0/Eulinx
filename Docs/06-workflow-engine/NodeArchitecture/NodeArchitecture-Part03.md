---
title: NodeArchitecture Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-architecture
  - lifecycle
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[NodeArchitecture-Part02]]"
  - "[[WorkflowEngine-Part06]]"
---

# NodeArchitecture Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Base Node Contract, and Invariants
Part 02 - Ports, Typed Inputs and Outputs, and the Port Compatibility Rules
Part 03 - The Node Lifecycle State Machine and State Transitions
Part 04 - Execution Isolation, Retries, Timeouts, and Resource Limits
Part 05 - Error Propagation to Downstream Nodes
Part 06 - The Node Kind Registry and Custom Plugin Node Registration
Diagrams - NodeArchitecture-Diagrams.md

# Purpose

Part 03 defines the lifecycle every node moves through, from the moment the graph is validated to the moment the run reaches a terminal state.

The node state machine is the smallest unit of progress the engine tracks. The run state machine in [[WorkflowEngine-Part01]] is built entirely from the aggregate of node states. A run is `succeeded` only when every node is `succeeded` or `skipped`. A run is `failed` only when at least one node is `failed` in a way no retry or branch absorbed. So the node state machine is not decoration; it is the source of truth for run progress.

# The Node States

A node is always in exactly one of these states:

- `pending`: created, not yet eligible. Its required inputs are not all satisfied.
- `ready`: all required inputs satisfied, eligible for the ready set. Not yet dispatched.
- `running`: dispatched to the ExecutionEngine; an execution is in flight.
- `succeeded`: the handler returned validated outputs; its output ports are now satisfiable.
- `failed`: the handler returned a terminal failure, or the node hit its retry ceiling.
- `skipped`: an upstream condition or failure caused this node to be intentionally not run.
- `cancelled`: the run was cancelled while this node was `pending`, `ready`, or `running`.

# Transition Rules

The legal transitions are:

```text
pending -> ready         (all required inputs satisfied)
ready   -> running       (dispatched, conditional UPDATE wins the race)
running -> succeeded     (handler returned valid outputs)
running -> failed        (handler failed, or retries exhausted)
running -> cancelled     (cancel signal delivered)
ready   -> skipped       (upstream condition false, or upstream failure propagated)
pending -> skipped       (upstream condition false)
ready   -> cancelled     (run cancelled)
pending -> cancelled     (run cancelled)
succeeded/failed/skipped/cancelled -> (terminal, no further transitions)
```

The `ready -> running` transition is the dispatch-once gate described in [[WorkflowEngine-Part01]]. It is a conditional SQLite update keyed by current state. If the update affects zero rows, another tick already dispatched or skipped this node, and this tick MUST NOT act.

A `running` node that the engine believes is in flight but that recovery ([[WorkflowEngine-Part06]]) cannot confirm is rolled back to `ready`, never to `succeeded`. This is the fail-closed recovery rule.

# State and the RunContext

Only a `succeeded` node writes its output ports into the RunContext. A `failed`, `skipped`, or `cancelled` node writes nothing. Downstream nodes waiting on a `failed` node become `skipped` per Part 05.

# Invariants

```text
A node is in exactly one state at all times.
A terminal node state never transitions again.
ready -> running is guarded by a conditional state update.
Only succeeded nodes populate RunContext output keys.
skipped nodes contribute no values and block no validation.
cancelled nodes discard any in-flight outputs.
Every transition commits with the run's runSeq.
```

# AI Notes

Do not add a `retrying` state. Retries are invisible at the node level: a `running` node that fails and is retried simply transitions `failed -> ready` internally within the retry policy and is re-dispatched. Exposing retry as a state complicates the run-progress math and breaks the "terminal states are final" rule.

Do not let `skipped` mean "we forgot about it". Skipped is a deliberate, recorded terminal state. A skipped node must appear in the UI and in the run record so the user knows a branch was intentionally not taken.

Do not let a `running` node transition directly to `succeeded` without output validation. The handler's result must pass the port schema before the state flips, or a malformed value poisons every downstream node.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeArchitecture-Part01]]
- [[NodeArchitecture-Part02]]
- [[NodeArchitecture-Part04]]
- [[WorkflowEngine-Part01]]
- [[WorkflowEngine-Part03]]
- [[WorkflowEngine-Part06]]
