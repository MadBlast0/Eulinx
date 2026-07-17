---
title: EventBus Specification - Part 03
status: draft
version: 1.0
tags:
  - runtime
  - event-bus
  - delivery
related:
  - "[[EventBus-Part02]]"
  - "[[EventBus-Part04]]"
  - "[[RuntimeManager-Part01]]"
---

# EventBus Specification (Part 03)

# Purpose of This Part

This part defines who publishes, who subscribes, how topics match, and exactly what delivery guarantee each subscriber class gets.

# Publishers

Every runtime service is a publisher. No other code may publish.

```text
RuntimeManager      -> runtime.*
Scheduler           -> execution.node_queued, execution.node_blocked
ExecutionEngine     -> execution.*, worker.state_changed
WorkerSpawner       -> worker.spawned, worker.ready, worker.terminated
WorkspaceManager    -> runtime.workspace_bound
MemoryManager       -> memory.*
ArtifactManager     -> artifact.*
MergeManager        -> merge.*
LockManager         -> lock.*
PermissionManager   -> permission.*
ToolRegistry        -> tool.*
ProcessLifecycle    -> process.*
PluginHost          -> plugin.*
EventBus            -> eventbus.*
```

A service MUST publish only its own families. The LockManager MUST NOT publish `merge.applied`. If a service needs another family's event emitted, it calls that service, and that service publishes.

This rule is what makes the event log trustworthy. The publisher of a fact is the owner of that fact.

## The Publish API

```ts
type PublishResult =
  | { ok: true; eventId: string; sequence: number }
  | { ok: false; error: PublishError };

type PublishError =
  | { kind: "log_write_failed"; detail: string }
  | { kind: "bus_not_running"; state: EventBusState }
  | { kind: "payload_too_large"; sizeBytes: number; limitBytes: number }
  | { kind: "unknown_event_type"; type: string };

function publish(event: EulinxEventUnion): Promise<PublishResult>;
```

`publish` returns after the event is sequenced and, for replay-grade events, durably logged. It does NOT wait for subscribers. Delivery is asynchronous. A publisher never blocks on a subscriber.

Error handling per variant, exactly:

- `log_write_failed` - the caller MUST treat its own action as failed and roll back. A merge that cannot be logged MUST NOT be applied.
- `bus_not_running` - the caller MUST abort. This happens only during shutdown.
- `payload_too_large` - the caller MUST NOT retry with the same payload. Truncate the payload and publish a trimmed event. Limit is 256 KiB.
- `unknown_event_type` - programmer error. Panic in debug builds, log and drop in release builds.

# Subscribers

There are exactly three subscriber classes. Each has a different guarantee. Do not add a fourth.

```ts
type SubscriberKind = "core" | "ui" | "plugin";

type Subscription = {
  subscriptionId: string;
  kind: SubscriberKind;
  ownerId: string;
  filter: SubscriptionFilter;
  queueCapacity: number;
  deliveredCount: number;
  droppedCount: number;
  lastDeliveredSequence: number;
  state: "active" | "lagging" | "quarantined";
  createdAt: string;
};
```

## Core Subscribers

Core subscribers are trusted, in-process, and part of the Runtime itself.

```text
Replay Recorder
Metrics Tap
Log Writer
RuntimeManager health aggregator
```

Guarantee: **at-least-once, never dropped, ordered per source.**

A core subscriber that falls behind causes backpressure on publishers rather than a drop. If a core subscriber stalls permanently, the Runtime enters `failed`. That is correct - a Runtime that cannot record its own history MUST NOT keep running.

## UI Subscribers

The React UI, reached over the Tauri bridge. One logical subscriber regardless of how many components are mounted.

Guarantee: **at-most-once for non-replay-grade events, at-least-once for replay-grade events, batched, ordered per source.**

The UI may miss `worker.output_streamed` chunks under load. That is acceptable and expected. The UI MUST NOT miss `merge.applied`. Part 04 defines the split.

## Plugin Subscribers

Untrusted third-party code.

Guarantee: **best-effort, lossy, ordered per source, never blocking.**

A plugin subscriber MUST NOT be able to slow core delivery by any amount. Plugins read from a bounded queue that drops oldest-first when full. A plugin that cannot keep up loses events and is told so via `eventbus.subscriber_dropped_event`.

Rules the implementation MUST enforce:

- Plugin delivery runs on a separate task pool from core delivery.
- Plugin queue capacity is bounded and fixed at subscription time.
- A full plugin queue drops the oldest event, increments `droppedCount`, and continues.
- A plugin handler that exceeds `slowSubscriberTimeoutMs` is abandoned, not awaited.
- A plugin that is abandoned 3 times consecutively is quarantined.
- A quarantined plugin receives no further events until reloaded.
- A plugin panic is caught at the delivery boundary and never reaches a publisher.

# Subscription Filters

```ts
type SubscriptionFilter = {
  topics: string[];
  workspaceId?: WorkspaceId;
  sessionId?: SessionId;
  executionId?: ExecutionId;
  replayGradeOnly?: boolean;
};
```

All fields are ANDed. `topics` is ORed within itself.

An empty `topics` array matches nothing. It MUST NOT mean "match everything" - that default is a footgun that gives every plugin the whole firehose.

`workspaceId` is mandatory for plugin subscriptions. A plugin MUST NOT subscribe across Workspaces. Core subscribers MAY omit it.

# Topic Matching

Topic patterns support exactly two forms. Do not implement a regex matcher.

```text
"worker.spawned"     exact match, matches only that type
"worker.*"           family wildcard, matches every type in the worker family
```

