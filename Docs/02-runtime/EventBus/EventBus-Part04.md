---
title: EventBus Specification - Part 04
status: draft
version: 1.0
tags:
  - runtime
  - event-bus
  - ipc
related:
  - "[[EventBus-Part03]]"
  - "[[EventBus-Part05]]"
  - "[[RuntimeManager-Part04]]"
---

# EventBus Specification (Part 04)

# Purpose of This Part

This part defines the physical transport: the Rust core bus, the Tauri bridge to the React UI, channel types, serialization, batching, and throttling.

Part 03 defined the contract. This part defines the wires.

# Transport Topology

```text
Rust core process
  |
  +-- Core bus            in-process, tokio broadcast + mpsc
  +-- Core subscribers    in-process, direct channel
  +-- Plugin subscribers  in-process, separate task pool, bounded mpsc
  +-- UI batcher          in-process, accumulates then flushes
        |
        v
      Tauri event bridge  serialize to JSON, emit to webview
        |
        v
      React UI            window listener, reducer, React state
```

There is exactly one bus. It lives in Rust. The UI is a subscriber, not a peer.

The React side MUST NOT have its own event bus that services publish into. If a UI component needs to know something, it subscribes to the Rust bus through the bridge. A second bus means two sources of truth and Replay can only trust one.

# Channel Types

Each subscriber class uses a different channel type, chosen for its overflow behavior.

```rust
pub struct EventBusChannels {
    /// Core subscribers. Bounded. Sender awaits when full.
    /// Backpressure is intentional here - core subscribers are trusted.
    core_tx: tokio::sync::mpsc::Sender<Arc<EulinxEvent>>,

    /// Plugin subscribers. Bounded. Sender NEVER awaits.
    /// try_send only. On Full, drop oldest and continue.
    plugin_tx: tokio::sync::mpsc::Sender<Arc<EulinxEvent>>,

    /// UI batcher input. Bounded, generous capacity.
    /// try_send only. On Full, coalesce per Throttling rules below.
    ui_tx: tokio::sync::mpsc::Sender<Arc<EulinxEvent>>,
}
```

The rule is mechanical and MUST be followed exactly:

```text
core_tx    -> use send().await      (may block publisher, bounded by timeout)
plugin_tx  -> use try_send()        (never blocks, drops on Full)
ui_tx      -> use try_send()        (never blocks, coalesces on Full)
```

If an implementer writes `plugin_tx.send().await`, the untrusted subscriber rule from Part 01 is broken and a plugin can stall the Runtime. This single line is the most important line in the EventBus implementation.

Events are wrapped in `Arc<EulinxEvent>` so cloning to N subscribers is a refcount bump, not a deep copy. Subscribers receive an immutable shared reference. There is no `Arc<Mutex<EulinxEvent>>` anywhere - a mutable event is a corrupt log.

# The Rust Core Bus

```rust
pub struct EventBus {
    sequence: AtomicU64,
    subscribers: RwLock<HashMap<SubscriptionId, Subscription>>,
    channels: EventBusChannels,
    log: Arc<EventLog>,
    metrics: Arc<EventBusMetrics>,
    config: EventBusConfig,
    state: RwLock<EventBusState>,
}

impl EventBus {
    pub async fn publish(&self, event: EulinxEvent) -> Result<PublishResult, PublishError>;
    pub fn subscribe(&self, req: SubscribeRequest) -> Result<SubscriptionId, SubscribeError>;
    pub fn unsubscribe(&self, id: SubscriptionId);
    pub fn metrics(&self) -> EventBusMetricsSnapshot;
}
```

Publish algorithm, numbered for direct transcription:

