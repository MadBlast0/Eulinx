---
title: HistoryTables Specification - Part 03
status: draft
version: 1.0
tags:
  - database
  - history-tables
  - audit
related:
  - "[[08-database/README]]"
  - "[[HistoryTables-Part01]]"
  - "[[HistoryTables-Part02]]"
  - "[[MergeManager-Part01]]"
---

# HistoryTables Specification (Part 03)

## Document Index

Part 01 - Purpose, Philosophy, the Append-Only Law, and Object Model
Part 02 - The Event Log DDL and the Persisted Event Envelope
Part 03 - The Domain History Tables DDL: worker, artifact, merge, permission, cost
Part 04 - Sequence Numbers, Ordering Guarantees, and Write Paths
Part 05 - Replay Sufficiency: what must be recorded to reconstruct history
Part 06 - Retention, Pruning, Partitioning, Rollup, Checklist, Examples
Diagrams - HistoryTables-Diagrams.md

# The Domain History Tables

`event_log` is the spine. The domain tables are narrow, query-optimized projections that make "show me this worker's life" or "how much did session X cost" fast without scanning the envelope JSON. They are derived from `event_log` and rebuildable from it. Each is append-only under the same law.

# worker_history

One row per Worker lifecycle transition. Fields: `sequence` (FK to `event_log.sequence`, the spine link), `worker_id`, `from_status`, `to_status`, `reason` JSON (e.g. a `FailureInfo` with code and detail), `caused_by_event` (the `event_id` that triggered the transition), `emitted_at`. The `from_status`/`to_status` pair is what lets the UI draw the Worker's state timeline without replaying the whole log.

# artifact_history

One row per Artifact lifecycle transition and verification verdict. Fields: `sequence`, `artifact_id`, `producer_worker_id` nullable, `event_type` (`created` | `verified` | `failed` | `superseded`), `verification_detail` JSON (the objective check results or the LLM-judge note, clearly labelled "suggested" when heuristic), `emitted_at`. The `superseded` event records when a newer version replaced this artifact.

# merge_history

One row per application of an Artifact to the Project by the [[MergeManager-Part01]]. This is the undo substrate. Fields: `sequence`, `merge_id`, `project_id`, `artifact_id`, `applied_by_worker_id` nullable, `before_hash`, `after_hash`, `reverse_patch` (the inverse, so the change can be rolled back), `verified` INTEGER, `emitted_at`. The `before_hash`/`after_hash`/`reverse_patch` trio is what makes "undo this merge" possible without re-deriving anything.

# permission_history

One row per permission decision, granted or denied. This is the audit spine for "who approved writing to `src/auth/session.rs` and why". Fields: `sequence`, `worker_id` nullable, `decision` (`granted` | `denied`), `capability` (the permission name, e.g. `git.push`), `justification` TEXT (what the AI said), `policy_version` TEXT (which permission profile was in effect), `emitted_at`. This table is in the protected family: never pruned, never deleted (Part 06).

# cost_ledger

One row per unit of spend, the immutable money ledger. Fields: `sequence`, `worker_id` nullable, `execution_id` nullable, `task_id` nullable, `session_id` nullable, `input_tokens` INTEGER, `output_tokens` INTEGER, `cost_micro_usd` INTEGER (never `REAL`), `model_profile` (resolved string), `emitted_at`. Every dollar is attributable to a Worker, an Execution, a Task, and a Session. Money is integer micro-units so sums are associative and two screens cannot disagree.

# Invariants

```text
Every domain history row links to event_log by sequence.
worker_history records from_status and to_status for timeline drawing.
merge_history carries before_hash, after_hash, and reverse_patch for undo.
permission_history is never pruned and never deleted.
cost_ledger stores integer micro-USD, never REAL.
All domain tables are append-only under the same law as event_log.
Domain tables are rebuildable from event_log.
```

# AI Notes

Do not drop `reverse_patch` from `merge_history` to save space. It is the only thing that makes undo possible without re-running the Builder. A merge you cannot undo is a change you cannot trust.

Do not store cost as `REAL` in `cost_ledger`. Floating-point summation is not associative; the Session total depends on row order and two UI screens will disagree. Integer micro-USD, always.

Do not let `permission_history` be pruned "to save space". A denied `git.push` from six months ago is exactly the record a security review needs. It is in the protected family; the pruner in Part 06 MUST NOT touch it.

Do not treat domain tables as the source of truth over `event_log`. They are projections. If they disagree with the log, the log is right and the projection is rebuilt.

# Related Documents

- [[08-database/README]]
- [[HistoryTables-Part02]]
- [[HistoryTables-Part04]]
- [[HistoryTables-Diagrams]]
- [[MergeManager-Part01]]
- [[PermissionManager-Part01]]
- [[EventBus-Part02]]
- [[Replay-Part01]]