`*` is valid only as the final segment and only as the entire segment.

```text
"worker.*"           valid
"*"                  valid - matches every event, core subscribers only
"*.failed"           INVALID - leading wildcard not supported
"worker.out*"        INVALID - partial segment wildcard not supported
"worker.*.chunk"     INVALID - mid-pattern wildcard not supported
```

Matching algorithm, transcribe directly:

```text
1. Split the pattern on "." into pattern segments.
2. Split the event type on "." into type segments.
3. If the pattern is exactly "*", return true.
4. If the last pattern segment is "*":
   a. Compare all pattern segments except the last against the type
      segments at the same index.
   b. If any differ, return false.
   c. Return true.
5. Otherwise compare pattern segments to type segments pairwise.
6. If the segment counts differ, return false.
7. If any pair differs, return false.
8. Return true.
```

A subscription matches an event when ANY topic pattern matches AND every set scope field equals the event's corresponding field.

# Delivery Guarantees Table

```text
Class    Replay-grade event   High-frequency event   Blocks publisher?
------   ------------------   --------------------   -----------------
core     never dropped        never dropped          yes, via backpressure
ui       never dropped        may drop, coalesced    no
plugin   may drop             may drop               no, ever
```

Read that table twice. The `plugin` row says a plugin MAY miss a replay-grade event. That is intentional. Replay does not depend on plugins. The Replay Recorder is a core subscriber, and it is the one that MUST NOT miss anything.

# Ordering

The EventBus guarantees **per-source ordering**, not global ordering.

If the WorkerSpawner publishes `worker.spawned` then `worker.ready`, every subscriber sees `spawned` before `ready`.

If the LockManager publishes `lock.granted` and the MergeManager publishes `merge.applied` concurrently, subscribers MAY see them in either relative order. Their sequence numbers are still globally unique and monotonic, so the log has a total order even though delivery does not.

Implementers MUST NOT try to provide global delivery ordering. It requires a single serialized delivery path, which reintroduces the head-of-line blocking this design exists to prevent.

When a subscriber needs causal order across sources, it MUST use `causationId`, not arrival order.

```ts
type CausalChain = {
  correlationId: string;
  causationId?: string;
};
```

`correlationId` groups every event belonging to one user-initiated operation. `causationId` points at the `eventId` of the event that directly caused this one. A subscriber can rebuild an exact causal tree from these two fields without depending on delivery order.

# Backpressure

Backpressure applies to core subscribers only. Plugins and the UI shed load instead.

```text
1. Publisher calls publish().
2. Bus sequences the event and writes the log if replay-grade.
3. Bus attempts to enqueue to each matching core subscriber queue.
4. If a core queue is at capacity:
   a. Emit eventbus.backpressure_engaged once per queue per second.
   b. Await queue space, up to slowSubscriberTimeoutMs.
   c. If space frees, enqueue and continue.
   d. If the timeout expires, mark the subscription "lagging"
      and emit runtime.service_health_changed to degraded.
   e. If a lagging core subscriber does not recover within 30 seconds,
      emit runtime.invariant_violated with fatal: true.
5. Bus attempts to enqueue to each matching plugin queue.
6. If a plugin queue is at capacity:
   a. Drop the oldest event in that queue.
   b. Increment droppedCount.
   c. Emit eventbus.subscriber_dropped_event.
   d. Never await. Never block.
7. Bus hands UI-bound events to the batcher, which never blocks.
8. publish() returns ok.
```

Step 4b is the only place a publisher can wait, and it can only wait on trusted in-process code with a bounded timeout. Step 6d is the rule that keeps untrusted code out of the critical path.

# Subscription API

```ts
function subscribe(
  kind: SubscriberKind,
  ownerId: string,
  filter: SubscriptionFilter,
  handler: (event: EulinxEventUnion) => Promise<void>
): SubscribeResult;

type SubscribeResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; error: SubscribeError };

type SubscribeError =
  | { kind: "invalid_topic_pattern"; pattern: string }
  | { kind: "empty_topics" }
  | { kind: "workspace_scope_required"; kind_: "plugin" }
  | { kind: "subscription_limit_reached"; limit: number }
  | { kind: "wildcard_not_permitted"; kind_: SubscriberKind };

function unsubscribe(subscriptionId: string): void;
```

`wildcard_not_permitted` is returned when a `ui` or `plugin` subscriber requests the `"*"` pattern. Only core subscribers may take the full firehose.

The plugin subscription limit is 32 patterns per plugin. The handler signature returns `Promise<void>` and the bus ignores the result. There is deliberately no way for a handler to signal refusal.

# AI Notes

Do not give plugins the same delivery path as core subscribers "for simplicity". Simplicity here means a hung plugin freezes the Runtime. The two paths are the whole point.

Do not implement `topics: []` as match-all. Implement it as match-nothing and reject it at `subscribe` time.

Do not await plugin handlers in the publish path. Do not await them in the core delivery path either. Spawn them onto the plugin pool and forget them.

Do not try to make delivery globally ordered. Use `sequence` for the log's total order and `causationId` for causal reconstruction.

Do not let a subscriber mutate the event it receives. Deliver an immutable snapshot - `Arc<EulinxEvent>` in Rust, a frozen object in TypeScript. Two subscribers seeing different payloads for the same `eventId` makes the log a lie.

# Related Documents

- [[EventBus-Part02]]
- [[EventBus-Part04]]
- [[EventBus-Part05]]
- [[EventBus-Diagrams]]
- [[RuntimeManager-Part01]]
