---
title: NodeTypes Specification - Part 03
status: draft
version: 1.0
tags:
  - workflow-engine
  - node-types
  - control-flow
related:
  - "[[06-workflow-engine/README]]"
  - "[[NodeTypes-Part01]]"
  - "[[VerifierNodes-Part01]]"
  - "[[ConditionNodes-Part01]]"
  - "[[LoopNodes-Part01]]"
---

# NodeTypes Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Catalog Contract, and the Built-In Kind List
Part 02 - Worker, Orchestrator, Tool, and Builder Nodes
Part 03 - Verifier, Condition, Loop, and Merge Nodes
Part 04 - Artifact, Memory, MCP, and Input/Output Nodes
Part 05 - Delay and Human-Approval Nodes, and Named Failure Modes
Part 06 - Port Conventions, Config Defaults, and the Kind Selection Checklist
Diagrams - NodeTypes-Diagrams.md

# Purpose

Part 03 specifies four control-flow and quality kinds: `Verifier`, `Condition`, `Loop`, and `Merge`.

These kinds mostly do not "do work" in the sense of editing files. They decide, check, repeat, and join. They are the skeleton that turns a flat list of Workers into a real pipeline with branches, refinement, and gates.

# Verifier Node

The `Verifier` node turns an Artifact into a Verdict. Full detail in [[VerifierNodes-Part01]].

- Inputs: `artifactRef` (artifact-ref, required), `criteria` (json, optional).
- Outputs: `verdict` (json: passed boolean, score, reasons), `evidence` (artifact-ref, optional).
- Config: `verifierKind` (deterministic or AI), `threshold`, `timeoutMs`.
- Failures: `artifact_missing` (fatal), `verdict_inconclusive` (retryable or fatal per policy).

The authorship rule: a Verifier MUST NOT verify an Artifact it produced. See [[VerifierNodes-Part01]].

# Condition Node

The `Condition` node branches the graph on an expression. Full detail in [[ConditionNodes-Part01]].

- Inputs: `input` (any, required); multiple named inputs allowed for multi-way branches.
- Outputs: one output port per branch (e.g. `true`, `false`, or named branches).
- Config: `expression` (the branch expression), `branches` (list of branch port names).
- Behavior: evaluates the expression deterministically, marks exactly one branch `succeeded` and the others `skipped`.
- Failures: `expression_invalid` (fatal), `expression_error` (retryable).

A Condition never fails the run by choosing a branch. Choosing is success; only a malformed expression fails.

# Loop Node

The `Loop` node iterates a body subgraph. Full detail in [[LoopNodes-Part01]].

- Inputs: `collection` (many, for for-each) or `conditionInput` (any, for while); `maxIterations` (number, config).
- Outputs: `accumulator` (json), `lastItem` (any, optional).
- Config: `loopKind` (for-each | while | refine | bounded), `bodyGraph`, `maxIterations`, `termination`.
- Behavior: runs the body subgraph once per iteration, maintaining iteration-scoped context, until termination or the iteration limit.
- Failures: `iteration_limit_exceeded` (fatal), `body_failed` (propagated from body), `termination_invalid` (fatal).

Loops MUST terminate. The iteration limit is a hard ceiling; exceeding it fails the node rather than looping forever.

# Merge Node

The `Merge` node joins branches with explicit join semantics.

- Inputs: one or more named input ports, each from a different upstream branch.
- Outputs: `merged` (json or any), optionally `selectedBranch` (text).
- Config: `joinSet` (which inputs must arrive), `strategy` (wait-all | wait-any | wait-first), `conflictPolicy`.
- Behavior: waits per `strategy`; when the join condition is met, combines available inputs and emits `merged`. Skipped inputs are treated as absent, not as errors, when the join set permits.
- Failures: `join_unsatisfiable` (fatal when a required join input is failed, not merely skipped), `merge_conflict` (fatal or retryable per `conflictPolicy`).

Merge is the declared exception to "all upstream must succeed" (see [[NodeArchitecture-Part05]]). It is how a success branch and a skipped failure branch are reconciled.

# AI Notes

Do not let a Verifier verify its own Artifact. Self-verification is meaningless and is forbidden by [[VerifierNodes-Part01]]; it also defeats the independent-check safety model.

Do not build an unbounded loop. Every Loop node has a hard `maxIterations`. A loop without a ceiling is a hang waiting to happen and violates the termination guarantee in [[LoopNodes-Part01]].

Do not use a Condition to "fail" a branch. Marking a branch `skipped` is correct; failing it invents an error and corrupts the run report.

# Related Documents

- [[06-workflow-engine/README]]
- [[NodeTypes-Part01]]
- [[NodeTypes-Part02]]
- [[NodeTypes-Diagrams]]
- [[VerifierNodes-Part01]]
- [[ConditionNodes-Part01]]
- [[LoopNodes-Part01]]
- [[NodeArchitecture-Part05]]
