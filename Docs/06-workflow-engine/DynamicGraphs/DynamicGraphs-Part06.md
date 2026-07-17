---
title: DynamicGraphs Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - dynamic-graphs
  - checklist
  - examples
related:
  - "[[06-workflow-engine/README]]"
  - [[DynamicGraphs-Part01]]
  - [[DynamicGraphs-Part05]]
  - [[WorkflowExamples-Part04]]
---

# DynamicGraphs Specification ( Part 06 )

## Document Index

Part 01 - Purpose, Philosophy, Definition, Object Model, States, Invariants
Part 02 - The Mutation Request Type and Full Validation
Part 03 - Authorization: Who May Mutate, and the Rejection of Workers
Part 04 - Adding Nodes and Edges, Subgraph Expansion, Cycle Prevention
Part 05 - Budgets, Determinism, Replay, Rollback, The Complete Algorithm
Part 06 - Implementation Checklist, Worked Examples, Common Mistakes, Future Expansion
Diagrams - DynamicGraphs-Diagrams.md

# Purpose

Part 06 gives an implementer checklist, two worked dynamic-graph examples, the common mistakes, and the future-expansion surface.

# Implementer Checklist

- Accept mutations only as `MutationRequest` values, never as direct graph edits.
- Validate kind, config, ports, edge compatibility, and cardinality (Parts 02, 04).
- Enforce authorization and the kind allow-list (Part 03).
- Enforce budgets (Part 05) before applying.
- Run cycle prevention; reject non-loop cycles (Part 04).
- Confirm no succeeded node's result is invalidated (README rule).
- Apply atomically; append to the mutation log; emit `workflow.graph.mutated` after commit.
- On replay, apply recorded mutations in order; never re-derive.

# Worked Example 1 — Plan Expansion

An `Orchestrator` node emits a `MutationRequest` expanding a placeholder `Plan` node into `Builder -> Verifier -> Merge`. The engine validates the three nodes and two edges, checks the budget (3 nodes, 2 edges, kinds allowed), confirms no cycle, and applies atomically. The placeholder's incoming edge rewires to `Builder`; its outgoing edge rewires from `Merge`. The run continues with the concrete subgraph.

# Worked Example 2 — Rejected Mutation

An `Orchestrator` proposes adding an edge that creates a control cycle back to an already-succeeded node. Cycle prevention rejects it as `graph_invalid`; the transaction rolls back; the Orchestrator is notified. The run continues on the unchanged graph. No partial change persists.

# Common Mistakes

- Letting a Worker (not an Orchestrator) propose mutations; rejected by authorization (Part 03).
- Applying a mutation without a budget check; the graph grows unbounded.
- Non-atomic subgraph expansion; a half-expanded graph dispatches orphan nodes.
- Re-deriving mutations during replay; the run diverges from the original.
- Allowing a mutation to invalidate a succeeded node's result; downstream nodes see a different value than they computed against.

# Future Expansion Surface

Dynamic graphs can grow to support: speculative mutation (propose-and-evaluate before commit), mutation diffs shown in the UI as a review step before `Human-approval` ([[NodeTypes-Part05]]), and cross-run mutation templates (a plan that expands the same way in many runs). None require changing the validation or rollback core; they layer on the recorded `MutationRequest` and the budget system.

# Invariants

```text
Mutations are validated, budgeted, authorized, and atomic.
A rejected mutation rolls back completely.
Replay applies recorded mutations in order.
No succeeded node's result is ever invalidated by a mutation.
The UI may review a mutation, but only via a recorded request.
```

# AI Notes

Do not let a Worker propose graph changes. Only an Orchestrator with `allowDynamicMutation` may, and even then through validation. Workers are doers, not planners ([[NodeTypes-Part02]]).

Do not make mutation expansion observable mid-transaction. Atomic swap only; the engine must never dispatch a node from a half-built subgraph.

Do not treat a rejected mutation as a run failure by default. Most rejections are the Orchestrator's plan being imperfect; the run should continue on the unchanged graph and let the Orchestrator try again.

# Related Documents

- [[06-workflow-engine/README]]
- [[DynamicGraphs-Part01]]
- [[DynamicGraphs-Part05]]
- [[DynamicGraphs-Diagrams]]
- [[NodeTypes-Part02]]
- [[NodeTypes-Part05]]
- [[WorkflowEngine-Part07]]
- [[WorkflowExamples-Part04]]
