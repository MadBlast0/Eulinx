---
title: EventBus Specification - Part 05
status: draft
version: 1.0
tags:
  - runtime
  - event-bus
  - replay
  - persistence
related:
  - "[[EventBus-Part04]]"
  - "[[EventBus-Part06]]"
  - "[[RuntimeManager-Part05]]"
---

# EventBus Specification (Part 05)

# Purpose of This Part

This part defines the event log, replay, metrics taps, and every failure mode the bus must survive.

The event log is what makes Eulinx auditable. If the log is wrong, nothing above it can be trusted.

# The Event Log

The event log is a SQLite table. It is append-only. There is no `UPDATE` statement anywhere in the EventBus implementation.

```sql
CREATE TABLE event_log (
  sequence        INTEGER PRIMARY KEY,
  event_id        TEXT    NOT NULL UNIQUE,
  type            TEXT    NOT NULL,
  payload         TEXT    NOT NULL,
  service         TEXT    NOT NULL,
  workspace_id    TEXT    NOT NULL,
  session_id      TEXT,
  execution_id    TEXT,
  correlation_id  TEXT,
  causation_id    TEXT,
  emitted_at      TEXT    NOT NULL
) STRICT;

CREATE INDEX idx_event_log_workspace   ON event_log (workspace_id, sequence);
CREATE INDEX idx_event_log_execution   ON event_log (execution_id, sequence);
CREATE INDEX idx_event_log_correlation ON event_log (correlation_id, sequence);
CREATE INDEX idx_event_log_type        ON event_log (type, sequence);
```

`sequence` is the primary key, so SQLite stores rows in sequence order and a replay scan is a sequential read.

Only replay-grade events are written. The non-replay-grade list from Part 02 never touches this table. Writing 2000 output chunks per second into SQLite would make the log both enormous and useless.

## Write Mode

```text
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

WAL allows readers (the log viewer, replay) to run while writers append. `synchronous = NORMAL` is the correct trade: it survives application crashes, which are the realistic failure, and only risks loss on OS-level power failure, which already invalidates the Workspace state the log describes.

Implementers MUST NOT use `synchronous = OFF`. A log that loses its tail on a crash cannot support Replay.

## Batched Writes

A synchronous per-event `INSERT` costs roughly 0.1 ms. At high replay-grade rates that becomes a publish bottleneck.

```text
1. The log writer holds an open transaction and a flush timer.
2. publish() INSERTs into the open transaction and returns.
3. The transaction COMMITs when EITHER:
   a. 10 ms elapses since the transaction opened, OR
   b. 100 events are pending, OR
   c. a merge.* or permission.* event is written.
4. publish() for a replay-grade event does not return Ok until
   the COMMIT that includes it has completed.
```

Rule 4 is what keeps Part 04's step 5 honest. The write is batched, but the acknowledgement still waits for durability. A publisher that received `Ok` may rely on the event being on disk.

Rule 3c forces an immediate commit for the two families where a lost tail would be a correctness disaster rather than a cosmetic gap.

# Retention

```ts
type RetentionPolicy = {
  logRetentionDays: number;      // default 30
  logMaxBytes: number;           // default 2 GiB
  pruneIntervalHours: number;    // default 24
};
```

Pruning algorithm:

```text
1. Every prune_interval_hours, compute the prune horizon.
2. An event is prunable only if ALL of these hold:
   a. emitted_at is older than log_retention_days, AND
   b. its execution_id is not referenced by a retained Execution, AND
   c. it is not a merge.* event, AND
   d. it is not a permission.* event.
3. If total log bytes still exceed log_max_bytes after step 2,
   prune the oldest prunable events until under the limit.
4. If the log still exceeds log_max_bytes and nothing is prunable,
   emit runtime.service_health_changed to degraded. Do NOT prune
   protected events to make room.
5. Emit a summary of what was pruned.
```

Steps 2c and 2d mean merge and permission events are kept forever. They are the audit trail: what changed the Project, and what was authorized. Disk is cheaper than an unanswerable "who approved this change" question.

Step 4 is deliberate. Running out of log space is a problem to surface, not to solve by destroying the audit trail.

# Replay

Replay reconstructs runtime history from the log. It is why the bus is deterministic.

```ts
type ReplayRequest = {
  workspaceId: WorkspaceId;
  fromSequence?: number;
  toSequence?: number;
  executionId?: ExecutionId;
  correlationId?: string;
};

