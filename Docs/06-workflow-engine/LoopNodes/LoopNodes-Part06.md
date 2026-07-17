---
title: LoopNodes Specification - Part 06
status: draft
version: 1.0
tags:
  - workflow-engine
  - loop-nodes
  - algorithm
  - checklist
related:
  - "[[06-workflow-engine/README]]"
  - [[LoopNodes-Part01]]
  - [[LoopNodes-Part05]]
  - [[WorkflowEngine-Part08]]
---

# LoopNodes Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, Definition, Config Type, and Invariants
Part 02 - The Four Loop Kinds and Their Individual Semantics
Part 03 - The Loop Body Subgraph, Iteration State, and Iteration Context
Part 04 - Parallel For-Each, Concurrency Limits, and Accumulator Semantics
Part 05 - Termination Guards, Break and Continue, and Iteration Failure
Part 06 - The Loop Execution Algorithm, Checklist, and Worked Examples
Diagrams - LoopNodes-Diagrams.md

# Purpose

Part 06 writes the loop execution algorithm as a procedure, gives an implementer checklist, and traces two worked loops (a for-each and a refine loop).

# The Loop Execution Algorithm

The Loop node runs as a supervisor inside the normal engine tick; it does not recurse. For each iteration it delegates the body to the engine's standard dispatch.

1. Validate the loop config has a hard `maxIterations` (Part 05). Seed the accumulator (Part 04).
2. Compute the iteration plan: for for-each, the list of remaining items; for while/refine/bounded, the next index.
3. If the plan is empty or `maxIterations` reached, finalize: emit `accumulator` (and `lastItem` if configured), mark the loop `succeeded` (or `failed` on ceiling with `failFast` error), and update outgoing edges.
4. Otherwise, instantiate the body subgraph for the current iteration index, binding iteration-scoped inputs (Part 03). Add the body's entry nodes to the ready set.
5. Let the engine tick run the body nodes normally (dispatch, execute, persist). The Loop node itself stays `running` while any body node is `running`.
6. When the body reaches a terminal state for this iteration (all body nodes succeeded/skipped, or a break/continue signal, or a failure per policy), fold the body's output into the accumulator (by iteration index), persist the iteration record, and emit `iteration_completed` on the EventBus.
7. Apply break/continue: break finalizes; continue proceeds to step 2 with the next plan. On failure with `failFast`, go to step 3 as `failed`.
8. Return to step 2. The loop never holds the tick; it yields to the engine between iterations so pause, cancel, and recovery work.

# Implementer Checklist

- Require `maxIterations`; reject loops without it at validation.
- Bind iteration-scoped context per index; never share context across indices.
- Use the standard ready set and Scheduler for body nodes; do not fork dispatch.
- Fold the accumulator by iteration index, persisted per iteration.
- Emit `iteration_completed` after each fold; emit loop terminal state after commit.
- Yield between iterations so pause/cancel/recovery can intervene.
- On replay, use recorded iteration results; never re-run body Workers.

# Worked Example 1 — For-Each

`Input(files: [a,b,c]) -> Loop(for-each, parallel) -> Body(Builder per file) -> Merge -> Output`. Iterations `i-0,i-1,i-2` run; with `parallel:true` the Scheduler may run two at once. Accumulator folds each `artifactRef` by index into `[refA, refB, refC]`. After three completions, loop emits the list and `succeeded`.

# Worked Example 2 — Refine Loop

`Loop(refine, maxIterations 5) -> Body(Builder -> Verifier)`. Iteration 0: Builder emits draft, Verifier says fail. Iteration 1: Builder refines, Verifier says fail. Iteration 2: Verifier passes -> break. Loop emits final `artifactRef` and `succeeded`. If all five iterations failed, ceiling hit, loop `failed` with `iteration_limit_exceeded`. The project was never written (Builder rule, [[BuilderNodes-Part04]]).

# Invariants

```text
The loop yields to the engine between iterations.
maxIterations is enforced as a hard ceiling.
The accumulator folds by iteration index and is persisted per iteration.
break/continue use validated control edges.
The loop node stays running while any body node runs.
Replay uses recorded iteration results.
```

# AI Notes

Do not implement the loop as a recursive function calling the body. Recursion cannot pause, cannot recover, and cannot be replayed. The loop is a supervisor that adds body nodes to the ready set and yields.

Do not share iteration context across indices. Each iteration is an independent subgraph instance; shared context is shared state and breaks determinism.

Do not run body Workers during replay. Replay substitutes recorded results per iteration index. Re-running them double-applies work and breaks the cost and safety model.

# Related Documents

- [[06-workflow-engine/README]]
- [[LoopNodes-Part01]]
- [[LoopNodes-Part05]]
- [[LoopNodes-Diagrams]]
- [[WorkflowEngine-Part08]]
- [[WorkflowEngine-Part06]]
- [[BuilderNodes-Part04]]
- [[VerifierNodes-Part01]]
- [[EdgeTypes-Part03]]
