---
title: ConditionNodes Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - condition-nodes
  - skip
  - edges
related:
  - "[[06-workflow-engine/README]]"
  - "[[ConditionNodes-Part01]]"
  - "[[ConditionNodes-Part02]]"
  - "[[NodeArchitecture-Part05]]"
---

# ConditionNodes Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Expression Language, and Branch Model
Part 02 - Evaluation Rules, Determinism, and the Selection Algorithm
Part 03 - Skipped Branches, Multi-Way Branching, and Edge Interaction
Part 04 - Failure Modes, Validation, and the Implementation Checklist
Diagrams - ConditionNodes-Diagrams.md

# Purpose

Part 03 defines what happens to the unselected branches and how Condition nodes interact with edges and with other control structures.

The central rule stated in the README is that unselected branches are marked `skipped` rather than left `pending` forever. This part explains why that matters and how it composes with loops, merges, and parallel branches.

# Skipped Branches

When a Condition selects branch `B`, every other branch's outgoing edges are marked unsatisfied. The target nodes of those edges are then, by the propagation rule in [[NodeArchitecture-Part05]], marked `skipped`. A skipped node is terminal: it will never run, and it will never block the run from terminating. This is what prevents the classic deadlock where a graph "never finishes" because half of it is waiting on a branch that was never taken.

A skipped branch is recorded, not forgotten. The UI shows it greyed; the run record lists it. The author can see exactly which path was not taken, which is essential for debugging and for audit.

# Multi-Way Branching

A multi-way Condition declares N named branches. Selection picks exactly one by name. The others are skipped. There is no "fallthrough". If the expression matches none of the named branches and no `default` branch is declared, the node fails with `expression_error` (retryable) — but this is a logic error in the graph, so authors SHOULD always declare a `default` branch. A `default` branch is just another named branch selected when no explicit match occurs.

# Interaction With Edges

The Condition's branch ports are ordinary output ports. The edges leaving them are ordinary edges, but with a branch-semantics flag set at validation: a `condition-branch` edge is satisfied only when its source branch was selected. This flag is what lets the ready-set computation ([[WorkflowEngine-Part03]]) treat an unselected branch's targets as skippable rather than merely "not yet ready". Without the flag, the engine could not distinguish "waiting" from "will never run".

# Interaction With Loop and Merge

A Condition inside a Loop body is evaluated once per iteration with that iteration's scoped inputs. Its selection may differ per iteration; each iteration's selection is persisted independently. A Condition feeding a Merge node simply provides one of the Merge's inputs; if its branch was skipped, that input is absent and the Merge's join policy decides whether the merge can proceed (see [[NodeTypes-Part03]]).

# Invariants

```text
Unselected branches are skipped, never left pending.
A skipped node is terminal and recorded.
Multi-way selection picks exactly one named branch.
A missing match without a default fails the node.
Branch edges carry a satisfied-only-if-selected flag.
A Condition in a Loop is evaluated per iteration, selection persisted per iteration.
```

# AI Notes

Do not leave an unselected branch's targets in `pending`. They will never become ready, the ready set will never empty, and the run will hang at `running` forever. Skipping is mandatory.

Do not build a multi-way Condition without a `default`. A graph that can reach a Condition and match nothing has an undefined path; fail-closed by requiring a default, or fail the node.

Do not let a Condition's branch flag leak into non-branch edges. Only edges explicitly emitted from a Condition's branch ports carry the selection flag. Ordinary data edges from a Condition (if any) are always evaluated normally.

# Related Documents

- [[06-workflow-engine/README]]
- [[ConditionNodes-Part01]]
- [[ConditionNodes-Part02]]
- [[ConditionNodes-Part04]]
- [[ConditionNodes-Diagrams]]
- [[NodeArchitecture-Part05]]
- [[WorkflowEngine-Part03]]
- [[EdgeTypes-Part01]]
- [[LoopNodes-Part01]]
- [[NodeTypes-Part03]]
