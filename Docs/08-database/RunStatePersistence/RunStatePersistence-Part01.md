---
title: RunStatePersistence Specification - Part 01
status: draft
version: 1.0
tags:
  - database
  - run-state
  - workflow-engine
related:
  - "[[08-database/README]]"
  - "[[SQLiteSchema-Part03]]"
  - "[[WorkflowEngine-Part01]]"
  - "[[RepositoryLayer-Part01]]"
---

# RunStatePersistence Specification (Part 01)

## Document Index

Part 01 - Purpose, Philosophy, the Run-State Model, and the Crash-Recovery Contract
Part 02 - The Persist Algorithm, Tick Coupling, and Resume
Part 03 - Run Context, Large Payloads, and the Port-Value Contract
Part 04 - Concurrency, Checkpointing, Checklist, and Worked Examples

# Purpose

RunStatePersistence is the durable bridge between the in-memory [[WorkflowEngine-Part01]] and SQLite. It owns how a live run's state is written so that an app restart, a crash, or a deliberate pause resumes exactly where it left off rather than restarting from scratch.

The WorkflowEngine interprets a graph and computes ready nodes. This topic owns the committed representation of that interpretation: the `run`, the `run_step` rows, and the `run_context` payload described in [[SQLiteSchema-Part03]]. The engine owns the algorithm; this topic owns the durability guarantee.

# Core Philosophy

A run that forgets its progress on restart is not a run, it is a script that happened to stop. Eulinx's value is that a multi-hour, multi-worker workflow survives the user closing the laptop. Three principles:

**Commit before tick.** The engine MUST persist run state after every node state change and before it proceeds to the next engine tick. The repository method `persist_run_state` (see [[RepositoryLayer-Part03]]) commits before the tick returns. An uncommitted tick is a lost tick.

**One resume point.** The persisted state is the single source for resume. On open, the engine rebuilds its in-memory mirror from `run` + `run_step` + `run_context`, never from React Flow state and never from its own memory alone.

**Replayable, not just restorable.** The persisted run state and the `event_log` (see [[HistoryTables-Part01]]) must agree. Resume reads the committed state; [[Replay-Part01]] reads the event log. They describe the same run and MUST not contradict.

# The Run-State Model

The persisted run state consists of:

- `run` — the run identity, `status`, `current_tick`, `engine_version`, and a reference to the run context. One row per run.
- `run_step` — one row per (run, node) holding that node's latest `status`, `attempt` count, and references to its input/output/error snapshots. Replaces the older "one history row per transition" for the live fast path; transitions are also appended to history for audit.
- `run_context` — the data carried along data edges between nodes: the typed port values produced by completed steps, consumed by ready steps.

The engine's in-memory mirror holds the same three things plus the graph adjacency. The mirror is derived from these rows; the rows are authoritative.

# The Crash-Recovery Contract

This is the rule the rest of the document depends on:

```text
After any node state change, run state is committed to SQLite.
If the process dies at any moment, the next open MUST reconstruct a run
whose status, tick, step states, and context equal the last committed state.
No completed node result is lost. No pending node is reported as succeeded.
```

The contract is what makes "close the app, reopen, the workflow is still running" a guarantee rather than a hope.

# Responsibilities

RunStatePersistence MUST:

- write `run`, `run_step`, and `run_context` in one transaction per `persist_run_state` call
- commit before the engine proceeds to the next tick
- record the `engine_version` so a run started under one algorithm version resumes under compatible logic
- persist every node state change, not only terminal ones
- keep the persisted state consistent with `event_log` for the same run
- provide a `resume_run` read that returns the full run state in one call

RunStatePersistence MUST NOT:

- let the engine tick while run state is uncommitted
- store the graph only in React Flow state (the UI is a subscriber, per [[WorkflowEngine-Part01]])
- report a step `succeeded` before its result is committed
- diverge from `event_log`; if they disagree, history is right and the run state is the bug

# Invariants

```text
persist_run_state commits before the engine ticks onward.
run.current_tick is monotonic and matches the engine's tick counter.
run_step reflects the latest committed status of each node.
run_context carries the port values needed by ready steps.
On open, resume_run reconstructs exactly the last committed state.
The persisted run and event_log describe the same run without contradiction.
```

# AI Notes

Do not let the engine tick past an uncommitted state change. "Persist eventually" is the single most common cause of a workflow that resumes with half its nodes in the wrong state. Commit first, tick second, every time.

Do not store the graph in React Flow and call it persisted. React Flow state is a view; the authoritative graph is `workflow`/`node`/`edge` in [[SQLiteSchema-Part03]]. The run state references node ids from there.

Do not rebuild the engine mirror from its own memory on resume. Memory is gone after a crash. Rebuild from `run` + `run_step` + `run_context`, which is exactly what `resume_run` returns.

Do not let `run_step` report `succeeded` before the result row commits. A crash between "mark succeeded" and "write result" yields a step that claims success with no output — the worst kind of silent corruption.

# Related Documents

- [[08-database/README]]
- [[RunStatePersistence-Part02]]
- [[RunStatePersistence-Diagrams]]
- [[SQLiteSchema-Part03]]
- [[WorkflowEngine-Part01]]
- [[RepositoryLayer-Part03]]
- [[HistoryTables-Part01]]
- [[Replay-Part01]]
