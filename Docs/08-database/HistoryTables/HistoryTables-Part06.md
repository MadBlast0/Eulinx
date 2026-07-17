---
title: HistoryTables Specification - Part 06
status: draft
version: 1.0
tags:
  - database
  - history-tables
  - retention
related:
  - "[[08-database/README]]"
  - "[[HistoryTables-Part01]]"
  - "[[HistoryTables-Part05]]"
  - "[[BackupRestore-Part01]]"
---

# HistoryTables Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, the Append-Only Law, and Object Model
Part 02 - The Event Log DDL and the Persisted Event Envelope
Part 03 - The Domain History Tables DDL: worker, artifact, merge, permission, cost
Part 04 - Sequence Numbers, Ordering Guarantees, and Write Paths
Part 05 - Replay Sufficiency: what must be recorded to reconstruct history
Part 06 - Retention, Pruning, Partitioning, Rollup, Checklist, Examples
Diagrams - HistoryTables-Diagrams.md

# Retention Policy

History grows without bound in a long-lived Workspace. Retention bounds it without breaking the audit and replay guarantees. The policy splits tables into two families:

- **Protected family** — `merge_history` and `permission_history`. Retained forever. Never pruned, never deleted, under any retention horizon. These answer the audit questions that survive the project.
- **Prunable family** — `event_log`, `worker_history`, `artifact_history`, `cost_ledger`, and `log_entry` (the last owned by [[SQLiteSchema-Part05]] but pruned here). These may be pruned after a retention horizon, with rollup.

# The Pruner

The pruner is the ONLY code path permitted to `DELETE` from a history table. It runs under the triggers' exception (see [[SQLiteSchema-Part06]]). Its rules:

- It MUST NOT touch `merge_history` or `permission_history`, ever.
- It prunes `event_log`, `worker_history`, `artifact_history`, and `cost_ledger` rows older than the retention horizon (e.g. 180 days for event_log, configurable).
- Before deleting a prunable range, it writes a `history_rollup` row summarizing the range: the workspace, the sequence range, counts per event type, aggregate cost, and a pointer to any retained `merge_history`/`permission_history` rows in that range.
- It records the pruned range in a `pruned_range` ledger so `findSequenceGaps` can report a gap as `pruned` rather than `unknown`.
- It runs only when the Runtime is idle, never mid-execution, and never while a Replay is reading the same range.

# Rollup

`history_rollup` is the compacted summary of a pruned range. It lets the UI show "180 days ago, 412 worker transitions, $3.20 spent" without keeping every row. Rollup is additive: it never replaces the protected rows, and it never lets a pruned range become invisible to gap reports.

# Partitioning Note

For very large Workspaces, `event_log` MAY be partitioned by time (e.g. monthly). Partitioning is a storage optimization; the `sequence` allocator and the append-only law are unchanged. A partition is dropped only after its rows are rolled up and after the retention horizon passes; protected-family rows that happen to fall in a partition are copied to the retained tables before the partition is dropped.

# Worked Examples

**Example 1 — audit survives pruning.** A `permission_history` row recording a denied `git.push` from 400 days ago is never pruned. A `worker_history` row from 200 days ago is pruned after the 180-day horizon, but its range is rolled up and recorded, so the gap report shows `pruned`, not `unknown`.

**Example 2 — undo still works.** A `merge_history` row from a year ago is retained with its `reverse_patch`. The user undoes that merge; the inverse applies exactly, even though the `event_log` entries around it were pruned long ago.

**Example 3 — cost total stable.** `cost_ledger` rows older than the horizon are pruned, but `history_rollup` carries the aggregate micro-USD for that range, so the lifetime cost total remains correct and the two screens agree.

# Implementation Checklist

- [ ] Protected family (`merge_history`, `permission_history`) is never pruned or deleted.
- [ ] Pruner is the only DELETE path and runs under the trigger exception.
- [ ] Pruned ranges are rolled up into `history_rollup` before deletion.
- [ ] Pruned ranges are recorded in `pruned_range` so gaps report as `pruned`.
- [ ] Pruner runs only when idle and not during an active Replay read.
- [ ] Partition drops copy protected rows before dropping the partition.
- [ ] Cost aggregates survive pruning via rollup.

# Invariants

```text
merge_history and permission_history are retained forever.
The pruner never deletes from the protected family.
Pruned ranges are rolled up and recorded before deletion.
Gap reports distinguish pruned gaps from unknown gaps.
Pruning never runs mid-execution or during a Replay read.
Cost totals remain correct after pruning via rollup.
```

# AI Notes

Do not let the pruner touch `permission_history` "just this once" for a cleanup. That one deletion is the audit record a future security review needs. The protected family is absolute.

Do not delete a prunable range without first writing `history_rollup`. Deletion without rollup turns history into a hole with no summary; the gap report would say `unknown` and Replay could not even say what was lost.

Do not run the pruner mid-execution or while Replay reads. Pruning and reading the same range concurrently is how you get a replay that silently misses events. Idle-only, and coordinate with active readers.

Do not drop a partition containing `merge_history` rows. Protected rows travel to the retained tables first; the partition drop is the last step, never the first.

# Related Documents

- [[08-database/README]]
- [[HistoryTables-Part05]]
- [[HistoryTables-Diagrams]]
- [[SQLiteSchema-Part05]]
- [[SQLiteSchema-Part06]]
- [[Replay-Part01]]
- [[MergeManager-Part01]]
- [[BackupRestore-Part01]]
