---
title: RunStatePersistence Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - run-state
  - resume
related:
  - "[[08-database/README]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[WorkflowEngine-Part01]]"
---

# RunStatePersistence Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Run-State Model, and the Crash-Recovery Contract
Part 02 - The Persist Algorithm, Tick Coupling, and Resume
Part 03 - Run Context, Large Payloads, and the Port-Value Contract
Part 04 - Concurrency, Checkpointing, Checklist, and Worked Examples

# The Persist Algorithm

Every engine tick that changes state calls `persist_run_state`. The numbered algorithm:

1. The engine computes the next state: which `run_step` rows change status, what `current_tick` becomes, and what `run_context` updates result from completed steps.
2. The repository opens a transaction. It writes the `run` row (`status`, `current_tick`, `engine_version`), upserts each changed `run_step` (status, attempt, input/output/error refs), and upserts `run_context` (the updated port values).
3. The same transaction appends the corresponding `worker_history` / step transitions to the history writer (see [[HistoryTables-Part01]]), so the audit spine stays consistent.
4. The transaction commits.
5. Only after commit does the engine proceed to the next tick or dispatch the next ready node.

If step 2-4 fail (disk full, lock), the engine does NOT tick. It transitions the Runtime to `degraded` and retries; it never advances on uncommitted state.

# Tick Coupling

The coupling between a tick and a commit is the central guarantee. It is stated as a rule:

```text
One tick == at most one state transition set == exactly one committed persist_run_state.
No tick is "in flight" without a matching committed row set.
```

This is why the engine is a tick loop over persisted state (see [[WorkflowEngine-Part01]]), not a recursive walk over memory. A recursive walk cannot pause or resume; a tick loop persists between every step.

# Resume

On open, or when a run is explicitly resumed, `resume_run(run_id)` returns the full state in one call: the `run` row, all `run_step` rows, and the `run_context`. The engine then:

1. Rebuilds adjacency from `workflow`/`node`/`edge` (see [[SQLiteSchema-Part03]]).
2. Loads each `run_step` status into the in-memory mirror.
3. Loads `run_context` port values.
4. Recomputes the ready set from current step states.
5. Continues the tick loop from `run.current_tick`.

A run found in `status = running` on open is resumed automatically; a run in `status = paused` waits for user action; a run in `status = failed` is offered to [[Replay-Part01]] and the restoration path.

# Invariants

```text
Each tick commits exactly one persist_run_state before proceeding.
A failed persist blocks the tick; the engine does not advance.
resume_run returns run + all steps + context in one consistent read.
Resume rebuilds adjacency from the workflow tables, not from memory.
A running run on open is resumed; a paused run waits; a failed run is offered to replay.
```

# AI Notes

Do not advance the tick optimistically and "persist in the background". Background persistence races the next tick and can commit a future state over a crashed one. Persist synchronously, before proceeding.

Do not treat `resume_run` as a slow path you can skip on happy days. Every open is a potential resume; the engine always rebuilds from persisted state, even if the app never crashed. That discipline is what makes crash recovery free.

Do not recompute the ready set from React Flow positions. Status comes from `run_step`; ordering comes from `edge`. Positions are presentation and are ignored on resume.

# Related Documents

- [[08-database/README]]
- [[RunStatePersistence-Part01]]
- [[RunStatePersistence-Part03]]
- [[RunStatePersistence-Diagrams]]
- [[WorkflowEngine-Part01]]
- [[SQLiteSchema-Part03]]
- [[HistoryTables-Part01]]
- [[Replay-Part01]]
