---
title: EventBus Specification - Part 06
status: draft
version: 1.0
tags:
  - runtime
  - event-bus
  - checklist
related:
  - "[[EventBus-Part01]]"
  - "[[EventBus-Part05]]"
  - "[[02-runtime/README]]"
---

# EventBus Specification (Part 06)

# Implementation Checklist

Build in this order. Each group depends on the one before it.

## Core Types

- [ ] Define `EulinxEvent<TType, TPayload>` with every field from Part 01
- [ ] Define every payload type from Part 02, field for field
- [ ] Define the `EulinxEventUnion` with all 80 variants from Part 02
- [ ] Define `EventSource`, `FailureInfo`, `RuntimeServiceName`
- [ ] Define `EventBusConfig` with the defaults from Part 04
- [ ] Add `#[serde(rename_all = "camelCase")]` to every payload struct
- [ ] Replace every float field with an integer per Part 04 serialization rule 4
- [ ] Mirror all types into TypeScript with identical field names
- [ ] Write a test asserting the Rust and TypeScript unions have the same variants

## Sequencing and Log

- [ ] Create the `event_log` table with the Part 05 schema and all four indexes
- [ ] Set `journal_mode = WAL` and `synchronous = NORMAL`
- [ ] Implement `AtomicU64` sequence counter with `Ordering::SeqCst`
- [ ] Implement UUIDv7 event id generation
- [ ] Implement the batched log writer (10 ms / 100 events / merge-permission flush)
- [ ] Make replay-grade `publish()` await the COMMIT that includes its event
- [ ] Implement `PublishError::LogWriteFailed` and verify it prevents delivery
- [ ] Write a test that a killed process leaves no delivered-but-unlogged event

## Channels

- [ ] Create `core_tx` as a bounded `mpsc::Sender`, used with `send().await`
- [ ] Create `plugin_tx` as a bounded `mpsc::Sender`, used with `try_send()` ONLY
- [ ] Create `ui_tx` as a bounded `mpsc::Sender`, used with `try_send()` ONLY
- [ ] Add a lint, test, or code review rule forbidding `plugin_tx.send().await`
- [ ] Wrap events in `Arc<EulinxEvent>` before fan-out
- [ ] Verify no `Arc<Mutex<EulinxEvent>>` exists anywhere
- [ ] Run plugin delivery on a task pool separate from core delivery

## Publish and Subscribe

- [ ] Implement `publish()` following Part 04's 10 numbered steps exactly
- [ ] Enforce the 256 KiB payload limit
- [ ] Implement `subscribe()` with every `SubscribeError` variant
- [ ] Reject `topics: []` with `empty_topics`
- [ ] Reject `"*"` for `ui` and `plugin` subscribers
- [ ] Require `workspaceId` on every plugin subscription
- [ ] Enforce the 32-pattern limit per plugin
- [ ] Implement topic matching with Part 03's 8-step algorithm
- [ ] Reject `*.failed`, `worker.out*`, and `worker.*.chunk` as invalid patterns
- [ ] Implement `unsubscribe()` and verify queues are freed

## Delivery and Backpressure

- [ ] Implement Part 03's 8-step backpressure algorithm
- [ ] Implement core backpressure with `slow_subscriber_timeout_ms`
- [ ] Implement plugin drop-oldest on full queue
- [ ] Emit `eventbus.backpressure_engaged` at most once per queue per second
- [ ] Emit `eventbus.subscriber_dropped_event` on every drop
- [ ] Rate limit drop events to 1 per subscription per second
- [ ] Wrap every handler call in a panic boundary
- [ ] Verify a panicking subscriber never affects the publisher
- [ ] Implement the 3-consecutive-panic quarantine for plugins
- [ ] Implement the 3-consecutive-panic fatal escalation for core subscribers
- [ ] Reset panic counters on successful delivery

## UI Bridge

- [ ] Implement the `UiBatcher` with the 6-step Part 04 algorithm
- [ ] Set `uiBatchIntervalMs = 50`, `uiBatchMaxSize = 200`
- [ ] Implement immediate flush for merge, permission, runtime families
- [ ] Implement output stream coalescing keyed by source and channel
- [ ] Implement the 64 KiB coalesced chunk cap with `truncatedBytes`
- [ ] Implement progress coalescing by replacement, not append
- [ ] Implement the 500-per-second source rate limit
- [ ] Verify replay-grade events are never rate limited
- [ ] Emit exactly one Tauri event name: `Eulinx://events`
- [ ] Verify the bridge emits batches, never single events
- [ ] Populate `droppedSinceLastBatch` on every batch
- [ ] Implement the React `listen` hook with a single batch dispatch
- [ ] Verify the reducer applies a whole batch in one dispatch
- [ ] Verify no second event bus exists in React

## Replay

