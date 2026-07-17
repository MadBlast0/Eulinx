---
title: ConditionNodes Specification - Part 01
status: draft
version: 1.0
tags:
  - workflow-engine
  - condition-nodes
  - branching
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part03]]"
  - "[[EdgeTypes-Part01]]"
  - "[[ConditionNodes-Diagrams]]"
---

# ConditionNodes Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Expression Language, and Branch Model
Part 02 - Evaluation Rules, Determinism, and the Selection Algorithm
Part 03 - Skipped Branches, Multi-Way Branching, and Edge Interaction
Part 04 - Failure Modes, Validation, and the Implementation Checklist
Diagrams - ConditionNodes-Diagrams.md

# Purpose

ConditionNodes defines branching in a Eulinx Workflow.

A Workflow is not a straight line. A Build may succeed or fail; a check may pass or not; a value may fall in one of several ranges. The Condition node is the mechanism that turns a single runtime value into exactly one active downstream path while marking every other candidate path `skipped`. It is the graph's if/else/switch, but expressed as typed ports and edges rather than control flow inside a function.

The Condition node owns three concerns: the expression language it evaluates, the deterministic rules by which it picks a branch, and the rule that unselected branches become `skipped` rather than hanging in `pending` forever. The [[NodeTypes-Part03]] catalog entry records its ports; this topic defines the semantics behind them.

# The Expression Language

A Condition's `expression` is a small, side-effect-free expression over the node's resolved input ports. It is deliberately not a general programming language. It supports:

- Comparison operators: `==`, `!=`, `<`, `<=`, `>`, `>=`.
- Logical operators: `and`, `or`, `not`.
- Membership: `in` (value in a list), `contains`.
- Arithmetic on numbers, used only inside comparisons.
- References to input port values by name (e.g. `score`, `status`).
- Constants: numbers, strings, booleans, and lists.

The expression is parsed and validated at graph-validation time. An unparseable expression is a fatal `expression_invalid` error before the run starts. This is fail-closed: a Condition whose logic cannot be proven sound never runs.

# The Branch Model

A Condition node declares one output port per branch. For a two-way branch these are `true` and `false`. For a multi-way branch they are explicit names (`low`, `mid`, `high`). Exactly one branch is selected per evaluation. The selection is:

```text
evaluate expression -> a boolean, or a matched branch name
if boolean true  -> select "true" branch, skip "false"
if boolean false -> select "false" branch, skip "true"
if matched name  -> select that named branch, skip all others
```

A Condition never selects zero branches and never selects more than one. If the expression is a boolean, `false` is a valid, complete selection (the false branch is taken), not an error.

# Invariants

```text
A Condition has exactly one output port per declared branch.
Exactly one branch is selected per evaluation.
Unselected branches are marked skipped, not pending.
The expression is side-effect-free and validated before run.
The expression reads only declared input ports.
Branch selection is a pure function of input values and config.
```

# AI Notes

Do not implement branching with a node that "fails" the unselected path. A false branch is a decision, not an error. Failing it corrupts the run report and triggers spurious retry logic.

Do not let the expression call a model or read memory. A Condition must be reproducible from inputs alone; anything non-deterministic breaks replay and the README's determinism principle.

Do not allow a Condition with zero branches or with a branch that has no outgoing edge to be valid. A branch with nowhere to go is a dead design; validation must reject it.

# Related Documents

- [[06-workflow-engine/README]]
- [[ConditionNodes-Part02]]
- [[ConditionNodes-Part03]]
- [[ConditionNodes-Diagrams]]
- [[NodeTypes-Part03]]
- [[EdgeTypes-Part01]]
- [[NodeArchitecture-Part05]]
- [[WorkflowEngine-Part01]]
