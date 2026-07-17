---
title: DynamicGraphs Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - dynamic-graphs
  - budgets
  - replay
  - rollback
related:
  - "[[06-workflow-engine/README]]"
  - [[DynamicGraphs-Part01]]
  - [[DynamicGraphs-Part04]]
  - [[WorkflowEngine-Part07]]
---

# DynamicGraphs Specification ( Part 05 )

## Document Index

Part 01 - Purpose, Philosophy, Definition, Object Model, States, Invariants
Part 02 - The Mutation Request Type and Full Validation
Part 03 - Authorization: Who May Mutate, and the Rejection of Workers
Part 04 - Adding Nodes and Edges, Subgraph Expansion, Cycle Prevention
Part 05 - Budgets, Determinism, Replay, Rollback, The Complete Algorithm
Part 06 - Implementation Checklist, Worked Examples, Common Mistakes, Future Expansion
Diagrams - DynamicGraphs-Diagrams.md

# Purpose

Part 05 defines the guardrails that keep dynamic mutation safe at scale: mutation budgets, determinism, replay of mutations, and rollback, plus the complete mutation algorithm.

Dynamic mutation is powerful and dangerous. Without limits, an Orchestrator could grow the graph without bound, or propose a mutation that diverges between runs. These guardrails make mutation predictable and replayable.

# Mutation Budgets

A run carries a mutation budget agreed at validation:

- `maxNodesAdded`: a ceiling on nodes a run may add beyond the frozen snapshot.
- `maxEdgesAdded`: a ceiling on edges.
- `maxMutations`: a ceiling on total mutation requests.
- `allowedKinds`: the set of node kinds mutations may introduce (e.g. an Orchestrator may add `Builder` and `Verifier` but not `Human-approval`).

When a mutation would exceed a budget, it is rejected as `graph_invalid` (fail-closed). Budgets are part of the frozen run config, so replay sees the same limits.

# Determinism and Replay of Mutations

A mutation request is recorded in the run's mutation log with its `runSeq`. Replay ([[WorkflowEngine-Part07]]) applies the same mutations in the same order, because the requests are persisted, not re-derived from the model. The model's suggestion is captured once, validated once, and replayed verbatim. This preserves the untrusted-input rule: a replay never re-asks the model "what should I add?".

The determinism seed ([[WorkflowEngine-Part01]]) is NOT used to generate mutations. Mutations are explicit requests; they are recorded and replayed, like node results.

# Rollback

If a mutation is accepted but then proves to make the graph invalid at apply time (e.g. a simultaneously-added edge fails compatibility after a concurrent mutation), the whole mutation transaction rolls back. The graph returns to its pre-mutation state, and the Orchestrator is notified of the rejection. Rollback is atomic: a mutation is all-or-nothing. No partial graph change survives a failed mutation.

# The Complete Mutation Algorithm

1. Receive a `MutationRequest` (Part 02) from an authorized source (Part 03).
2. Check the budget; reject if exceeded.
3. Validate structure (Part 02): kind registered, config schema valid, ports declared, edges compatible and within cardinality.
4. Check authorization and kind allow-list; reject if not permitted.
5. Run cycle prevention (Part 04); reject if a non-loop cycle would form.
6. Verify the mutation does not invalidate any already-`succeeded` node's result (the README rule).
7. Apply inside one transaction: add nodes/edges, rewire expansion, bump `runSeq`, append to the mutation log, emit `workflow.graph.mutated` after commit.
8. Recompute the ready set; continue the tick loop.

# Invariants

```text
Mutations respect maxNodesAdded, maxEdgesAdded, maxMutations, allowedKinds.
Mutations are recorded and replayed, never re-derived from the model.
A mutation transaction is all-or-nothing; rollback is atomic.
A mutation never invalidates an already-succeeded node's result.
Budgets are frozen in run config; replay sees the same limits.
The mutation log is append-only with runSeq.
```

# AI Notes

Do not let an Orchestrator grow the graph without a budget. Unbounded mutation is a denial-of-resource and a non-determinism risk. Cap it.

Do not re-derive mutations during replay. Replaying the recorded request is what keeps the run reproducible. Re-asking the model produces a different graph.

Do not let a mutation touch a completed node's result. A node that already succeeded produced a value downstream nodes rely on; changing the graph around it must not retroactively change that value.

# Related Documents

- [[06-workflow-engine/README]]
- [[DynamicGraphs-Part01]]
- [[DynamicGraphs-Part04]]
- [[DynamicGraphs-Part06]]
- [[DynamicGraphs-Diagrams]]
- [[WorkflowEngine-Part07]]
- [[NodeTypes-Part02]]
- [[EdgeTypes-Part04]]
- [[LoopNodes-Part01]]