- [ ] Implement `ReplayBus` with no publish method and no service handles
- [ ] Implement sequence-ordered loading for a range
- [ ] Implement gap detection and the "partial" replay marker
- [ ] Verify replay delivery is globally ordered and synchronous
- [ ] Verify replay cannot spawn Workers, invoke Tools, or apply merges
- [ ] Write a test that replaying the same range twice yields identical state

## Retention and Metrics

- [ ] Implement the 5-step prune algorithm from Part 05
- [ ] Verify merge and permission events are never pruned
- [ ] Verify a full log degrades rather than pruning protected events
- [ ] Implement metrics taps as pure aggregation core subscribers
- [ ] Derive every field of `RuntimeMetricsSnapshot` from events only
- [ ] Verify no separate metrics instrumentation path exists

## Shutdown

- [ ] Implement the 8-step drain from Part 05
- [ ] Reject publishes in `Draining` with `BusNotRunning`
- [ ] Flush the log transaction and the UI batch on drain
- [ ] Drop plugin queues immediately without delivery
- [ ] Force stop after 5 seconds and log the residual count

# Worked Examples

## Example 1: A Worker Produces a Patch That Gets Merged

A user asks a Worker to fix a null check in `src/auth/session.ts`. This is the full event sequence, with real values.

```text
seq  type                        key payload fields
---  --------------------------  ------------------------------------------
101  execution.started           executionId: "exe_7f3a", plannedNodeCount: 1
102  execution.node_queued       nodeId: "node_1", priority: 5
103  permission.requested        capability: "worker.spawn", target: "claude-opus-4"
104  permission.granted          grantedBy: "profile", profileId: "prof_default"
105  worker.spawned              workerId: "wkr_9c21", spawnDurationMs: 340
106  worker.ready                readyAt: "2026-07-17T10:12:04.881Z"
107  execution.node_started      nodeId: "node_1", workerId: "wkr_9c21", attempt: 1
108  lock.requested              resource: "src/auth/session.ts", mode: "exclusive"
109  lock.granted                lockId: "lck_44b", waitedMs: 2
110  tool.invoked                toolId: "tool_read_file", callerId: "wkr_9c21"
111  tool.succeeded              durationMs: 12
 -   worker.output_streamed      NOT LOGGED - coalesced to UI only
112  artifact.created            artifactId: "art_5e8", kind: "patch",
                                 targetPaths: ["src/auth/session.ts"],
                                 contentHash: "sha256:9a2f..."
113  worker.completed            tokensIn: 8420, tokensOut: 512,
                                 costMicroUsd: 94000, durationMs: 11200
114  artifact.verified           checks: ["syntax", "tests", "boundary"]
115  lock.released               heldMs: 11340
116  merge.requested             mergeId: "mrg_2d1", requiresApproval: true
117  merge.approval_required     reason: "policy_requires_review"
118  permission.prompt_shown     requestId: "req_88a"
119  ui.user_action              action: "approve_merge"    <-- mirror only
120  merge.approved              approvedBy: "user"          <-- authoritative
121  lock.requested              resource: "src/auth/session.ts", mode: "exclusive"
122  lock.granted                lockId: "lck_45c", waitedMs: 0
123  merge.applied               changedPaths: ["src/auth/session.ts"],
                                 commitId: "a3f9c21", durationMs: 84
124  lock.released               heldMs: 91
125  execution.node_completed    nodeId: "node_1", artifactIds: ["art_5e8"]
126  execution.completed         outcome: "success", totalCostMicroUsd: 94000
```

Points an implementer must notice:

Sequence 112 is `artifact.created`, not a file write. The Worker produced an Artifact. Nothing in the Project changed yet.

Sequence 123 is the only event where trusted state changed. Eleven events separate the AI's output from its application, and every one of them is a gate.

Sequence 119 is a mirror. Sequence 120 is the truth. A replay reconstructing "who approved this" reads 120 and ignores 119.

The `worker.output_streamed` events between 111 and 112 are absent from the log entirely. The user watched them stream in the terminal at 50 ms batches. Replay does not need them, so they were never written.

Locks are acquired twice (108, 121) and released twice (115, 124). The Worker's lock is released before the merge requests its own. Holding one lock across both phases would block every other Worker for the entire duration of a human approval.

## Example 2: A Slow Plugin During a Busy Build

Eight Workers run a test suite. A telemetry plugin subscribes to `worker.*` and blocks 200 ms on every event writing to a remote endpoint.

```text
t=0ms     8 workers publishing ~2000 worker.output_streamed per second
t=0ms     plugin queue capacity 1024, drains at 5 events/sec
t=205ms   plugin queue full
t=205ms   bus calls plugin_tx.try_send() -> Err(Full)
t=205ms   bus drops oldest, increments droppedCount, continues
t=205ms   eventbus.subscriber_dropped_event emitted, reason: "queue_full"
t=1205ms  second drop event emitted (rate limited to 1/sec)
t=3400ms  plugin handler exceeds slowSubscriberTimeoutMs, abandoned (1/3)
t=3600ms  plugin handler abandoned (2/3)
t=3800ms  plugin handler abandoned (3/3)
t=3800ms  plugin.quarantined emitted, reason: "slow_subscriber",
          droppedEvents: 18442
t=3800ms  every subscription owned by the plugin is removed
```

