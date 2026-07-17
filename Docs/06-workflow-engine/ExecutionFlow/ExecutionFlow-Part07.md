---
title: ExecutionFlow Specification - Part 07
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - scheduler
  - concurrency
related:
  - "[[06-workflow-engine/README]]"
  - "[[ExecutionFlow-Part04]]"
  - "[[Scheduler-Part01]]"
  - "[[WorkflowEngine-Part04]]"
---

# ExecutionFlow Specification (Part 07)

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

Part 07 details the Scheduler's role in the execution flow: concurrency limits, admission priority, and how the engine reacts to admission decisions and Scheduler unavailability.

The README is explicit: the WorkflowEngine MUST NOT decide concurrency limits. It proposes a ready set; the [[Scheduler-Part01]] decides how much of that set may run now. This part explains the contract between the two so neither encroaches on the other.

# Concurrency Limits

The Scheduler owns:

- the maximum number of concurrently `running` nodes across all runs (a global budget) and per-run budgets;
- priority ordering when the ready set exceeds the budget (user runs may preempt background runs);
- backpressure: when the budget is full, it admits nothing and the engine holds the rest `ready`.

The engine owns none of this. It passes resource hints ([[NodeArchitecture-Part04]]) as suggestions; the Scheduler may ignore them. This separation is what lets concurrency policy change without touching the engine.

# Admission Priority

When the Scheduler admits a subset of the ready set, it may reorder by priority. The engine does not care about the Scheduler's internal ordering, because the engine already sorted by `nodeId` for its own determinism; the Scheduler's admission order affects only which nodes start first, not which nodes are correct to run. Two admissible nodes are interchangeable from the engine's perspective.

# Reaction to Partial Admission

If the Scheduler admits fewer nodes than the ready set, the engine:

- dispatches the admitted subset (dispatch-once guarded);
- leaves the rest `ready`;
- on the next tick (after a running node completes and frees a slot), re-proposes the still-ready nodes.

Partial admission never loses a node and never double-dispatches, because each dispatch is a conditional state update.

# Scheduler Unavailability

If the Scheduler cannot be reached (crashed, not started), the engine fails the run with `scheduler_unavailable` (fatal). This is fail-closed: waiting indefinitely for a Scheduler that will never answer would hang the run. The failure is recorded, recoverable on restart when the Scheduler returns.

# Invariants

```text
The Scheduler owns concurrency limits; the engine proposes only.
Resource hints are suggestions the Scheduler may ignore.
Partial admission leaves the rest ready and re-proposed next tick.
Admission order does not affect correctness, only start order.
Scheduler unavailability fails the run closed.
The engine never holds a global concurrency counter itself.
```

# AI Notes

Do not let the engine accumulate a "running count" and gate dispatch on it. That is the Scheduler's counter. The engine's job is the conditional state update; the Scheduler's job is the budget. Two counters drift and cause double-dispatch or starvation.

Do not block the tick waiting for the Scheduler to admit everything. Admit what fits, dispatch it, return to the loop. The loop naturally re-proposes the rest.

Do not retry forever when the Scheduler is down inside the tick. Fail the run closed; recovery ([[WorkflowEngine-Part06]]) handles restart. An in-tick spin on an unavailable Scheduler hangs the app.

# Related Documents

- [[06-workflow-engine/README]]
- [[ExecutionFlow-Part04]]
- [[ExecutionFlow-Diagrams]]
- [[WorkflowEngine-Part04]]
- [[WorkflowEngine-Part06]]
- [[Scheduler-Part01]]
- [[NodeArchitecture-Part04]]