type ReplayHandle = {
  replayId: string;
  totalEvents: number;
  currentSequence: number;
  state: "loading" | "ready" | "playing" | "paused" | "completed" | "failed";
};
```

Replay reads the log in `sequence` order and re-delivers events to replay-mode subscribers.

## Replay Safety Rules

These are absolute.

```text
Replay MUST NOT publish to the live bus.
Replay MUST NOT spawn Workers.
Replay MUST NOT invoke Tools.
Replay MUST NOT acquire locks.
Replay MUST NOT apply merges.
Replay MUST NOT write to the event log.
Replay MUST NOT mutate any Project file.
```

Replay is a read. It reconstructs what happened; it does not do it again.

The implementation MUST enforce this structurally, not by convention. Replay-mode subscribers receive events through a `ReplayBus` that has no publish method and holds no service handles. If a replay subscriber cannot reach the ExecutionEngine, it cannot accidentally re-execute anything.

```rust
pub struct ReplayBus {
    events: Vec<Arc<EulinxEvent>>,
    cursor: usize,
    subscribers: Vec<ReplaySubscription>,
    // Deliberately absent: log, channels, service handles, publish().
}
```

## Replay Determinism

Replaying the same sequence range MUST produce the same reconstructed state every time.

```text
1. Load events for the range, ordered by sequence ascending.
2. Verify no sequence gaps. A gap means the log was pruned or corrupted.
3. If a gap is found, mark the replay "partial" and report the gap range.
   Do NOT silently interpolate.
4. Deliver events to replay subscribers in sequence order, synchronously.
5. Replay delivery is globally ordered, unlike live delivery.
6. Reconstructed state is a pure function of the event range.
```

Step 5 differs from live delivery on purpose. Live delivery is per-source ordered for throughput. Replay is globally ordered for determinism. Replay is not on a latency budget, so it can afford the strict serialization the live path cannot.

Step 3 matters because retention prunes old events. A replay that crosses a prune horizon is honestly partial, and saying so is better than inventing a plausible history.

# Metrics Taps

A metrics tap is a core subscriber that aggregates rather than stores.

```ts
type MetricsTap = {
  tapId: string;
  filter: SubscriptionFilter;
  aggregation: "count" | "rate" | "histogram" | "gauge";
  window: DurationMs;
};

type RuntimeMetricsSnapshot = {
  workersSpawned: number;
  workersActive: number;
  executionsCompleted: number;
  executionsFailed: number;
  artifactsCreated: number;
  artifactsRejected: number;
  mergesApplied: number;
  mergesRolledBack: number;
  permissionsDenied: number;
  locksContended: number;
  lockWaitP95Ms: number;
  toolInvocations: number;
  toolFailureRate: number;
  totalCostMicroUsd: number;
  busPublishRate: number;
  busDroppedEvents: number;
  capturedAt: IsoTimestamp;
};
```

Every metric in Eulinx is derived from events. There is no separate metrics instrumentation path.

This is a deliberate constraint. If a number in the UI cannot be traced to events in the log, it cannot be audited or replayed, and it will eventually disagree with the log. One source of truth.

Taps MUST be pure aggregation. A tap that writes to disk, calls a service, or mutates state is not a tap, it is a subscriber pretending to be one.

# Failure Handling

## Slow Subscriber

```text
Detection:
  A subscriber has not drained its queue within slow_subscriber_timeout_ms
  while its queue is at capacity.

Response by class:
  core   -> Apply backpressure. Mark "lagging". Emit
            runtime.service_health_changed to degraded. If not recovered
            within 30 seconds, emit runtime.invariant_violated fatal.
  ui     -> Coalesce per Part 04. Never block. If the UI queue stays full
            for 5 seconds, drop non-replay-grade events and set
            droppedSinceLastBatch on the next batch.
  plugin -> Drop oldest immediately. Never wait. After 3 consecutive
            abandoned handler calls, quarantine the plugin.