```text
1. Read state. If not Running, return PublishError::BusNotRunning.
2. Serialize the payload. If over 256 KiB, return PublishError::PayloadTooLarge.
3. seq = sequence.fetch_add(1, Ordering::SeqCst).
4. Stamp the event with seq, a UUIDv7 event_id, and emitted_at.
5. If event.replay_grade:
   a. Write the event to the log synchronously.
   b. If the write fails, return PublishError::LogWriteFailed. Do NOT deliver.
6. Wrap the event in Arc.
7. For each matching core subscription: core_tx.send(arc.clone()).await
   with a slow_subscriber_timeout_ms deadline. Apply Part 03 backpressure.
8. For each matching plugin subscription: plugin_tx.try_send(arc.clone()).
   On Err(Full), drop oldest, increment dropped, emit subscriber_dropped_event.
9. If any UI subscription matches: ui_tx.try_send(arc.clone()).
   On Err(Full), apply coalescing rules.
10. Increment metrics.published. Return Ok.
```

Step 5 before step 7 is deliberate. The log is written before delivery, not after. If the process dies between 5 and 7, the event is in the log and Replay is intact. If it were written after delivery, a crash would produce events the UI saw but Replay never recorded.

`sequence.fetch_add` with `SeqCst` gives the monotonic total order from Part 01's invariants. Do not use `Relaxed` here to save a few nanoseconds - the ordering guarantee is the product.

# Serialization

Payloads cross the Tauri bridge as JSON. Serialization MUST be deterministic.

```text
Rules:
1. Use serde with #[serde(rename_all = "camelCase")].
2. Object keys MUST be emitted in declaration order, not sorted at random.
3. Timestamps MUST be RFC3339 UTC strings with millisecond precision.
4. Floats MUST NOT appear in replay-grade payloads. Use integers or strings.
   costUsd is serialized as an integer count of micro-dollars.
5. Binary data MUST NOT appear in a payload. Reference it by content hash.
6. Optional fields that are None MUST be omitted, not emitted as null.
7. Enums serialize as lowercase snake_case string tags.
```

Rule 4 exists because floats are not stable across platforms and Replay compares payloads for equality. A `costUsd: 0.1 + 0.2` that serializes as `0.30000000000000004` on one machine and `0.3` on another breaks Replay verification. Integers do not have this problem.

```rust
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkerCompletedPayload {
    pub worker_id: String,
    pub produced_artifact_ids: Vec<String>,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub cost_micro_usd: u64,
    pub duration_ms: u64,
}
```

# The Tauri Event Bridge

```rust
pub fn install_ui_bridge(app: &AppHandle, bus: Arc<EventBus>) {
    let handle = app.clone();
    bus.subscribe(SubscribeRequest {
        kind: SubscriberKind::Ui,
        owner_id: "ui-bridge".into(),
        filter: SubscriptionFilter::ui_default(),
        handler: Box::new(move |batch: EventBatch| {
            let _ = handle.emit("Eulinx://events", &batch);
        }),
    });
}
```

The bridge emits exactly one Tauri event name: `Eulinx://events`. It carries a batch, never a single event.

Implementers MUST NOT emit one Tauri event per Eulinx event. Each `emit` crosses the webview boundary and serializes independently. At 2000 output chunks per second across 8 Workers, per-event emit will pin a CPU core and drop the UI to single-digit frames per second. Batching is not an optimization here, it is a requirement.

```ts
type EventBatch = {
  batchId: string;
  events: EulinxEventUnion[];
  firstSequence: number;
  lastSequence: number;
  droppedSinceLastBatch: number;
  emittedAt: string;
};
```

`droppedSinceLastBatch` tells the UI it is looking at an incomplete stream so it can render a "output truncated" marker instead of silently lying to the user.

React side:

```ts
import { listen } from "@tauri-apps/api/event";

useEffect(() => {
  const unlisten = listen<EventBatch>("Eulinx://events", (msg) => {
    dispatch({ type: "events/batch", payload: msg.payload });
  });
  return () => { unlisten.then((f) => f()); };
}, []);
```

The reducer MUST apply a whole batch in one dispatch. One dispatch per event causes one React render per event, which defeats the batching entirely.

