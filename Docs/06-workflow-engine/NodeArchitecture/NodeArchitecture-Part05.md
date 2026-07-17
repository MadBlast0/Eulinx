---
title: NodeArchitecture Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-architecture
  - error-propagation
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeArchitecture-Part01]]"
  - "[[NodeArchitecture-Part03]]"
  - "[[NodeArchitecture-Part04]]"
---

# NodeArchitecture Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Base Node Contract, and Invariants
Part 02 - Ports, Typed Inputs and Outputs, and the Port Compatibility Rules
Part 03 - The Node Lifecycle State Machine and State Transitions
Part 04 - Execution Isolation, Retries, Timeouts, and Resource Limits
Part 05 - Error Propagation to Downstream Nodes
Part 06 - The Node Kind Registry and Custom Plugin Node Registration
Diagrams - NodeArchitecture-Diagrams.md

# Purpose

Part 05 defines what happens to the rest of the graph when a node fails, is skipped, or is cancelled.

A graph is a dependency web. When one node cannot produce its outputs, every node that needed those outputs cannot run either. The rules here are what turn a single failure into a correct, bounded blast radius instead of a cascade of confusing errors or, worse, nodes that hang forever in `pending`.

# Failure Propagation

When a node becomes `failed` (and its retry policy is exhausted, or the failure is fatal and non-retryable), the engine marks every downstream node that depends on it transitively as `skipped`, unless an upstream `condition` or `merge` node legally selects an alternative path. The propagation is computed by walking outgoing edges:

```text
on node FAILED:
  for each downstream node D reachable by following edges from F:
    if D is not already terminal and not on an alternate satisfied branch:
      mark D skipped
```

A node is skipped, not failed, because it did not itself error. Its state communicates "not run because an ancestor failed". This distinction matters for the run terminal-state math and for the UI.

# Skip Propagation From Conditions

A [[ConditionNodes-Part01]] that evaluates false does not fail. It `succeeds` (the evaluation worked) but marks its non-selected output branches `skipped`. Those skipped branches then propagate skip to their own downstream nodes exactly as a failure would. A skipped branch is a deliberate decision, and it must never be retried or treated as an error.

# Cancellation Propagation

When a run is cancelled, every node that is `pending` or `ready` becomes `cancelled`, and every `running` node receives a cancel signal. A `running` node that completes after the signal is discarded (its outputs are not written). Downstream nodes of a cancelled node are themselves cancelled, not skipped, because the run as a whole stopped rather than a branch being pruned.

# The Merge Exception

A [[NodeTypes-Part01]] Merge node is the one place where a "missing" input is normal. A Merge node waits for a configurable subset of its inputs (the join set) and may legally proceed when, say, only the success branch arrives and the failure branch was skipped. Merge nodes are defined in [[NodeTypes-Part01]] and their join semantics in [[ExecutionFlow-Part01]]. They are the explicit, declared exception to "all upstream must succeed".

# Invariants

```text
A failed node skips its transitive downstream dependents.
A skipped node skips its own downstream dependents.
A condition-false branch is skipped, never failed.
A cancelled run cancels, not skips, its remaining nodes.
A Merge node may proceed with a declared subset of inputs present.
Skip and cancel are terminal; they never transition again.
Propagation commits with the run's runSeq in one transaction.
```

# AI Notes

Do not mark a downstream node `failed` just because its ancestor failed. The downstream node never ran; calling it failed invents an error that did not happen and corrupts the run's failure report. Use `skipped`.

Do not let a skipped node stay `pending` forever. A branch that will never run must be flipped to `skipped` immediately during propagation, or the ready-set computation will keep wondering whether it might become ready and the run will never terminate.

Do not treat a Condition's unselected branch as an error to retry. Retrying a branch the condition deliberately pruned is looping on a decision that will not change.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeArchitecture-Part01]]
- [[NodeArchitecture-Part03]]
- [[NodeArchitecture-Part04]]
- [[NodeArchitecture-Part06]]
- [[ConditionNodes-Part01]]
- [[NodeTypes-Part01]]
- [[ExecutionFlow-Part01]]
- [[WorkflowEngine-Part03]]