```

A slow core subscriber is a Runtime bug and escalates loudly. A slow plugin is a plugin bug and is contained silently. Never treat them the same.

## Dropped Event

```text
1. Increment subscription.droppedCount and metrics.dropped.
2. Emit eventbus.subscriber_dropped_event with the reason.
3. If the dropped event was replay-grade AND the subscriber was core:
   a. This is an invariant violation. Emit runtime.invariant_violated
      with fatal: true.
   b. The RuntimeManager MUST transition the Runtime to failed.
4. If the dropped event was replay-grade AND the subscriber was plugin:
   a. This is permitted. Log it. Continue.
5. Rate limit eventbus.subscriber_dropped_event to 1 per subscription
   per second so a drop storm cannot itself become a drop storm.
```

Step 5 prevents the failure-reporting path from becoming the failure. A plugin dropping 10000 events per second must not generate 10000 drop events per second.

## Subscriber Panic

```text
1. Every handler invocation is wrapped in a catch boundary.
   Rust: tokio::task::spawn + JoinHandle error inspection, or
         std::panic::catch_unwind for synchronous handlers.
   TypeScript: try/catch around the handler call.
2. On panic:
   a. Emit eventbus.subscriber_panicked.
   b. Increment the subscription's consecutive panic counter.
   c. Continue delivering to all other subscribers. A panic in one
      subscriber MUST NOT affect any other subscriber or the publisher.
3. If a core subscriber panics 3 times consecutively:
   a. Emit runtime.invariant_violated with fatal: true.
   b. A core subscriber that cannot process events is a Runtime failure.
4. If a plugin subscriber panics 3 times consecutively:
   a. Quarantine the plugin. Emit plugin.quarantined.
   b. Unsubscribe every subscription owned by that plugin.
   c. The Runtime continues normally.
5. Reset the consecutive panic counter on any successful delivery.
```

A publisher MUST NEVER observe a subscriber panic. If `publish()` can return an error because some plugin threw, the boundary has failed.

## Log Write Failure

```text
1. Emit eventbus.log_write_failed. This event is best-effort - if the log
   is down, this event may only reach the UI and core subscribers.
2. Return PublishError::LogWriteFailed to the publisher.
3. The publisher MUST treat its operation as failed and roll back.
4. The RuntimeManager MUST transition the Runtime to degraded.
5. If 3 consecutive log writes fail, transition to failed and stop
   accepting new Executions. A Runtime that cannot record history
   MUST NOT continue making changes.
```

Step 5 is the strictest rule in the bus. Eulinx would rather stop than act without an audit trail. An untracked merge is worse than no merge.

## Bus Overflow During Shutdown

```text
1. Transition state to Draining. Reject new publish() calls with
   PublishError::BusNotRunning.
2. Continue delivering queued events to core subscribers.
3. Flush the open log transaction and COMMIT.
4. Flush the open UI batch.
5. Drop all plugin queues immediately without delivery. Plugins do not
   get a shutdown guarantee.
6. Wait up to 5 seconds for core queues to drain.
7. If core queues have not drained, log the residual count and force stop.
   The log is already durable, so Replay is intact regardless.
8. Transition to Stopped.
```

Step 7 is safe precisely because of the write-before-deliver ordering in Part 04. Undelivered events are not lost events - they are already on disk.

# AI Notes

Do not write non-replay-grade events to SQLite. The output stream events alone would produce gigabytes per hour and drown the events that matter.

Do not let Replay hold a handle to any live service. Give it a `ReplayBus` with no publish method. Structure beats discipline - a replay that cannot reach the ExecutionEngine cannot re-run anything, no matter what a future implementer does.

Do not prune merge or permission events. Ever. They are the audit trail.

Do not use `synchronous = OFF` to make publishes faster. It trades the one property the log exists to provide.

Do not let a subscriber panic reach a publisher. Catch at the boundary, always.

Do not silently interpolate across a sequence gap during replay. Report the gap. A partial replay that says so is useful. One that invents history is dangerous.

Do not build a separate metrics path. Every number comes from events, or it cannot be trusted.

# Related Documents

- [[EventBus-Part04]]
- [[EventBus-Part06]]
- [[EventBus-Diagrams]]
- [[RuntimeManager-Part05]]
- [[MergeManager-Part01]]
- [[PermissionManager-Part01]]