# Batching

```text
1. The batcher holds an open batch and a flush timer.
2. On event arrival, append to the open batch.
3. Flush when EITHER:
   a. ui_batch_interval_ms elapses since the batch opened, OR
   b. the batch reaches ui_batch_max_size events.
4. On flush, emit the batch and open a new empty one.
5. If the open batch is empty when the timer fires, do not emit.
6. Replay-grade events force an immediate flush - see below.
```

```ts
const DEFAULT_CONFIG = {
  uiBatchIntervalMs: 50,
  uiBatchMaxSize: 200,
};
```

50 ms is chosen because it is below the ~100 ms threshold at which a UI feels laggy, and above the 16 ms frame budget, so at most one flush per three frames.

Replay-grade events bypass the timer and flush immediately with the current batch. A user clicking Approve MUST NOT wait 50 ms to see the merge land, and more importantly `merge.applied` must never sit in a buffer that a crash could discard.

```text
Immediate-flush event families:
  merge.*
  permission.*
  runtime.*
  execution.completed, execution.failed, execution.cancelled
  worker.failed
```

# Throttling High-Frequency Events

Three event types carry the overwhelming majority of volume:

```text
worker.output_streamed
process.output_streamed
execution.progress_reported
```

These MUST be coalesced before reaching the UI. Coalescing rules are per type and exact.

## Output Stream Coalescing

```text
1. Key open output events by (event_type, workerId or processId, channel).
2. On arrival, if an event with the same key is already in the open batch:
   a. Append the new chunk string to the existing event's chunk field.
   b. Set chunkIndex to the new event's chunkIndex.
   c. Do NOT append a second event to the batch.
3. Otherwise append as a new event.
4. If a coalesced chunk field exceeds 64 KiB:
   a. Keep the last 64 KiB.
   b. Set truncatedBytes on the event to the number of bytes discarded.
```

Ten thousand small chunks from one Worker in a 50 ms window become one batch entry with one concatenated string. The UI appends one string to one terminal buffer instead of running ten thousand state updates.

## Progress Coalescing

```text
1. Key progress events by (event_type, executionId).
2. On arrival, if an event with the same key is in the open batch,
   REPLACE it entirely with the newer event.
3. Progress is absolute, not incremental, so the newest value wins
   and older values carry no information.
```

## Rate Limiting

If a single source exceeds 500 events per second sustained over 2 seconds, the bus MUST rate limit that source's non-replay-grade events to 100 per second and emit `eventbus.backpressure_engaged` once.

Replay-grade events from the same source are NEVER rate limited. A Worker producing pathological output volume MUST still be able to report that it failed.

# Serialization Cost Rule

The bus MUST serialize a payload at most once per transport, not once per subscriber.

```text
Wrong: for each ui subscriber { serde_json::to_string(&event) }
Right: serialize the batch once, emit once
```

Core and plugin subscribers are in-process and receive `Arc<EulinxEvent>` with no serialization at all. Only the Tauri bridge serializes, and only per batch.

# AI Notes

Do not use `plugin_tx.send().await`. Use `try_send`. This is the single most common way to break the EventBus, and it will look completely fine until a plugin gets slow in production.

Do not emit one Tauri event per Eulinx event. Batch. The UI will melt otherwise, and it will melt exactly when the system is busiest and the user most needs to see what is happening.

Do not put floats in replay-grade payloads. Use micro-dollars and integer milliseconds.

Do not create a second event bus in React. The Rust bus is the only bus. React is a subscriber.

Do not dispatch one React action per event in a batch. Apply the batch in a single reducer call.

Do not skip `droppedSinceLastBatch`. A UI that silently drops output is worse than one that admits it, because the user will trust the incomplete view.

# Related Documents

- [[EventBus-Part03]]
- [[EventBus-Part05]]
- [[EventBus-Diagrams]]
- [[RuntimeManager-Part04]]
- [[ProcessLifecycle-Part01]]
