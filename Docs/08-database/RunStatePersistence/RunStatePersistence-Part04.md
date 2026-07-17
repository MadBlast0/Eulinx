---
title: RunStatePersistence Specification - Part 04
status: draft
version: 1.0
tags:
  - database
  - run-state
  - checkpointing
related:
  - "[[08-database/README]]"
  - "[[RunStatePersistence-Part01]]"
  - "[[WorkflowEngine-Part01]]"
---

# RunStatePersistence Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Run-State Model, and the Crash-Recovery Contract
Part 02 - The Persist Algorithm, Tick Coupling, and Resume
Part 03 - Run Context, Large Payloads, and the Port-Value Contract
Part 04 - Concurrency, Checkpointing, Checklist, and Worked Examples

# Concurrency

A run is advanced by a single engine tick loop; there is no parallel writer to the same `run` row. Concurrency concerns are:

- Multiple runs may be live in one Workspace; each has its own `run` row and its own `persist_run_state` transaction. They do not contend on rows, only on pool connections. The pool reserves hot connections for run-state writes (see [[RepositoryLayer-Part01]]).
- A pause/cancel request from the UI is a state change like any other: it is applied through `persist_run_state` so the next tick observes it. The request does not mutate engine memory directly; it persists and the tick honors it.
- A resume on open and a live tick never run simultaneously for the same run; the run is either being resumed (single reader rebuilding state) or being ticked (single writer). The `run.status` transition to `running` is itself a committed persist.

# Checkpointing

Beyond per-tick persistence, a run MAY emit a coarse checkpoint: a snapshot of `run_context` plus step states written to a `snapshot` artifact-style blob, used by [[Snapshots-Part01]] for point-in-time workspace state and by [[Replay-Part01]] for fast-forward. Checkpoints are additive; they never replace the per-tick rows. The per-tick rows remain the authoritative resume source; the checkpoint is an optimization and a user-visible "save state".

# Implementation Checklist

- [ ] `persist_run_state` writes run + steps + context in one transaction.
- [ ] The engine commits before ticking onward.
- [ ] `resume_run` returns run + all steps + context consistently.
- [ ] Port values reference succeeded steps only.
- [ ] Large values are artifact_refs, not inline.
- [ ] Pause/cancel is a persisted state change, not a memory mutation.
- [ ] A run is advanced by exactly one writer at a time.
- [ ] Coarse checkpoints are additive and never replace per-tick rows.

# Worked Examples

**Example 1 — clean resume.** A 40-node workflow is at tick 217, 12 nodes succeeded, when the app closes. On reopen, `resume_run` returns the `run` (status `running`, tick 217), the 40 `run_step` rows, and the `run_context`. The engine rebuilds adjacency, recomputes the ready set, and continues from tick 218. No node re-runs.

**Example 2 — crash mid-tick.** The engine computes tick 218's transitions and calls `persist_run_state`. The commit succeeds. A millisecond later the process dies. On reopen the same committed state is found; tick 218 is already persisted, so resume continues at 219. No half-state is observable.

**Example 3 — pause honored.** The user clicks pause at tick 90. The pause is persisted as `run.status = paused`. The in-flight tick completes and commits, then the loop sees `paused` and stops. Reopen shows the run paused at the last committed tick; it does not auto-run.

**Example 4 — large value.** A Builder step emits a 2 MB generated `app.ts`. The value is written as an `artifact`; `run_context` holds an `artifact_ref` plus a one-line summary. The Verifier step reads the artifact. Resume reads only the ref, keeping the context small.

# Invariants

```text
A run has exactly one writer (resume reader OR tick writer) at a time.
Pause/cancel is persisted, not memory-mutated.
Checkpoints are additive and never replace per-tick rows.
Per-tick rows are the authoritative resume source.
Multiple live runs do not contend on rows, only on pool connections.
```

# AI Notes

Do not let a pause request mutate engine memory directly. If the tick loop reads memory that was changed outside `persist_run_state`, the persisted state and the engine disagree, and resume rebuilds the wrong thing. Pause is a persisted state change.

Do not make checkpoints replace per-tick rows "for efficiency". The per-tick rows are what make resume exact. A checkpoint is a fast-forward hint and a user-visible save; it is never authoritative.

Do not let two tick loops advance the same run. A run is owned by one engine instance; parallelism happens across runs, not within one. Two writers to one `run` row is a lost-update bug.

# Related Documents

- [[08-database/README]]
- [[RunStatePersistence-Part03]]
- [[RunStatePersistence-Diagrams]]
- [[WorkflowEngine-Part01]]
- [[SQLiteSchema-Part03]]
- [[HistoryTables-Part01]]
- [[Replay-Part01]]
- [[Snapshots-Part01]]
- [[RepositoryLayer-Part01]]
