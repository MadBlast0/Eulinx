---
title: WorkflowEngine Specification - Part 07
status: draft
version: 1.0
tags:
  - workflow-engine
  - workflow-engine-core
  - determinism
  - replay
related:
  - "[[06-workflow-engine/README]]"
  - "[[WorkflowEngine-Part01]]"
  - "[[WorkflowEngine-Part06]]"
  - "[[WorkflowEngine-Part08]]"
  - "[[Replay-Part01]]"
---

# WorkflowEngine Specification (Part 07)

## Document Index

Part 01 - Purpose, Philosophy, Boundaries, and the Run Object Model
Part 02 - Graph Representation In Memory and In SQLite
Part 03 - Readiness, the Ready Set, and Topological Execution
Part 04 - Parallel Branch Execution and the Scheduler Handshake
Part 05 - RunContext and Data Passing Between Nodes
Part 06 - Pause, Resume, Cancel, and Restart Recovery
Part 07 - Determinism and Replay
Part 08 - The Engine Tick Algorithm, Checklist, and Examples
Diagrams - WorkflowEngine-Diagrams.md

# Purpose

Part 07 defines what it means for the WorkflowEngine to be deterministic, and how replay re-runs a completed or interrupted run without re-executing work.

The README makes determinism a global principle: given the same graph, the same inputs, and the same recorded node results, a replay MUST visit the same nodes in the same order. This part explains how the engine achieves that, and why it is not optional. Determinism is what makes the engine testable, debuggable, and safe to re-run after a crash. A non-deterministic engine cannot be audited, cannot be reproduced for a bug report, and cannot guarantee that a "retry" does the same thing as the original.

# What Determinism Covers

The engine is deterministic over:

- node visit order (the sequence in which nodes reach `running`);
- branch selection (which Condition branches are taken);
- ready-set membership at each tick (a pure function of node states and edges);
- tie-breaks and any pseudo-random choices (all derived from `determinismSeed`);
- loop iteration counts and per-iteration selections.

It is NOT deterministic over:

- wall-clock time, real Worker latency, or provider behavior (those live in the ExecutionEngine, which replay replaces);
- the content a Worker or external tool produces (replay substitutes recorded results, so the engine never re-invokes them).

The boundary is precise: everything the engine decides is deterministic; everything an external adapter decides is recorded and replayed, not re-decided.

# The Determinism Seed

At run creation, the engine generates one `determinismSeed`: a fixed random string stored on the `WorkflowRun`. Any engine-side choice that needs a number derives it as `hash(determinismSeed + nodeId + iterationIndex)`. Nothing in the engine calls a raw random source. Because the seed is frozen in the run record, a replay uses the same seed and reproduces the same choices. The ExecutionEngine side never sees the seed; its results are recorded wholesale.

# Replay Mode

A run in `replay` mode ([[WorkflowEngine-Part01]] `RunMode`) does not call the ExecutionEngine. Instead, the dispatch step looks up the recorded `NodeResult` for `(nodeId, iterationIndex)` from the run's result log and applies it as if it had just returned. The tick loop is otherwise identical. This is why the engine boundary in Part 01 is a value contract: replace the ExecutionEngine with a recorded-result table and the loop cannot tell.

Replay requires that every node's result was persisted. The [[WorkflowEngine-Part06]] checkpointing policy guarantees the result log is durable. If a result is missing (e.g. a run killed mid-execution before persisting), recovery (Part 06) reconciles it first; only then can replay proceed.

# Determinism and Dynamic Graphs

When a graph was mutated at runtime by an Orchestrator ([[DynamicGraphs-Part01]]), the mutation is itself recorded as part of the run. Replay applies the same mutations in the same order, because the mutation requests are persisted alongside node results. A replay never re-derives a mutation from the model; it replays the recorded one. This preserves the untrusted-input rule: the model's suggestion is captured once, validated once, and replayed verbatim.

# Invariants

```text
Node visit order is a pure function of (graph, node states, run context).
Branch selection is persisted and replayed, never re-evaluated.
All engine randomness derives from determinismSeed.
Replay substitutes recorded results; it never calls the ExecutionEngine.
A replay uses the same frozen graph snapshot as the original run.
Runtime mutations are replayed from the recorded log, not re-derived.
A replay reaches the same terminal run state as the original.
```

# AI Notes

Do not let the engine call a random source directly. One raw `Math.random()` in a tie-break silently breaks every replay and makes bug reports irreproducible. Derive from the seed or fail the build.

Do not make replay re-run Workers. Replay is a playback of recorded results through the same tick loop. Re-running the model defeats the purpose (cost, non-determinism, side effects) and can double-apply changes.

Do not treat a missing recorded result as "just run it again". A missing result means the original run did not durably record that node; reconciliation (Part 06) must resolve it first. Guessing during replay corrupts the replayed state.

# Related Documents

- [[06-workflow-engine/README]]
- [[WorkflowEngine-Part01]]
- [[WorkflowEngine-Part06]]
- [[WorkflowEngine-Part08]]
- [[WorkflowEngine-Diagrams]]
- [[Replay-Part01]]
- [[DynamicGraphs-Part01]]
- [[Scheduler-Part01]]
- [[ExecutionEngine-Part01]]
