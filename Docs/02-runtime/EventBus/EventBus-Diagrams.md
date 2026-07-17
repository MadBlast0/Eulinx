---
title: EventBus Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - event-bus
  - diagrams
  - architecture
related:
  - "[[EventBus-Part01]]"
  - "[[EventBus-Part03]]"
  - "[[EventBus-Part04]]"
  - "[[EventBus-Part05]]"
---

# EventBus Diagrams

Every flow below is rendered four ways: overview, detailed mermaid, ASCII, and sequence.

## Publish and Fan Out

### Overview

```mermaid
flowchart TD
  PUB["Runtime Service"] --> BUS["EventBus"]
  BUS --> LOG["Event Log"]
  BUS --> OBS["Observers"]
```

### Detailed

```mermaid
flowchart TD
  SVC["Runtime Service"] -->|"publish"| SEQ["Assign Sequence and Event Id"]
  SEQ --> SIZE{"Payload under 256 KiB?"}
  SIZE -->|"No"| ERRSZ["PayloadTooLarge"]
  SIZE -->|"Yes"| GRADE{"Replay grade?"}
  GRADE -->|"Yes"| LOG["Write Event Log"]
  GRADE -->|"No"| ARC["Wrap in Arc"]
  LOG --> LOGOK{"Write succeeded?"}
  LOGOK -->|"No"| ERRLOG["LogWriteFailed - do not deliver"]
  LOGOK -->|"Yes"| ARC
  ARC --> CORE["Core Queue - send await"]
  ARC -.-> PLUG["Plugin Queue - try_send"]
  ARC -.-> UIB["UI Batcher - try_send"]
  CORE --> RPL["Replay Recorder"]
  CORE --> MET["Metrics Tap"]
  UIB -.-> IPC["Tauri Bridge"]
  IPC -.-> UI["React UI"]
  PLUG -.-> PLG["Plugin Subscribers"]
```

### ASCII

```text
Runtime Service
  |
  v
publish()
  |
  +-- 1. assign sequence + event id
  +-- 2. check payload size (256 KiB limit)
  +-- 3. if replay-grade: WRITE LOG (before delivery)
  |        |
  |        +-- write failed --> LogWriteFailed, NO delivery
  |
  +-- 4. wrap in Arc
  |
  +-- 5. core queue    send().await    guaranteed, may backpressure
  +-- 6. plugin queue  try_send()      lossy, NEVER blocks
  +-- 7. ui batcher    try_send()      coalesced, never blocks
  |
  v
return Ok(eventId, sequence)
```

### Sequence

```mermaid
sequenceDiagram
  participant SVC as "Runtime Service"
  participant BUS as "EventBus"
  participant LOG as "Event Log"
  participant CORE as "Core Subscriber"
  participant PLG as "Plugin Subscriber"
  participant UI as "React UI"

  SVC->>BUS: publish(event)
  BUS->>BUS: assign sequence and event id
  BUS->>LOG: write if replay grade
  LOG-->>BUS: committed
  BUS-->>SVC: Ok(eventId, sequence)
  BUS-)CORE: send await - guaranteed
  BUS-)PLG: try_send - lossy
  BUS-)UI: try_send to batcher
  Note over BUS,PLG: publish never awaits the plugin
```

## Subscriber Classes and Guarantees

### Overview

```mermaid
flowchart LR
  BUS["EventBus"] --> CORE["Core - guaranteed"]
  BUS -.-> UI["UI - batched"]
  BUS -.-> PLUG["Plugin - lossy"]
```

### Detailed

```mermaid
flowchart TD
  EVT["Event"] --> MATCH["Topic and Scope Match"]
  MATCH --> CQ["Core Queue - bounded"]
  MATCH --> UQ["UI Queue - bounded"]
  MATCH --> PQ["Plugin Queue - bounded"]
  CQ -->|"full"| CBP["Backpressure - await with timeout"]
  CBP -->|"timeout"| CLAG["Mark lagging - degrade Runtime"]
  CLAG -->|"30s no recovery"| CFATAL["runtime.invariant_violated fatal"]
  UQ -->|"full"| UCO["Coalesce and drop non replay grade"]
  PQ -->|"full"| PDROP["Drop oldest - never wait"]
  PDROP -.-> PEVT["eventbus.subscriber_dropped_event"]
  PDROP -->|"3 abandoned calls"| PQUAR["plugin.quarantined"]
```

