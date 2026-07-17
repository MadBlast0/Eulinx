---
title: ExecutionFlow Specification - Part 08
status: draft
version: 1.0
tags:
  - workflow-engine
  - execution-flow
  - examples
  - checklist
related:
  - "[[06-workflow-engine/README]]"
  - "[[ExecutionFlow-Part01]]"
  - "[[ExecutionFlow-Part07]]"
  - "[[WorkflowExamples-Part01]]"
---

# ExecutionFlow Specification (Part 08)

## Document Index

Part 01 - Purpose, Philosophy, Boundaries, Object Model, States, Invariants
Part 02 - Triggers, Run Initialization, and Context Seeding
Part 03 - The Tick Loop and the Ready-Set Algorithm
Part 04 - Dispatch, Parallel Branches, and the Scheduler Handshake
Part 05 - Fan-In, Fan-Out, Join Semantics, and Barriers
Part 06 - Skip Propagation, Failure, Cancellation, and Terminal States
Part 07 - Scheduler Concurrency Limits and Admission
Part 08 - Worked Examples, the Implementation Checklist, and Common Mistakes
Diagrams - ExecutionFlow-Diagrams.md

# Purpose

Part 08 closes ExecutionFlow with two worked flow traces, an implementer checklist, and a list of common mistakes to avoid.

# Worked Example 1 — Parallel Build Then Join

Graph: `Input(goal) -> [BuilderA, BuilderB] -> Merge -> Verifier -> Output`.

- Tick 1: ready `{Input}`; admit; Input seeds `goal`.
- Tick 2: ready `{BuilderA, BuilderB}`; Scheduler admits both; both run, emit `artifactRef` A and B; fan-in at Merge collects `[A, B]` ordered by `nodeId`.
- Tick 3: ready `{Merge}`; Merge joins (wait-all), emits `merged`; Verifier consumes; emits `verdict`.
- Tick 4: ready `{Output}`; Output publishes.
- Tick 5: ready set empty, nothing running; run `succeeded`.

# Worked Example 2 — Branch, Skip, and Terminal

Graph: `Input -> Condition(passed?) -> [Verifier (true), Notify (false)] -> Output`.

- Tick 2: Condition evaluates `false`; selects `false` branch; `true` branch edges become `unsatisfied`; Verifier is `skipped`.
- Tick 3: ready `{Notify}`; Notify runs; Output publishes.
- Tick 4: terminal; Verifier is `skipped`, all others `succeeded`; run `succeeded`.

This shows that a skipped branch does not fail the run; it is a deliberate decision.

# Implementer Checklist

- Compute ready set from the remaining-dependency counter, not by walking parents (Part 03).
- Sort ready set by `nodeId` before admission (determinism).
- Call `Scheduler.admit`; dispatch only the returned subset (Part 04, 07).
- Guard every dispatch with the conditional `running` update (Part 08 engine tick).
- On result: validate schema, write RunContext, update edge satisfaction, propagate skip/failure, persist with `runSeq`, emit after commit.
- Compute terminal state as a pure function of node states (Part 06).
- In replay, substitute recorded results; never call the ExecutionEngine (Part 07 of WorkflowEngine).

# Common Mistakes

- Walking parents to compute readiness: O(V*E) per tick and wrong under skip. Use the counter.
- Sorting ready nodes by map iteration order: non-deterministic. Sort by `nodeId`.
- Admitting the ready set directly to the ExecutionEngine: bypasses the Scheduler and its budget.
- Marking a skipped-downstream node `failed`: invents an error; use `skipped`.
- Emitting events before the transaction commits: the UI shows a state that does not exist.
- Letting a `void` edge's target hang in `pending`: skip or cancel it, or the run never ends.

# Invariants

```text
The flow is a tick loop over persisted state.
Readiness uses a dependency counter; dispatch is conditional-update guarded.
Admission is the Scheduler's decision, not the engine's.
Terminal state is a pure function of node states.
Skipped branches are decisions, not errors.
Events follow commit, never precede it.
```

# AI Notes

Do not treat the tick as "run the next node". It is "propose a ready set, admit, dispatch, apply results, persist, repeat". Collapsing those steps into one recursive call destroys pause, resume, and replay.

Do not special-case flows per graph shape. The uniform tick handles linear, parallel, branched, and looping graphs alike. Shape-specific code is where bugs hide.

Do not skip the terminal-state recomputation on every tick exit. The run must always be able to declare itself done the moment the last node resolves.

# Related Documents

- [[06-workflow-engine/README]]
- [[ExecutionFlow-Part01]]
- [[ExecutionFlow-Part07]]
- [[ExecutionFlow-Diagrams]]
- [[WorkflowEngine-Part08]]
- [[WorkflowEngine-Part03]]
- [[Scheduler-Part01]]
- [[NodeArchitecture-Part05]]
- [[WorkflowExamples-Part01]]
