---
title: EdgeTypes Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - edge-types
  - satisfaction
  - resolver
related:
  - "[[06-workflow-engine/README]]"
  - "[[EdgeTypes-Part01]]"
  - "[[EdgeTypes-Part05]]"
  - "[[WorkflowEngine-Part03]]"
---

# EdgeTypes Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, Definition, Base Edge Object Model, States, Invariants
Part 02 - The Edge Kind Catalog: control, data, conditional, error edges
Part 03 - The Edge Kind Catalog: loop-back, artifact, memory, event edges
Part 04 - Ports, the Type Lattice, Coercion, and the Compatibility Algorithm
Part 05 - Cardinality, Transforms, the Two Validators, Illegal Configurations, Checklist, Examples
Part 06 - Edge Satisfaction, the Run-Time Resolver, and the Engine Integration
Diagrams - EdgeTypes-Diagrams.md

# Purpose

Part 06 defines what it means for an edge to be "satisfied" at run time, how the run-time resolver turns a satisfied edge into a value delivered to a target port, and how edges integrate with the engine tick ([[WorkflowEngine-Part08]]).

Validation (Parts 04 and 05) decides whether an edge may exist. Satisfaction decides whether, in this run, at this moment, the edge is carrying a value the target may consume. The two are different: a valid edge may be unsatisfied (its source node has not succeeded yet, or its Condition branch was not selected), and an unsatisfied edge is what keeps the target node in `ready`-waiting or drives it to `skipped`.

# Edge States at Run Time

Each edge instance in a run carries a satisfaction state:

- `pending`: source not yet succeeded; no value available.
- `satisfied`: source succeeded and a value (or explicit empty) is available for the target.
- `unsatisfied`: source succeeded but the edge is not applicable — e.g. a Condition branch not selected, or a Loop-back edge pointing at an iteration already closed.
- `void`: source node was `skipped` or `cancelled`, so the edge carries nothing and the target is skipped ([[NodeArchitecture-Part05]]).

Only `satisfied` edges contribute a value. `unsatisfied` and `void` edges contribute nothing and, depending on the target, either block it (required input missing -> fatal) or skip it (branch not taken).

# The Run-Time Resolver

When a node becomes `ready`, the engine resolves each of its incoming edges:

1. For a `satisfied` edge, read the source's output value from the RunContext key named by the source port ([[WorkflowEngine-Part05]]).
2. Apply the edge's recorded coercion or transform (Part 05) to the value.
3. Deliver the result to the target port. For fan-in, collect all `satisfied` edges' values into the `many` slot, ordered by source `nodeId`.
4. For a `void` or `unsatisfied` edge feeding a `required` port with no default, the node cannot run: it is either `skipped` (branch void) or `failed` with `port_unsatisfied` (genuinely missing input).

The resolver is a pure read of persisted context plus the edge's recorded transforms. It never re-invokes the source node.

# Engine Integration

Edge satisfaction is updated by the tick loop (Part 08) whenever a source node transitions: a node becoming `succeeded` flips its outgoing `pending` edges to `satisfied` (or `unsatisfied` for unselected Condition branches); a node becoming `skipped` or `cancelled` flips its outgoing edges to `void`. The ready-set computation ([[WorkflowEngine-Part03]]) reads edge satisfaction to decrement each target's remaining-dependency counter. This is the mechanism by which data edges and control edges both ultimately drive readiness.

# Invariants

```text
A satisfied edge delivers a value from the RunContext key of its source port.
An unsatisfied branch edge skips its target, never fails it.
A void edge (source skipped/cancelled) skips or cancels its target.
Fan-in collects satisfied values ordered by source nodeId.
The resolver is a pure read; it never re-invokes the source.
Edge satisfaction updates in the same transaction as the source's state change.
```

# AI Notes

Do not confuse `unsatisfied` with `void`. An unselected Condition branch is `unsatisfied` and should skip its target (a decision); a source that was skipped itself is `void` and also skips, but the reasons differ and the run report should reflect both.

Do not let a `void` edge's target hang in `pending`. If its only inputs are void, it must be skipped (or cancelled under run cancellation), or the run never terminates.

Do not resolve a value by re-running the source. The resolver reads the RunContext. Re-running the source breaks replay and the dispatch-once invariant.

# Related Documents

- [[06-workflow-engine/README]]
- [[EdgeTypes-Part01]]
- [[EdgeTypes-Part05]]
- [[EdgeTypes-Diagrams]]
- [[WorkflowEngine-Part03]]
- [[WorkflowEngine-Part05]]
- [[WorkflowEngine-Part08]]
- [[NodeArchitecture-Part02]]
- [[NodeArchitecture-Part05]]
- [[ConditionNodes-Part03]]