### ASCII

```text
Class    Replay-grade event   High-frequency event   Blocks publisher?
------   ------------------   --------------------   -----------------
core     never dropped        never dropped          yes, via backpressure
ui       never dropped        may drop, coalesced    no
plugin   may drop             may drop               no, ever

Channel usage is mechanical:
  core_tx    -> send().await    (trusted, bounded timeout)
  plugin_tx  -> try_send()      (untrusted, drop on Full)
  ui_tx      -> try_send()      (coalesce on Full)
```

### Sequence

```mermaid
sequenceDiagram
  participant BUS as "EventBus"
  participant CORE as "Core Subscriber"
  participant PLG as "Slow Plugin"

  BUS->>CORE: send(event).await
  CORE-->>BUS: accepted
  BUS->>PLG: try_send(event)
  PLG-->>BUS: Err(Full)
  BUS->>BUS: drop oldest, increment droppedCount
  BUS-)CORE: eventbus.subscriber_dropped_event
  Note over BUS,PLG: core delivery never waited on the plugin
```

## Transport to the UI

### Overview

```mermaid
flowchart LR
  BUS["Rust Core Bus"] --> BAT["UI Batcher"]
  BAT -.-> BR["Tauri Bridge"]
  BR -.-> RX["React Reducer"]
```

### Detailed

```mermaid
flowchart TD
  EVT["Event"] --> HF{"High frequency type?"}
  HF -->|"Yes"| COAL["Coalesce by source key"]
  HF -->|"No"| OPEN["Append to open batch"]
  COAL --> CAP{"Chunk over 64 KiB?"}
  CAP -->|"Yes"| TRUNC["Keep last 64 KiB - set truncatedBytes"]
  CAP -->|"No"| OPEN
  TRUNC --> OPEN
  OPEN --> FLUSH{"Flush now?"}
  FLUSH -->|"50 ms elapsed"| EMIT["Emit Eulinx://events"]
  FLUSH -->|"200 events"| EMIT
  FLUSH -->|"merge or permission event"| EMIT
  FLUSH -->|"No"| WAIT["Hold batch"]
  EMIT -.-> BRIDGE["Tauri emit - one batch"]
  BRIDGE -.-> LISTEN["React listen"]
  LISTEN --> DISP["Single dispatch per batch"]
```

### ASCII

```text
Rust core bus
  |
  v
UI Batcher
  |
  +-- coalesce worker.output_streamed by (type, workerId, channel)
  |     -> append chunk strings, cap at 64 KiB
  +-- coalesce execution.progress_reported by executionId
  |     -> REPLACE, newest wins
  |
  +-- flush when: 50 ms elapsed
  |            OR 200 events buffered
  |            OR replay-grade event arrives (immediate)
  |
  v
Tauri emit("Eulinx://events", EventBatch)   <-- ONE emit per batch
  |
  v
React listen -> ONE dispatch per batch -> reducer
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant BUS as "EventBus"
  participant BAT as "UI Batcher"
  participant UI as "React UI"

  loop "many chunks in 50 ms"
    W->>BUS: worker.output_streamed
    BUS-)BAT: try_send
    BAT->>BAT: coalesce into open batch
  end
  BAT-)UI: emit Eulinx://events with one batch
  UI->>UI: single dispatch, single render
  W->>BUS: merge.applied
  BUS-)BAT: try_send
  BAT-)UI: immediate flush - no 50 ms wait
```

## Replay

### Overview

```mermaid
flowchart LR
  LOG["Event Log"] --> RB["ReplayBus"]
  RB --> SUB["Replay Subscribers"]
```

### Detailed

```mermaid
flowchart TD
  REQ["ReplayRequest"] --> LOAD["Load range ordered by sequence"]
  LOAD --> GAP{"Sequence gaps?"}
  GAP -->|"Yes"| PART["Mark partial - report gap range"]
  GAP -->|"No"| FULL["Mark complete"]
  PART --> RBUS["ReplayBus"]
  FULL --> RBUS
  RBUS --> DEL["Deliver in sequence order - synchronous"]
  DEL --> STATE["Reconstructed State"]
  RBUS -.-> NOPE["No publish - no service handles - no locks"]
```

