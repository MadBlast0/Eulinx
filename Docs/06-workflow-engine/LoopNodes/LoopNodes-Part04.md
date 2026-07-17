---
title: LoopNodes Specification - Part 04
status: draft
version: 1.0
tags:
  - workflow-engine
  - loop-nodes
  - parallel
  - accumulator
related:
  - "[[06-workflow-engine/README]]"
  - [[LoopNodes-Part01]]
  - [[LoopNodes-Part03]]
  - [[ExecutionFlow-Part04]]
---

# LoopNodes Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, Definition, Config Type, and Invariants
Part 02 - The Four Loop Kinds and Their Individual Semantics
Part 03 - The Loop Body Subgraph, Iteration State, and Iteration Context
Part 04 - Parallel For-Each, Concurrency Limits, and Accumulator Semantics
Part 05 - Termination Guards, Break and Continue, and Iteration Failure
Part 06 - The Loop Execution Algorithm, Checklist, and Worked Examples
Diagrams - LoopNodes-Diagrams.md

# Purpose

Part 04 defines the for-each loop's parallel mode, how the [[Scheduler-Part01]] limits its concurrency, and how the loop accumulator collects per-iteration results.

A for-each loop naturally invites parallelism: each item in the collection is independent, so its body run can execute concurrently. But unbounded parallelism would exhaust the Scheduler and the machine. Eulinx makes for-each parallelism explicit and bounded, and it keeps the accumulator deterministic.

# Parallel For-Each

A for-each loop with `parallel: true` dispatches body runs for multiple collection items at once, up to a `maxParallelism` config (default derived from the Scheduler's budget). Each item gets its own iteration index (e.g. `i-0`, `i-1`, ...) and its own iteration-scoped context (Part 03). The items are independent; there is no ordering constraint between them.

Parallelism here is just the normal ready-set mechanism ([[WorkflowEngine-Part03]]): each item's body becomes a set of nodes that are mutually independent, so the ready set contains them together and the Scheduler admits as many as it can. The Loop node does not spin up threads; it lets the engine's existing parallel dispatch handle it.

# Concurrency Limits

The Loop node respects the Scheduler the same way any node does. If `maxParallelism` exceeds the Scheduler's available slots, the Scheduler admits fewer; the loop simply proceeds with what it can and proposes the rest on later ticks. The loop MUST NOT hold its own concurrency counter; that is the Scheduler's job ([[ExecutionFlow-Part07]]). This keeps loop parallelism consistent with the rest of the engine.

# Accumulator Semantics

The loop maintains an `accumulator`: a json value that collects per-iteration outputs. Its semantics:

- The accumulator is seeded from the loop's `initial` config (or empty).
- After each iteration completes, the body's designated output port value is folded into the accumulator by the `fold` function named in config (e.g. `append`, `merge`, `sum`). The fold is a pure function.
- In parallel mode, fold applications are ordered by iteration index, not by completion order, so the accumulator is deterministic regardless of which item finished first.
- The accumulator is persisted per iteration so recovery ([[WorkflowEngine-Part06]]) can resume a half-folded loop.

# Determinism

Because fold order is by iteration index and each iteration's context is seeded from `determinismSeed + nodeId + iterationIndex` ([[WorkflowEngine-Part01]]), a parallel for-each produces the same accumulator on every run and on replay, even though items run in different real-time orders. This is the key property that makes loop parallelism safe.

# Invariants

```text
Parallel for-each dispatches items via the normal ready set, not threads.
maxParallelism is a hint; the Scheduler decides actual concurrency.
The loop holds no concurrency counter of its own.
The accumulator folds by iteration index, never by completion order.
The accumulator is persisted per iteration for recovery.
Parallel and serial for-each produce identical accumulators.
```

# AI Notes

Do not let a parallel for-each fold by completion order. If item 3 finishes before item 1, folding in completion order gives a different accumulator than a serial run, breaking replay. Fold by iteration index.

Do not give the loop its own thread pool. The engine already dispatches independent nodes in parallel through the Scheduler. A second pool doubles concurrency accounting and defeats the Scheduler's budget.

Do not make `maxParallelism` a hard cap the loop enforces. It is a hint; the Scheduler's global budget is the real limit. A hard loop cap fights the Scheduler and causes starvation elsewhere.

# Related Documents

- [[06-workflow-engine/README]]
- [[LoopNodes-Part01]]
- [[LoopNodes-Part03]]
- [[LoopNodes-Part05]]
- [[LoopNodes-Diagrams]]
- [[ExecutionFlow-Part04]]
- [[ExecutionFlow-Part07]]
- [[Scheduler-Part01]]
- [[WorkflowEngine-Part03]]
- [[WorkflowEngine-Part06]]