What happened to everything else:

```text
Core subscribers:  unaffected. Zero dropped. Replay log complete.
UI:                unaffected. Still batching at 50 ms.
Workers:           unaffected. Zero added latency.
Publishers:        unaffected. publish() never awaited the plugin.
Runtime state:     "degraded" while shedding, back to "running" after quarantine.
Merge events:      all delivered to core, all logged, all applied normally.
```

The plugin lost 18442 events and got quarantined. The Runtime did not stutter.

Now trace the one-line bug. If an implementer had written `plugin_tx.send().await` instead of `try_send()`:

```text
t=205ms   plugin queue full
t=205ms   publish() awaits queue space
t=205ms   the publishing Worker's task is now blocked on a plugin
t=405ms   next plugin handler completes, one slot frees, publish() returns
t=405ms   next publish() blocks again immediately
          ...
Result:   every Worker throttled to the plugin's 5 events/sec.
          An 11-second build becomes a 40-minute build.
          Merges wait behind telemetry writes.
          Untrusted third-party code now controls Eulinx's throughput.
```

One `.await` is the entire difference. This is why Part 04 makes the channel type mechanical rather than a judgement call.

# Common Mistakes

**Using `send().await` on the plugin channel.** The single worst bug available in this component. It looks correct, passes every test with a fast plugin, and hands throughput control to untrusted code the moment a plugin gets slow.

**Emitting one Tauri event per Eulinx event.** Works perfectly with 1 Worker and destroys the UI with 8. Always batch.

**Treating `artifact.created` as "the file changed".** It is not. Only `merge.applied` means trusted state changed. Confusing these violates the most important rule in Eulinx.

**Making `ui.user_action` authoritative.** It is a mirror for telemetry. The owning service publishes the real decision. Reconstructing approvals from `ui.*` events means the UI could forge an approval.

**Writing output stream events to SQLite.** Gigabytes per hour of data Replay does not need, drowning the events it does.

**Letting handlers return a value.** The instant a handler can return "no", the EventBus is a permission system competing with the PermissionManager.

**Using floats in replay-grade payloads.** `0.1 + 0.2` serializes differently across platforms and breaks replay equality. Micro-dollars and integer milliseconds.

**Delivering mutable events.** Two subscribers seeing different payloads for one `eventId` makes the log a lie. `Arc<EulinxEvent>`, never `Arc<Mutex<EulinxEvent>>`.

**Publishing from inside a LockManager lock.** The bus and the lock graph deadlock under load. Release, then publish.

**Silently interpolating replay gaps.** A partial replay that announces itself is useful. One that invents history is worse than none.

**Building a second bus in React.** Two sources of truth, and Replay can only trust one.

**Pruning merge or permission events to save disk.** Destroys the audit trail to solve a problem disk space already solved.

**Global delivery ordering.** Reintroduces the head-of-line blocking the whole design exists to prevent. Use `sequence` for log order and `causationId` for causality.

# Future Expansion

## Remote Subscribers

A future Eulinx may stream events to a remote dashboard or a team server. The subscriber classes already model this: a remote subscriber is a `plugin`-class subscriber with a network transport. It is untrusted, lossy, and cannot block core delivery. No change to the core bus is required, only a new transport.

## Event Schema Versioning

The catalog will change. When it does, add `schemaVersion: number` to `EulinxEvent` and version payloads independently. Replay MUST then be able to read old payload shapes. Add an `EventMigration` trait mapping version N to N+1, and run migrations on read, never on the stored rows. The log is append-only, and that MUST survive schema evolution.

## Selective Replay

Currently replay covers a sequence range. A future version could replay a `correlationId` subtree, reconstructing exactly one user operation and its causal descendants. The `correlationId` and `causationId` fields already carry the necessary structure and are indexed.

## Event Log Compaction

Rather than pruning old events outright, compact runs of related events into a summary event. Ten thousand `execution.node_completed` events for one Execution become one `execution.summarized` event with aggregates. This keeps long-term history at lower resolution instead of deleting it. Compaction MUST NOT touch merge or permission events.

## Cross Workspace Observability

Currently plugin subscriptions are scoped to one Workspace. A future admin view may want a cross-Workspace event feed. This requires a new capability (`eventbus.observe_all_workspaces`) gated by the PermissionManager and MUST default to denied. Do not relax the Part 03 scoping rule to enable this - add an explicit capability instead.

# Related Documents

- [[EventBus-Part01]]
- [[EventBus-Part02]]
- [[EventBus-Part03]]
- [[EventBus-Part04]]
- [[EventBus-Part05]]
- [[EventBus-Diagrams]]
- [[02-runtime/README]]
