---
title: DynamicGraphs Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - dynamic-graphs
  - mutation
  - cycle-prevention
related:
  - "[[06-workflow-engine/README]]"
  - [[DynamicGraphs-Part01]]
  - [[DynamicGraphs-Part02]]
  - [[EdgeTypes-Part05]]
---

# DynamicGraphs Specification ( Part 04 )

## Document Index

Part 01 - Purpose, Philosophy, Definition, Object Model, States, Invariants
Part 02 - The Mutation Request Type and Full Validation
Part 03 - Authorization: Who May Mutate, and the Rejection of Workers
Part 04 - Adding Nodes and Edges, Subgraph Expansion, Cycle Prevention
Part 05 - Budgets, Determinism, Replay, Rollback, The Complete Algorithm
Part 06 - Implementation Checklist, Worked Examples, Common Mistakes, Future Expansion
Diagrams - DynamicGraphs-Diagrams.md

# Purpose

Part 04 defines the concrete mutations the engine accepts at run time: adding nodes, adding edges, and expanding a subgraph, plus the cycle-prevention rules that keep a mutated graph legal.

A dynamic graph is one that changes while running. An Orchestrator ([[NodeTypes-Part02]]) may propose adding a step it forgot, or expanding a high-level plan into concrete nodes. The engine accepts these proposals only through the validated mutation path (Part 02); it never lets a node edit the graph by direct reference. This part says what a legal mutation looks like and how the engine keeps the graph acyclic and consistent.

# Adding Nodes

A mutation may add a node by supplying:

- a `nodeId` unique within the run (never reusing an existing id);
- a registered `nodeKind` ([[NodeArchitecture-Part06]]);
- a config that passes the kind's schema;
- the declared input and output ports for the kind (or, for parametric kinds like MCP, the discovered ports);
- the iteration context, if the new node belongs inside a Loop body ([[LoopNodes-Part03]]).

The new node enters the graph in `pending` state. It becomes `ready` only when its required inputs are satisfied by existing or simultaneously-added edges.

# Adding Edges

A mutation may add an edge by supplying source and target port references and the edge kind. The new edge is validated by the compatibility algorithm ([[EdgeTypes-Part04]]) and the cardinality rules ([[EdgeTypes-Part05]]) exactly as at static validation. An edge that would connect incompatible types, or that violates cardinality, is rejected as `graph_invalid`.

# Subgraph Expansion

Subgraph expansion is a batch mutation: a placeholder node (e.g. an `Orchestrator`'s plan step) is replaced by a small subgraph of concrete nodes plus the edges binding them to the placeholder's neighbors. Expansion is atomic: the placeholder and its replacement are swapped in one transaction, so the graph is never observed half-expanded. The placeholder's incoming edges are rewired to the expansion's entry node; its outgoing edges to the expansion's exit node.

# Cycle Prevention

Every mutation is checked for cycles before application:

- Adding a node alone cannot create a cycle.
- Adding an edge is rejected if it would create a control cycle not enclosed in a declared Loop node ([[LoopNodes-Part01]]). The engine runs a cycle check over the proposed graph; if a cycle exists outside a loop, the mutation is rejected as `graph_invalid`.
- Loop-back edges ([[EdgeTypes-Part03]]) are permitted only when both endpoints lie inside the same loop body; an edge leaving the body and re-entering is rejected.

Cycle prevention is non-negotiable: a control cycle with no loop semantics is an infinite run, which violates the termination guarantees of the engine.

# Invariants

```text
A mutation adds nodes/edges only via the validated path, never direct edits.
A new node id is unique within the run.
New edges pass the compatibility and cardinality checks.
Subgraph expansion is atomic and never observed half-done.
An edge creating a non-loop control cycle is rejected.
Loop-back edges stay within their loop body.
```

# AI Notes

Do not let a node edit the graph by reference. The only path is a mutation request validated by Part 02. Direct editing bypasses validation and can invalidate completed nodes, breaking the "a mutation must never invalidate a completed result" rule.

Do not allow subgraph expansion to be non-atomic. A half-expanded graph observed mid-transaction can dispatch a node whose neighbors are missing, corrupting the run.

Do not skip cycle prevention on dynamic edges. A runtime-proposed edge is as dangerous as a static one; a cycle is a hang regardless of when it was added.

# Related Documents

- [[06-workflow-engine/README]]
- [[DynamicGraphs-Part01]]
- [[DynamicGraphs-Part02]]
- [[DynamicGraphs-Part05]]
- [[DynamicGraphs-Diagrams]]
- [[NodeTypes-Part02]]
- [[NodeArchitecture-Part06]]
- [[EdgeTypes-Part04]]
- [[EdgeTypes-Part05]]
- [[LoopNodes-Part01]]
