---
title: ExecutionFlow Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - join
  - fan-in
related:
  - "[[06-workflow-engine/README]]"
  - "[[ExecutionFlow-Part04]]"
  - "[[NodeTypes-Part03]]"
  - "[[EdgeTypes-Part05]]"
---

# ExecutionFlow Specification (Part 05)

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

Part 05 defines how parallel branches come back together: fan-in collection, fan-out broadcast, join semantics at a Merge node, and barrier synchronization.

A graph that only forks is useless; the value of parallelism is that results recombine. Recombination is where ordering, completeness, and skip handling all matter. This part owns those rules.

# Fan-In

When several nodes feed one target port declared `many` (cardinality, [[EdgeTypes-Part05]]), the target's remaining-dependency counter waits for all of them. The resolver ([[EdgeTypes-Part06]]) collects the satisfied values into a single collection, ordered by source `nodeId` for determinism. The target becomes `ready` only when every incoming edge is `satisfied` or `void` (a void edge means that branch was skipped; the collector notes the absence). If a required incoming edge is `unsatisfied` with no default and no skip, the target fails with `port_unsatisfied`.

# Fan-Out

When one source feeds several targets, each target receives its own copy of the value (broadcast). Fan-out does not wait; each target's readiness depends only on its own other inputs. Fan-out is how a single seed (e.g. a `goal`) reaches many independent Builders.

# Join Semantics at a Merge Node

A [[NodeTypes-Part03]] Merge node declares a `joinSet` (which inputs must arrive) and a `strategy`:

- `wait-all`: the Merge waits until every input in the join set is `satisfied`. Skipped inputs are treated as absent; if a required join input is `failed` (not merely skipped), the Merge fails with `join_unsatisfiable` (fatal).
- `wait-any`: the Merge proceeds when at least one join input is `satisfied`; the rest, if they arrive later, are ignored or collected per `conflictPolicy`.
- `wait-first`: the Merge proceeds on the first `satisfied` input and discards others.

The Merge is the explicit, declared exception to "all upstream must succeed" ([[NodeArchitecture-Part05]]). A success branch and a skipped failure branch can be reconciled because the Merge's join set permits the skipped one to be absent.

# Barriers

A barrier is an implicit join created by a node whose remaining-dependency counter has not yet reached zero: the node simply does not become `ready` until all its incoming edges resolve. There is no separate "barrier node"; readiness itself is the barrier. This keeps the model uniform: fan-in, Merge, and any multi-input node all use the same remaining-dependency counter. A true global barrier (wait for an unrelated branch) is an anti-pattern in Eulinx and is expressed instead as a Merge or a shared downstream node.

# Invariants

```text
Fan-in collects satisfied values ordered by source nodeId.
A target with a failed required input fails, not waits forever.
A Merge may proceed with a declared subset of inputs present.
wait-all fails on a failed join input, not on a skipped one.
Fan-out delivers an independent copy to each target.
Readiness itself is the barrier; no separate barrier node exists.
```

# AI Notes

Do not let a fan-in target wait forever on a skipped branch. A skipped branch is absent by decision; the collector must treat it as absent, not as pending, or the run hangs.

Do not use a Merge `wait-all` when one branch is expected to be skipped. Choose `wait-any` or set the join set to exclude the optional branch. `wait-all` on an optional branch fails the run.

Do not invent a global barrier node. Readiness via the dependency counter is the barrier. A separate construct duplicates the mechanism and invites divergence.

# Related Documents

- [[06-workflow-engine/README]]
- [[ExecutionFlow-Part04]]
- [[ExecutionFlow-Part06]]
- [[ExecutionFlow-Diagrams]]
- [[NodeTypes-Part03]]
- [[EdgeTypes-Part05]]
- [[EdgeTypes-Part06]]
- [[NodeArchitecture-Part05]]
- [[WorkflowEngine-Part03]]
