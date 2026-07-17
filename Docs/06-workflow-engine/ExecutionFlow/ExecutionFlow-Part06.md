---
title: ExecutionFlow Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - failure
  - cancellation
related:
  - "[[06-workflow-engine/README]]"
  - "[[ExecutionFlow-Part05]]"
  - "[[NodeArchitecture-Part05]]"
  - "[[WorkflowEngine-Part06]]"
---

# ExecutionFlow Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, Boundaries, Object Model, States, Invariants
Part 02 - Triggers, Run Initialization, and Context Seeding
Part 03 - The Tick Loop and the Ready-Set Algorithm
Part 04 - Dispatch, Parallel Branches, and the Scheduler Handshake
Part 05 - Fan-In, Fan-Out, Join Semantics, and Barriers
Part 06 - Skip Propagation, Failure, Cancellation, and Terminal States
Part 07 - Scheduler Concurrency Limits and Admission
Part 08 - Worked Examples, the Implementation Checklist, and Common Mistakes
Diagrams - ExecutionFlow-Diagrams.md

# Purpose

Part 06 defines how a run reaches an end: skip propagation across branches, failure propagation, cancellation, and the computation of the terminal run state.

A run is not "done" when the last node finishes; it is done when the engine has correctly classified every node and aggregated those classifications into exactly one terminal run state. This part owns that classification and the propagation rules that make it correct.

# Skip Propagation

When a node is `skipped` (by a Condition branch, [[ConditionNodes-Part03]], or by upstream failure, [[NodeArchitecture-Part05]]), its outgoing edges become `void` ([[EdgeTypes-Part06]]). Every downstream node reachable through `void` edges is itself `skipped`, unless a Merge node (Part 05) legally proceeds without it. Skip propagation is computed transitively and committed in the same transaction as the originating skip, so the ready set immediately reflects it and the run can terminate.

# Failure Propagation

When a node is `failed` (retries exhausted or fatal), its downstream dependents are `skipped` (not `failed`) unless an alternate satisfied branch exists. A `failed` node with no absorbing branch drives the run toward `failed`. The run becomes `failed` when at least one node is `failed` and that failure was not absorbed by a retry or a Condition/ Merge alternative. A single absorbed failure does not fail the run.

# Cancellation

On cancel ([[WorkflowEngine-Part06]]), every `pending` or `ready` node becomes `cancelled`, every `running` node receives a cancel signal, and late completions are discarded. A cancelled run is terminal and never transitions again. Downstream of a cancelled node are `cancelled`, not `skipped`, because the whole run stopped rather than a branch being pruned.

# Terminal State Computation

The engine computes the terminal state when the ready set is empty and nothing is `running` ([[WorkflowEngine-Part08]] step 5):

- If every node is `succeeded` or `skipped`, the run is `succeeded`.
- If at least one node is `failed` and unabsorbed, the run is `failed`.
- If the run was cancelled, it is `cancelled`.
- Any other combination indicates an internal inconsistency and fails the run with `recovery_impossible` after the recovery path is exhausted.

The classification is a pure function of node states, so replay reaches the same terminal state.

# Invariants

```text
A skipped node skips its void-edge transitive downstream.
A failed node skips (not fails) its downstream dependents.
A cancelled run cancels, not skips, its remaining nodes.
succeeded requires all nodes succeeded or skipped.
failed requires an unabsorbed failed node.
Terminal states are reached exactly once and never transition again.
Terminal computation is a pure function of node states.
```

# AI Notes

Do not mark a downstream node `failed` because its ancestor failed. The downstream node never ran; calling it failed invents an error. Use `skipped`.

Do not let skip propagation lag behind the ready-set computation. Skips must commit in the same transaction as their cause, or the run can hang waiting on a node that will never run.

Do not treat a cancelled run's late completion as success. Discard it. Downstream nodes are being cancelled; a stray value would wrongly enable them.

# Related Documents

- [[06-workflow-engine/README]]
- [[ExecutionFlow-Part05]]
- [[ExecutionFlow-Diagrams]]
- [[NodeArchitecture-Part05]]
- [[ConditionNodes-Part03]]
- [[EdgeTypes-Part06]]
- [[WorkflowEngine-Part06]]
- [[WorkflowEngine-Part08]]