### ASCII

```text
ReplayRequest (workspaceId, fromSequence, toSequence)
  |
  v
SELECT * FROM event_log WHERE ... ORDER BY sequence ASC
  |
  +-- verify no sequence gaps
  |     gap found --> mark "partial", report range, DO NOT interpolate
  |
  v
ReplayBus
  |
  +-- has: events, cursor, replay subscribers
  +-- LACKS: publish(), log handle, service handles
  |
  v
Deliver in sequence order, synchronously, globally ordered
  |
  v
Reconstructed state = pure function of the event range

Replay MUST NOT: publish, spawn Workers, invoke Tools,
                 acquire locks, apply merges, write the log,
                 mutate any Project file.
```

### Sequence

```mermaid
sequenceDiagram
  participant U as "User"
  participant RM as "RuntimeManager"
  participant LOG as "Event Log"
  participant RB as "ReplayBus"
  participant V as "Replay Viewer"

  U->>RM: replay execution exe_7f3a
  RM->>LOG: SELECT ordered by sequence
  LOG-->>RM: events 101..126
  RM->>RB: construct with events
  Note over RB: no publish method exists
  loop "each event in sequence order"
    RB->>V: deliver(event)
    V->>V: fold into reconstructed state
  end
  RB-->>U: replay complete
```

## Failure Handling

### Overview

```mermaid
flowchart TD
  F["Failure"] --> C["Core - escalate loudly"]
  F --> P["Plugin - contain silently"]
```

### Detailed

```mermaid
flowchart TD
  FAIL["Subscriber Failure"] --> KIND{"Subscriber class?"}
  KIND -->|"core"| CSLOW["Backpressure and mark lagging"]
  CSLOW --> CDEG["runtime.service_health_changed degraded"]
  CDEG -->|"30s no recovery"| CFAIL["runtime.invariant_violated fatal"]
  CFAIL --> RFAIL["Runtime state failed"]
  KIND -->|"plugin"| PDROP["Drop oldest - never wait"]
  PDROP -->|"3 abandoned or panics"| PQ["plugin.quarantined"]
  PQ --> PCONT["Runtime continues normally"]
  LOGF["Log Write Failed"] --> LRB["Publisher rolls back"]
  LRB --> LDEG["Runtime degraded"]
  LDEG -->|"3 consecutive failures"| LSTOP["Runtime failed - stop new Executions"]
```

### ASCII

```text
Slow subscriber
  core   -> backpressure, mark lagging, degrade
            30s no recovery -> invariant_violated fatal -> Runtime failed
  ui     -> coalesce, drop non-replay-grade, set droppedSinceLastBatch
  plugin -> drop oldest immediately, 3 abandoned calls -> quarantine

Dropped event
  replay-grade + core   -> invariant violation, Runtime FAILED
  replay-grade + plugin -> permitted, log and continue
  drop events rate limited to 1 per subscription per second

Subscriber panic
  caught at the delivery boundary, ALWAYS
  publisher NEVER observes it
  core   x3 consecutive -> invariant_violated fatal
  plugin x3 consecutive -> quarantine, unsubscribe all
  counter resets on any successful delivery

Log write failure
  publisher MUST roll back its operation
  3 consecutive -> Runtime failed, no new Executions
  Eulinx stops rather than acting without an audit trail
```

### Sequence

```mermaid
sequenceDiagram
  participant SVC as "MergeManager"
  participant BUS as "EventBus"
  participant LOG as "Event Log"
  participant RM as "RuntimeManager"

  SVC->>BUS: publish(merge.applied)
  BUS->>LOG: write
  LOG-->>BUS: write failed
  BUS-)RM: eventbus.log_write_failed
  BUS-->>SVC: Err(LogWriteFailed)
  SVC->>SVC: roll back the merge
  RM->>RM: Runtime state to degraded
  Note over SVC,RM: an unlogged merge is never applied
```

## Related Documents

- [[EventBus-Part01]]
- [[EventBus-Part02]]
- [[EventBus-Part03]]
- [[EventBus-Part04]]
- [[EventBus-Part05]]
- [[EventBus-Part06]]
- [[02-runtime/README]]
