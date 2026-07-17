---
title: WorkflowExamples Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-examples
  - dynamic-graph
related:
  - "[[06-workflow-engine/README]]"
  - [[WorkflowExamples-Part01]]
  - [[WorkflowExamples-Part03]]
  - [[DynamicGraphs-Part01]]
  - [[WorkflowExamples-Diagrams]]
---

# WorkflowExamples Specification (Part 04)

## Document Index

Part 01 - Entry point, object model, and Example 1: Fix a failing test
Part 02 - Example 2: Add a feature across N files (parallel fan-out and join)
Part 03 - Example 3: Refactor with a bounded refine loop
Part 04 - Example 4: Dynamic expansion (runtime graph extension)
WorkflowExamples-Diagrams - Four representations per example, six sets total

# Purpose

Part 04 presents Example 4: a workflow that starts as a high-level plan and expands at run time when an Orchestrator proposes concrete nodes, exercising [[DynamicGraphs-Part01]].

This example shows the engine's dynamic-graph capability end to end: a small seed graph, an Orchestrator that discovers it needs more steps than it declared, a validated mutation that adds those steps, and a run that completes on the expanded graph. It is the strongest demonstration of the "treat AI-proposed mutations as untrusted" principle. A variant of this example (human approval on a database migration) appears in the catalog index but is out of scope for the four core examples here.

# The Seed Graph

The run starts as:

```text
Input(goal: "Add OAuth login to the app")
  -> Orchestrator(plan, allowDynamicMutation=true, allowedKinds=[Builder, Verifier, Merge, Tool])
  -> Output(plan-summary)
```

The Orchestrator's plan is high-level; it does not yet know the exact files. After it inspects the project (read-only), it realizes it needs: a `Tool` call to scaffold routes, a `Builder` for the auth logic, a `Verifier` for the security check, and a `Merge` to apply. It emits a `MutationRequest` to expand its own placeholder into that subgraph.

# The Mutation Request (real shape)

The Orchestrator emits a request with:

- `addNodes`: `Tool(scaffold-routes)`, `Builder(auth-logic)`, `Verifier(security-check)`, `Merge(apply-auth)`.
- `addEdges`: `Orchestrator -> Tool`, `Tool -> Builder`, `Builder -> Verifier`, `Verifier -> Merge`, `Merge -> Output`.
- `expand`: replace the `Orchestrator`'s placeholder successor with this subgraph; rewire the Orchestrator's outgoing edge to `Tool` and the subgraph's `Merge` outgoing edge to `Output`.
- `budgets`: within `maxNodesAdded=6`, `maxEdgesAdded=6`, `allowedKinds` includes all four kinds.

# Validation and Application

The engine runs the full Part 02/04/05 pipeline:

- kind check: all four kinds registered;
- config schema: each node's config valid;
- edge compatibility: `Tool.output -> Builder.input` types match;
- cycle prevention: no cycle formed;
- authorization: Orchestrator with `allowDynamicMutation` and the kinds in its allow-list (Part 03);
- budget: 4 nodes, 5 edges, within ceilings;
- no succeeded node invalidated: the Orchestrator had not succeeded yet (it emitted the mutation mid-execution under the dynamic rule), so the rule holds.

The mutation applies atomically. The Orchestrator transitions to `succeeded` (its plan is now concrete), and the new subgraph's entry node `Tool` becomes `ready`.

# The Run Trace

- Tick: Orchestrator runs, emits mutation, succeeds.
- Tick: `Tool(scaffold-routes)` runs (read-only scaffold), emits a spec. `Builder(auth-logic)` becomes ready, runs read-only, emits `artifactRef=hashD`.
- Tick: `Verifier(security-check)` consumes `hashD`, passes. `Merge(apply-auth)` becomes ready, applies under permission.
- Tick: `Output` publishes the applied auth feature.
- The run is `succeeded`. The graph that actually executed was larger than the one that started; the expansion is recorded in the mutation log and replayable ([[WorkflowEngine-Part07]]).

# Why This Example Matters

It shows that a Workflow is not frozen at authoring time. An Orchestrator can adapt, but every adaptation is untrusted, validated, budgeted, and recorded. The user can inspect the mutation log and see exactly what the AI added. And because the Builder never wrote the project, the applied change is the one verified change, not a side effect of planning.

# AI Notes

Do not let a Worker propose the expansion. Only the Orchestrator with `allowDynamicMutation` may, and only within its kind allow-list. A Worker that edits the graph bypasses authorization ([[DynamicGraphs-Part03]]).

Do not skip the budget check on dynamic expansion. An Orchestrator that adds unbounded nodes is a resource and determinism risk. Cap it ([[DynamicGraphs-Part05]]).

Do not let the Orchestrator write the project while planning. It inspects read-only; the concrete `Builder` and `Merge` do the write, under verification. Planning is not applying.

# Related Documents

- [[06-workflow-engine/README]]
- [[WorkflowExamples-Part01]]
- [[WorkflowExamples-Part03]]
- [[WorkflowExamples-Diagrams]]
- [[DynamicGraphs-Part01]]
- [[DynamicGraphs-Part04]]
- [[DynamicGraphs-Part05]]
- [[NodeTypes-Part02]]
- [[WorkflowEngine-Part07]]
