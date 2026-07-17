---
title: LoopNodes Specification - Part 05
status: draft
version: 1.0
tags:
  - workflow-engine
  - loop-nodes
  - termination
  - failure
related:
  - "[[06-workflow-engine/README]]"
  - [[LoopNodes-Part01]]
  - [[LoopNodes-Part04]]
  - [[NodeArchitecture-Part05]]
---

# LoopNodes Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, Definition, Config Type, and Invariants
Part 02 - The Four Loop Kinds and Their Individual Semantics
Part 03 - The Loop Body Subgraph, Iteration State, and Iteration Context
Part 04 - Parallel For-Each, Concurrency Limits, and Accumulator Semantics
Part 05 - Termination Guards, Break and Continue, and Iteration Failure
Part 06 - The Loop Execution Algorithm, Checklist, and Worked Examples
Diagrams - LoopNodes-Diagrams.md

# Purpose

Part 05 defines what guarantees a loop ends: termination guards, the break and continue controls, and how a failure inside the body propagates.

The README demands "mandatory termination guarantees" for loops. An infinite loop in a desktop automation app is a hang that wastes the user's machine and may never be noticed. Eulinx makes termination structural, not hopeful.

# Termination Guards

Every loop has at least one hard termination condition, evaluated before each iteration:

- for-each: the collection is finite, so the guard is "items remain". Exhaustion terminates.
- while: a `maxIterations` ceiling plus the `condition` expression. The ceiling is the hard stop; the condition is the soft stop.
- refine: `maxIterations` plus the `done` predicate (usually a Verifier verdict). The ceiling is the hard stop.
- bounded: `maxIterations` alone; it always terminates by count.

If `maxIterations` is reached before the soft condition, the loop terminates with `iteration_limit_exceeded` (fatal) rather than continuing. There is no loop kind without a hard ceiling. This is non-negotiable.

# Break and Continue

A loop body may contain a Control node (or a Condition whose branch signals control) that emits `break` or `continue`:

- `break` terminates the loop immediately; the accumulator is finalized and the loop node emits its outputs.
- `continue` skips the remainder of the current iteration and proceeds to the next (or terminates if none remain).

`break` and `continue` are control signals carried on dedicated loop-control edges ([[EdgeTypes-Part03]]), not exceptions. They are validated at graph-load: a `break` edge must target the loop's exit, a `continue` edge must target the loop's next-iteration entry. Malformed control edges are rejected as `graph_invalid`.

# Iteration Failure

When a body node fails (retries exhausted), the loop's reaction depends on config:

- `failFast` (default true): the loop fails immediately; its downstream nodes are skipped ([[NodeArchitecture-Part05]]). The run may fail if unabsorbed.
- `continueOnError`: the failed iteration is recorded, the item is marked errored in the accumulator, and the loop proceeds to the next item. The loop node still `succeeds` if at least the hard termination is reached, but it records which iterations errored. The run's terminal state reflects the errors per the ExecutionFlow rules (Part 06).

A while or refine loop whose body fails on an iteration with `failFast` terminates the loop as `failed`, same as a normal node failure.

# Iteration Index and Replay

Each iteration's index is persisted. Replay re-runs the loop with the same indices and the same recorded body results, reaching the same termination. A loop that terminated by `iteration_limit_exceeded` replays identically: the ceiling is part of the frozen config.

# Invariants

```text
Every loop has a hard maxIterations ceiling.
Exceeding the ceiling fails the loop with iteration_limit_exceeded.
break and continue use validated loop-control edges.
failFast terminates the loop on first body failure.
continueOnError records the error and proceeds.
Iteration indices are persisted for replay.
A loop always terminates; it never hangs.
```

# AI Notes

Do not build a while loop without `maxIterations`. A condition that never becomes false is a hang. The ceiling is the safety net; require it.

Do not implement break/continue as exceptions thrown across the body. They are edges and signals, validated like any other connection. Exceptions bypass the graph and break replay.

Do not set `continueOnError` as a silent default. It hides body failures from the run report. `failFast` is the default because a loop that swallows errors is hard to debug and easy to trust wrongly.

# Related Documents

- [[06-workflow-engine/README]]
- [[LoopNodes-Part01]]
- [[LoopNodes-Part04]]
- [[LoopNodes-Part06]]
- [[LoopNodes-Diagrams]]
- [[EdgeTypes-Part03]]
- [[NodeArchitecture-Part05]]
- [[ExecutionFlow-Part06]]
- [[WorkflowEngine-Part07]]
