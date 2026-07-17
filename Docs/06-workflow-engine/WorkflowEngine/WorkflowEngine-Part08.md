---
title: WorkflowEngine Specification - Part 08
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-engine-core
  - tick-algorithm
  - checklist
related:
  - "[[06-workflow-engine/README]]"
  - "[[WorkflowEngine-Part01]]"
  - "[[WorkflowEngine-Part03]]"
  - "[[WorkflowEngine-Part07]]"
  - "[[Scheduler-Part01]]"
---

# WorkflowEngine Specification (Part 08)

## Document Index

Part 01 - Purpose, Philosophy, Boundaries, and the Run Object Model
Part 02 - Graph Representation In Memory and In SQLite
Part 03 - Readiness, the Ready Set, and Topological Execution
Part 04 - Parallel Branch Execution and the Scheduler Handshake
Part 05 - RunContext and Data Passing Between Nodes
Part 06 - Pause, Resume, Cancel, and Restart Recovery
Part 07 - Determinism and Replay
Part 08 - The Engine Tick Algorithm, Checklist, and Examples
Diagrams - WorkflowEngine-Diagrams.md

# Purpose

Part 08 writes down the engine tick algorithm in full, as a numbered procedure, plus a pre-dispatch checklist and two worked examples.

Everything in Parts 01 through 07 is detail about this loop. This part is the loop itself. An implementer should be able to code the tick from this part alone, provided they have read the contracts it references.

# The Tick Algorithm

The engine runs the following procedure, repeatedly, for one run:

1. Load the run record and the node states from SQLite (the in-memory mirror is the read path; SQLite is authoritative).
2. If the run state is terminal (`succeeded`, `failed`, `cancelled`), stop.
3. If the run state is `pausing` or `cancelling`, finish that transition per Part 06 and stop dispatching new nodes.
4. Compute the ready set: every node in `ready` state whose remaining-dependency count is zero and whose required inputs are satisfied (Part 03).
5. If the ready set is empty and no node is `running`, compute the terminal state (Part 03 terminal rules) and transition the run; stop.
6. Sort the ready set by `nodeId` (never by insertion order) for determinism (Part 01, Part 07).
7. Call `Scheduler.admit(readySet)` to obtain the admitted subset and the per-node execution slots (Part 04). The Scheduler may return fewer than the full ready set.
8. For each admitted node, perform the dispatch-once transition: a conditional SQLite update `UPDATE nodes SET state='running' WHERE runId=? AND nodeId=? AND iterationIndex=? AND state='ready'`. If zero rows changed, skip this node (another tick won, or it was skipped).
9. For each successfully-dispatched node, build an `ExecutionRequest` (Part 01, Part 05) and hand it to the ExecutionEngine. In `replay` mode, substitute the recorded `NodeResult` instead (Part 07).
10. Await at least one result (or, in parallel mode, any completion). For each returned result: validate its schema; write outputs to the RunContext (Part 05); apply edge satisfaction and skip/failure propagation (Part 03, [[NodeArchitecture-Part05]]); persist the node state and the `runSeq` bump in one transaction; emit `workflow.node.state_changed` and `workflow.run.state_changed` after commit (Part 01, [[EventBus-Part01]]).
11. Recompute the ready set and return to step 1.

# Pre-Dispatch Checklist

Before step 8 for any node, confirm:

- the node's `nodeKind` is registered ([[NodeArchitecture-Part06]]);
- its config passed schema validation (Part 02);
- all required input ports are satisfied from the RunContext (Part 05);
- the deterministic order has been applied (sorted by `nodeId`);
- the run is not in a pause/cancel transition.

# Worked Example 1 — Linear Graph

Graph: `Input -> Builder -> Verifier -> Merge -> Output`. Tick 1 computes ready set `{Input}`; admit; Input succeeds, seeds context. Tick 2 ready `{Builder}`; Builder emits `artifactRef`. Tick 3 ready `{Verifier}`; Verifier emits `verdict`. Tick 4 ready `{Merge}`; Merge applies. Tick 5 ready `{Output}`; Output publishes. Tick 6 ready set empty, nothing running, run `succeeded`.

# Worked Example 2 — Parallel Branches

Graph: `Input -> [BuilderA, BuilderB] -> Merge -> Output`. Tick 2 ready `{BuilderA, BuilderB}`; Scheduler admits both; both run; both emit references. Tick 3 ready `{Merge}`; Merge joins; run continues. The two Builders ran in parallel because the ready set contained both and the Scheduler admitted both (Part 04). Order within the tick is `BuilderA` then `BuilderB` by `nodeId`, never by canvas position.

# Invariants

```text
The tick reads SQLite, acts, writes SQLite, repeats.
Dispatch is guarded by a conditional state update.
The ready set is sorted by nodeId before admit.
Events are emitted only after their transaction commits.
The loop stops only at a terminal run state.
In replay, ExecutionEngine is replaced by the result log.
```

# AI Notes

Do not add early-return shortcuts that skip the persist-and-emit step. Every state change must commit and emit; a "fast path" that omits either breaks recovery or the UI.

Do not admit the ready set directly to the ExecutionEngine. The Scheduler decides concurrency; the engine proposes. Bypassing the Scheduler couples the engine to resource limits it must not own (Part 01).

Do not recompute readiness by walking parents on demand. Maintain the remaining-dependency counter (Part 03) so the ready set is O(V) per tick and correct under skip propagation.

# Related Documents

- [[06-workflow-engine/README]]
- [[WorkflowEngine-Part01]]
- [[WorkflowEngine-Part03]]
- [[WorkflowEngine-Part04]]
- [[WorkflowEngine-Part07]]
- [[WorkflowEngine-Diagrams]]
- [[Scheduler-Part01]]
- [[ExecutionEngine-Part01]]
- [[EventBus-Part01]]
- [[NodeArchitecture-Part05]]
