---
title: HistoryTables Specification - Part 05
status: draft
version: 1.0
tags:
  - database
  - history-tables
  - replay
related:
  - "[[08-database/README]]"
  - "[[HistoryTables-Part01]]"
  - "[[HistoryTables-Part04]]"
  - "[[Replay-Part01]]"
---

# HistoryTables Specification (Part 05)

## Document Index

Part 01 - Purpose, Philosophy, the Append-Only Law, and Object Model
Part 02 - The Event Log DDL and the Persisted Event Envelope
Part 03 - The Domain History Tables DDL: worker, artifact, merge, permission, cost
Part 04 - Sequence Numbers, Ordering Guarantees, and Write Paths
Part 05 - Replay Sufficiency: what must be recorded to reconstruct history
Part 06 - Retention, Pruning, Partitioning, Rollup, Checklist, Examples
Diagrams - HistoryTables-Diagrams.md

# Replay Sufficiency

Replay (see [[Replay-Part01]]) reconstructs runtime state by reading events in sequence order and re-deriving state. For that to work, history MUST be complete and self-contained over the replayed range. This Part defines what "complete and self-contained" means for each reason history exists (from Part 01).

# What Must Be Recorded

**For Replay (determinism).** Every event that changed run state or worker state MUST be in `event_log` with its full resolved `payload`. A missing transition means Replay diverges from what actually happened. The monotic `sequence` and the no-gaps guarantee (Part 04) are what make a range replayable.

**For Audit.** `permission_history` and `merge_history` MUST retain enough to answer "who, what, when, why" months later. They are never pruned (Part 06). `merge_history.reverse_patch` MUST be present so the change is invertible.

**For Undo.** A merge record MUST contain `before_hash`, `after_hash`, and `reverse_patch`. Without all three, undo cannot reproduce the pre-merge state. The [[MergeManager-Part01]] writes these; HistoryTables stores them immutably.

**For Debugging.** A Worker's garbage output must be traceable to the exact resolved inputs: the model profile string, the context package reference, the tool results. History stores resolved snapshots, not references to profiles that may have been edited. The snapshot-not-reference rule (Part 01) is what makes a six-month-old failure reproducible.

**For Cost accounting.** `cost_ledger` MUST record every unit of spend attributable to a Worker, Execution, Task, and Session, in integer micro-USD. A missing ledger row means untracked spend and an unexplainable total.

# The Snapshot-not-Reference Rule

This rule deserves emphasis because it is the easiest to violate with a cheap model-generated writer:

```text
When recording history about a decision made with a resolved input
(model profile, permission profile, prompt version, settings), store the
RESOLVED snapshot in the history row. Do NOT store a foreign key to the
mutable profile row.
```

If you store a foreign key and the profile is edited later, every history row pointing at it now describes a decision that was never made under the new values. The audit trail becomes a fiction. Disk is cheap; resolved snapshots are not.

# Honesty Over Completeness

When a range cannot be fully reconstructed (a gap from pruning, a lost sequence), Replay MUST mark itself `partial` and state the gap. HistoryTables provides `findSequenceGaps` for exactly this. A partial replay that says "sequences 8000-9000 were pruned, reconstruction starts at 9001" is useful. One that invents the missing thousand is dangerous.

# Invariants

```text
event_log over a replayed range is complete and self-contained.
permission_history and merge_history are retained forever.
merge_history always carries before_hash, after_hash, reverse_patch.
History stores resolved snapshots, never references to mutable profiles.
cost_ledger records every spend in integer micro-USD.
A gap is reported honestly; replay marks itself partial.
```

# AI Notes

Do not store a reference to a mutable profile in a history row because "it saves space". The space you save is paid for in a false audit trail the first time someone edits the profile. Snapshot the resolved values.

Do not let Replay silently skip a gap. A skipped gap is an invented past. `findSequenceGaps` exists so Replay can be honest about what it reconstructed.

Do not omit `reverse_patch` from a merge record. Undo is a core promise of the MergeManager; a merge without an inverse is a one-way door.

Do not record a Worker's output stream in `event_log` as replay-grade. It is not; it is live terminal data. Recording 2000 chunks per second makes the log enormous and Replay slower, with no determinism benefit.

# Related Documents

- [[08-database/README]]
- [[HistoryTables-Part04]]
- [[HistoryTables-Part06]]
- [[HistoryTables-Diagrams]]
- [[Replay-Part01]]
- [[MergeManager-Part01]]
- [[EventBus-Part02]]
- [[EventBus-Part05]]
