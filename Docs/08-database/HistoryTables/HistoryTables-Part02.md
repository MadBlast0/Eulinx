---
title: HistoryTables Specification - Part 02
status: draft
version: 1.0
tags:
  - database
  - history-tables
  - event-log
related:
  - "[[08-database/README]]"
  - "[[HistoryTables-Part01]]"
  - "[[EventBus-Part02]]"
  - "[[EventBus-Part05]]"
---

# HistoryTables Specification (Part 02)

## Document Index

Part 01 - Purpose, Philosophy, the Append-Only Law, and Object Model
Part 02 - The Event Log DDL and the Persisted Event Envelope
Part 03 - The Domain History Tables DDL: worker, artifact, merge, permission, cost
Part 04 - Sequence Numbers, Ordering Guarantees, and Write Paths
Part 05 - Replay Sufficiency: what must be recorded to reconstruct history
Part 06 - Retention, Pruning, Partitioning, Rollup, Checklist, Examples
Diagrams - HistoryTables-Diagrams.md

# The Event Log

`event_log` is the canonical spine of history. It holds every replay-grade event emitted by the [[EventBus-Part02]] catalog, in total order by `sequence`. Everything else in HistoryTables is a domain-specific projection that makes certain queries fast; `event_log` is the source from which they can be rebuilt.

# The Persisted Event Envelope

The envelope stored in `event_log` is structurally identical to `EulinxEvent` in [[EventBus-Part01]]. Its fields:

- `sequence` â€” the global monotonic allocator value (see Part 04). Primary key, unique, never reused.
- `event_id` â€” the original event's id (ULID), for deduplication and correlation.
- `event_type` â€” the catalog type string (e.g. `worker.status_changed`). Must be a replay-grade type from [[EventBus-Part02]]; non-replay-grade events are rejected by the writer.
- `workspace_id` â€” for scoping and partition; every event belongs to a workspace.
- `correlation_id` â€” links an event to a run, execution, task, or session so replay can filter to a subtree.
- `causation_id` â€” the `event_id` that caused this one (the "because of" link), enabling causal replay and debugging.
- `emitted_at` â€” RFC3339 UTC, the event time.
- `payload` â€” JSON, the resolved event body. Critically, it stores resolved snapshots of inputs, never references to mutable profiles (the rule from Part 01).
- `producer` â€” which runtime service wrote it.

The envelope is append-only. There is no UPDATE path; the trigger in [[SQLiteSchema-Part06]] raises `SQLITE_CONSTRAINT` on any UPDATE against `event_log`.

# Why the Envelope Mirrors EulinxEvent

Replay (see [[Replay-Part01]]) reads `event_log` and feeds events back into the engine as if they had just been emitted. If the stored envelope differed structurally from `EulinxEvent`, replay would need a translation layer, and translation is where semantics silently drift. The writer MUST reject any envelope that does not round-trip to `EulinxEvent`. The two definitions are kept identical by convention and by a test in [[EventBus-Part05]].

# Invariants

```text
event_log contains exactly the replay-grade events from the EventBus catalog.
Every envelope is structurally identical to EulinxEvent.
No UPDATE or non-pruner DELETE touches event_log.
payload stores resolved snapshots, not references to mutable profiles.
sequence is globally unique and monotonically increasing in commit order.
correlation_id and causation_id enable subtree and causal replay.
```

# AI Notes

Do not store a foreign key to a mutable profile inside `payload`. If a user edits a model profile a week later, every history row pointing at it describes a decision that was never made. Store the resolved snapshot as JSON. Disk is cheap; a false audit trail is not.

Do not write non-replay-grade events to `event_log`. Streaming output chunks are not replay-grade; they belong to the live terminal, not history. The catalog in [[EventBus-Part02]] is the authority on what is replay-grade.

Do not let the envelope diverge from `EulinxEvent`. The moment they differ, replay needs translation, and translation is where you lose the "replay equals original" guarantee that [[Replay-Part01]] depends on.

# Related Documents

- [[08-database/README]]
- [[HistoryTables-Part01]]
- [[HistoryTables-Part03]]
- [[HistoryTables-Diagrams]]
- [[EventBus-Part01]]
- [[EventBus-Part02]]
- [[EventBus-Part05]]
- [[Replay-Part01]]
