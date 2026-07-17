---
title: HistoryTables Specification - Part 04
status: draft
version: 1.0
tags:
  - database
  - history-tables
  - sequencing
related:
  - "[[08-database/README]]"
  - "[[HistoryTables-Part01]]"
  - "[[HistoryTables-Part02]]"
  - "[[EventBus-Part05]]"
---

# HistoryTables Specification (Part 04)

## Document Index

Part 01 - Purpose, Philosophy, the Append-Only Law, and Object Model
Part 02 - The Event Log DDL and the Persisted Event Envelope
Part 03 - The Domain History Tables DDL: worker, artifact, merge, permission, cost
Part 04 - Sequence Numbers, Ordering Guarantees, and Write Paths
Part 05 - Replay Sufficiency: what must be recorded to reconstruct history
Part 06 - Retention, Pruning, Partitioning, Rollup, Checklist, Examples
Diagrams - HistoryTables-Diagrams.md

# Sequence Numbers

Every history row — in `event_log` and in every domain table — carries a `sequence` drawn from a single global allocator per Workspace. The allocator is a monotonic counter persisted in a small `sequence_allocator` table (one row per workspace) and incremented under the same transaction that inserts the history row. There is no per-table sequence; a Worker transition and a cost entry that happened "together" receive adjacent sequences, which is what makes causal ordering reconstructable.

# Ordering Guarantees

The guarantees Replay and audit depend on:

- **Global uniqueness.** No two rows share a `sequence`, ever. The allocator never reuses, reassigns, or reorders a value.
- **Commit-order monotonicity.** Sequences increase in the order transactions commit. A row committed later always has a higher sequence than one committed earlier.
- **No gaps by default.** Under normal operation the sequence is contiguous. A gap means either pruning (Part 06) or data loss, and the gap MUST be reported honestly via `findSequenceGaps` rather than interpolated.
- **Causal consistency via causation_id.** Within monotonic order, `causation_id` lets Replay reconstruct which event caused which, so a subtree can be replayed even if other events interleave.

# Write Paths

All history writes flow through the single `HistoryWriter` (see Part 01). There is no second path. The write path per event:

1. Allocate the next `sequence` from the workspace allocator (inside the caller's transaction).
2. Insert the `event_log` envelope.
3. Insert the corresponding domain history row(s) linking by `sequence`.
4. The caller's state change and these history inserts share one transaction (the rule from Part 01 and [[RepositoryLayer-Part03]]).
5. On commit, the EventBus projection has already published; the envelope in `event_log` is the durable copy.

The write mode (per-event vs batched) is governed by [[EventBus-Part05]]: high-frequency events may be batched for the live bus but the `event_log` insert remains one row per event to preserve per-event sequences.

# Enforcing the Append-Only Law

The triggers owned by [[SQLiteSchema-Part06]] make this structural:

- An `UPDATE` or `DELETE` (outside the pruner) against `event_log`, `worker_history`, `artifact_history`, `merge_history`, `permission_history`, or `cost_ledger` raises `SQLITE_CONSTRAINT`.
- A future implementer who has not read this document is stopped by the engine, not by discipline.
- The pruner (Part 06) is the only code path with the right to `DELETE`, and only against non-protected families.

# Invariants

```text
One global sequence allocator per workspace, incremented per history write.
Sequences are globally unique and monotonic in commit order.
A gap is reported honestly, never interpolated.
All history writes go through HistoryWriter; no second path exists.
State change and history share one transaction.
The append-only triggers block UPDATE/DELETE outside the pruner.
```

# AI Notes

Do not give each history table its own auto-increment sequence. A Worker transition and a cost entry would then have unrelated numbers and you could not reconstruct causal order. One allocator, one ordering.

Do not interpolate across a sequence gap because "replay needs continuity". A gap means data was pruned or lost. Inventing the missing thousand events produces a replay that looks complete but is a lie. Report the gap; let Replay mark itself `partial`.

Do not let a Worker write its own history row. Workers produce Artifacts; Runtime services record history. A Worker that writes its own audit trail can write a flattering one. The single `HistoryWriter` is the guard.

Do not batch `event_log` inserts so that one transaction holds many events with non-contiguous sequences. Each event is one row, one sequence; batching is a bus-transport optimization, not a log-compaction.

# Related Documents

- [[08-database/README]]
- [[HistoryTables-Part03]]
- [[HistoryTables-Part05]]
- [[HistoryTables-Diagrams]]
- [[SQLiteSchema-Part06]]
- [[RepositoryLayer-Part03]]
- [[EventBus-Part05]]
- [[Replay-Part01]]
