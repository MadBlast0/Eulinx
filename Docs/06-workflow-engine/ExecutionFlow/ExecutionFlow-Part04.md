---
title: ExecutionFlow Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - dispatch
  - parallelism
related:
  - "[[06-workflow-engine/README]]"
  - "[[ExecutionFlow-Part01]]"
  - "[[ExecutionFlow-Part03]]"
  - "[[WorkflowEngine-Part04]]"
  - "[[Scheduler-Part01]]"
---

# ExecutionFlow Specification (Part 04)

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

Part 04 defines how a computed ready set becomes running work: the dispatch step, parallel branch execution, and the handshake with the [[Scheduler-Part01]] that decides how much of the ready set may actually run now.

The engine computes readiness (Part 03); it does not decide how many ready nodes run concurrently. That is the Scheduler's job. Part 04 is the boundary between "these nodes could run" and "these nodes are running", and it is where parallelism enters the flow.

# The Dispatch Step

When the tick loop ([[WorkflowEngine-Part08]]) has a ready set, it:

1. Sorts the ready set by `nodeId` (deterministic order, [[WorkflowEngine-Part01]]).
2. Calls `Scheduler.admit(readySet)` with the set and any per-node resource hints ([[NodeArchitecture-Part04]]).
3. Receives back the admitted subset: the nodes the Scheduler has slots for right now.
4. For each admitted node, performs the dispatch-once conditional update to `running`, builds an `ExecutionRequest`, and hands it to the [[ExecutionEngine-Part01]].
5. Nodes in the ready set but not admitted stay `ready` and are reconsidered on the next tick (or when a running node completes and frees a slot).

The ready set is a proposal; the admitted set is what actually runs. The engine never assumes all ready nodes run in one tick.

# Parallel Branches

Two nodes are parallel branches when neither depends on the other (their remaining-dependency counters are independent). When both are in the ready set and the Scheduler admits both, they run concurrently as separate ExecutionEngine executions. They share nothing: each reads only its own input ports, each writes only its own output ports, and each has its own `executionId`. This isolation ([[NodeArchitecture-Part04]]) is what makes parallel execution safe and replayable.

Parallelism is an emergent property of graph structure plus Scheduler admission, not a flag the author sets. The author draws independent branches; the engine discovers them via the ready set; the Scheduler runs as many as it can.

# The Scheduler Handshake

The handshake is a request/response, never a shared variable:

```text
Engine  -- admit(readySet, hints) -->  Scheduler
Engine  <-- admittedSet -----------  Scheduler
```

The Scheduler may return fewer nodes than requested, or a reordered priority subset, but it MUST return a subset of the requested set (it never invents nodes). The engine treats the returned set as the dispatch batch. If the Scheduler is unavailable, the run fails with `scheduler_unavailable` (fatal), per the fail-closed principle.

# Invariants

```text
The ready set is sorted by nodeId before admission.
The Scheduler returns a subset of the requested ready set.
An admitted node transitions running only via a conditional update.
Unadmitted ready nodes stay ready and are retried next tick.
Parallel branches share no state; each has its own executionId.
The Scheduler's absence fails the run closed.
```

# AI Notes

Do not dispatch the ready set directly to the ExecutionEngine. The Scheduler owns concurrency; bypassing it couples the engine to resource limits it must not own.

Do not assume all ready nodes run this tick. The Scheduler may admit one of ten. The engine must tolerate partial admission and revisit the rest.

Do not let parallel branches share an `executionId` or a context key. Shared identity is shared state, and shared state is where parallel replay breaks.

# Related Documents

- [[06-workflow-engine/README]]
- [[ExecutionFlow-Part01]]
- [[ExecutionFlow-Part03]]
- [[ExecutionFlow-Part05]]
- [[ExecutionFlow-Diagrams]]
- [[WorkflowEngine-Part04]]
- [[WorkflowEngine-Part08]]
- [[Scheduler-Part01]]
- [[ExecutionEngine-Part01]]
- [[NodeArchitecture-Part04]]
