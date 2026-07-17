---
title: ConditionNodes Specification - Part 02
status: draft
version: 1.0
tags:
  - workflow-engine
  - condition-nodes
  - determinism
related:
  - "[[06-workflow-engine/README]]"
  - "[[ConditionNodes-Part01]]"
  - "[[WorkflowEngine-Part07]]"
---

# ConditionNodes Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Expression Language, and Branch Model
Part 02 - Evaluation Rules, Determinism, and the Selection Algorithm
Part 03 - Skipped Branches, Multi-Way Branching, and Edge Interaction
Part 04 - Failure Modes, Validation, and the Implementation Checklist
Diagrams - ConditionNodes-Diagrams.md

# Purpose

Part 02 defines how a Condition expression is evaluated and, critically, why the selection is deterministic and replayable.

A Condition is the single most common source of "why did my replay pick a different branch?" bugs in naive graph runners. The bug comes from evaluating the expression against live, mutable state instead of against the frozen input ports. Eulinx forbids that. A Condition is evaluated once, against the resolved input port values present in the RunContext at the moment the node became ready, and its result is persisted as part of the node's record. Replay reads the persisted selection; it never re-evaluates.

# Evaluation Rules

When a Condition node becomes `ready`, the engine:

1. Resolves each input port from the RunContext (per [[NodeArchitecture-Part02]]).
2. Binds the port values into the expression's variable scope by port name.
3. Parses the (already validated) expression into an AST.
4. Evaluates the AST against the bound scope. The evaluation is pure: no I/O, no clock, no randomness.
5. Maps the result to a selected branch name.
6. Persists the selected branch and the evaluated inputs alongside the node's `succeeded` state.

Step 4 is the heart of determinism. The AST evaluator is a pure function `evaluate(ast, scope) -> branchName`. Given the same AST and the same scope, it returns the same branch. There is no hidden input.

# Determinism and the Seed

If a Condition's logic needs a tie-break or a random pick (rare, and discouraged), it derives any pseudo-random value from `hash(determinismSeed + nodeId + iterationIndex)`, never from a raw random source. This matches the engine-wide rule in [[WorkflowEngine-Part01]]. The same rule makes a Loop's per-iteration choices reproducible.

# The Selection Algorithm

The persisted selection drives everything downstream:

```text
on Condition succeeded with selectedBranch = B:
  for each output port P on the node:
    if P == B: mark edge(s) from P satisfied
    else:      mark edge(s) from P unsatisfied -> target nodes become skipped
```

Because the selection is persisted, a replay simply reads `selectedBranch` and applies the same edge satisfaction. No re-evaluation, no divergence.

# Invariants

```text
Evaluation reads only resolved input ports, never live state.
Evaluation is a pure function of (ast, scope).
The selected branch is persisted with the node record.
Replay reads the persisted selection; it never re-evaluates.
No clock, no randomness, no I/O inside evaluation.
Tie-breaks derive from determinismSeed, never a raw source.
```

# AI Notes

Do not re-evaluate a Condition during replay. The persisted branch is the truth. Re-evaluation can diverge if any input differed subtly, and divergence in a branch selection silently changes the whole downstream graph.

Do not evaluate against a global variable or a memory read. The moment a Condition depends on something outside its input ports, two runs with identical graphs and identical declared inputs can take different branches, and determinism is gone.

Do not cache the branch selection in memory only. It must be on disk with the node state, or a restart loses it and the run forks.

# Related Documents

- [[06-workflow-engine/README]]
- [[ConditionNodes-Part01]]
- [[ConditionNodes-Part03]]
- [[ConditionNodes-Diagrams]]
- [[WorkflowEngine-Part01]]
- [[WorkflowEngine-Part07]]
- [[NodeArchitecture-Part02]]
