---
title: ConditionNodes Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - condition-nodes
  - validation
  - checklist
related:
  - "[[06-workflow-engine/README]]"
  - "[[ConditionNodes-Part01]]"
  - "[[ConditionNodes-Part03]]"
  - "[[WorkflowEngine-Part02]]"
---

# ConditionNodes Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Expression Language, and Branch Model
Part 02 - Evaluation Rules, Determinism, and the Selection Algorithm
Part 03 - Skipped Branches, Multi-Way Branching, and Edge Interaction
Part 04 - Failure Modes, Validation, and the Implementation Checklist
Diagrams - ConditionNodes-Diagrams.md

# Purpose

Part 04 records the Condition node's failure modes, the validation it undergoes before a run, and a checklist for authors and implementers.

# Failure Modes

A Condition node may produce these named failures from the shared taxonomy ([[NodeTypes-Part05]]):

- `expression_invalid` — fatal. The expression could not be parsed at validation time. The run never starts.
- `expression_error` — retryable. Evaluation threw (e.g. a divide-by-zero, a missing port referenced at runtime). Retried up to `maxAttempts` (default 1 for deterministic kinds). If it persists, the node becomes `failed`.
- `port_unsatisfied` — fatal. A port the expression references has no edge and no default.
- `branch_orphan` — fatal. A declared branch has no outgoing edge and no `default` handling. Rejected at validation.

# Validation at Graph Load

Before the run enters `running`, every Condition node is checked:

- its `expression` parses against the expression grammar;
- every port name referenced in the expression exists as a declared input port;
- every declared branch has at least one outgoing edge, or the graph is rejected;
- if the expression is boolean, `true` and `false` branches both exist; if named, the set of branch names is non-empty and a `default` is encouraged;
- the branch edges carry the selection flag (set automatically by the validator).

Any failure here is `graph_invalid` or the specific kind above, all fail-closed. The run does not start with a malformed Condition.

# Author Checklist

- Does the expression reference only declared input ports?
- For a boolean expression, are both `true` and `false` branches present and wired?
- For a named expression, is there a `default` branch for unmatched cases?
- Does every branch lead somewhere (no orphan branches)?
- Are the branch edges' targets the nodes you actually intend to run?

# Implementer Checklist

- Parse and validate the expression at graph load, not at eval time.
- Evaluate against resolved ports only; persist the selected branch.
- On replay, read the persisted branch; never re-evaluate.
- Mark unselected branch targets `skipped` in the same transaction that marks the Condition `succeeded`.
- Emit `workflow.node.state_changed` for the Condition and for each skipped target after commit.

# Invariants

```text
A malformed expression fails validation before run.
An expression references only declared ports.
Every branch has an outgoing edge or the graph is rejected.
The selected branch is persisted before downstream skip propagation.
Replay uses the persisted branch, never re-evaluation.
```

# AI Notes

Do not defer expression parsing to evaluation time. Parsing at eval time means a syntax error surfaces mid-run as a runtime crash instead of a clean validation failure, and it breaks the "validate fully before run" principle in [[WorkflowEngine-Part01]].

Do not let a Condition fail the run merely because it chose `false`. Choosing is success. Only malformed logic or a missing port is an error.

Do not skip the "every branch is wired" check. An orphan branch is a silent dead end that confuses both the author and the ready-set computation.

# Related Documents

- [[06-workflow-engine/README]]
- [[ConditionNodes-Part01]]
- [[ConditionNodes-Part02]]
- [[ConditionNodes-Part03]]
- [[ConditionNodes-Diagrams]]
- [[NodeTypes-Part05]]
- [[WorkflowEngine-Part02]]
- [[NodeArchitecture-Part05]]
