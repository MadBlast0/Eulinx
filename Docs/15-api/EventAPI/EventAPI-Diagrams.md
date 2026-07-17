---
title: EventAPI Diagrams
status: draft
version: 1.0
tags:
  - api
  - event-api
  - diagrams
related:
  - "[[EventAPI-Part01]]"
  - "[[EventAPI-Part02]]"
  - "[[EventAPI-Part03]]"
  - "[[EventAPI-Part04]]"
  - "[[EventAPI-Part05]]"
  - "[[15-api/README]]"
  - "[[EventBus-Diagrams]]"
  - "[[IPC-Diagrams]]"
---

# EventAPI Diagrams

Every flow below is rendered as overview mermaid, detailed mermaid, ASCII, and sequence.

## Event Lifecycle

### Overview

```mermaid
flowchart LR
  SVC["Service"] --> EB["EventBus"]
  EB --> LOG["Log (if replay-grade)"]
  EB --> CORE["Core"]
  EB --> UI["UI Batcher"]
  EB -.-> PLUG["Plugin (lossy)"]
```

### Detailed

```mermaid
flowchart TD
  SVC["Service"] -->|"publish"| BUS["EventBus"]
  BUS --> SEQ["assign event_id + sequence"]
  SEQ --> GRADE{"replay_grade?"}
  GRADE -->|"Yes"| LOG["write event log"]
  GRADE -->|"No"| ROUTE["route to queues"]
  LOG --> LOGOK{"written?"}
  LOGOK -->|"No"| ROLL["publisher rolls back"]
  LOGOK -->|"Yes"| ROUTE
  ROUTE --> CORE["core queue - guaranteed"]
  ROUTE --> UIQ["ui queue - batched"]
  ROUTE -.-> PLUG["plugin queue - lossy"]
```

### ASCII

```text
Service.publish(event)
   |
   +-- assign event_id + monotonic sequence
   +-- if replay_grade: WRITE LOG (before delivery)
   |     write failed -> publisher rolls back, do not deliver
   |
   +-- route:
        core queue   -> guaranteed (backpressure)
        ui queue     -> coalesced, batched
        plugin queue -> lossy (never blocks core)
   |
   v
subscribers react (no return value, no Runtime mutation)
```

### Sequence

```mermaid
sequenceDiagram
  participant S as "Service"
  participant B as "EventBus"
  participant L as "Log"
  participant C as "Core Sub"
  participant U as "UI"

  S->>B: publish(event)
  B->>B: assign id + sequence
  B->>L: write if replay-grade
  L-->>B: committed
  B-)C: core delivery (guaranteed)
  B-)U: ui batched delivery
  Note over S,U: publish is fire-and-forget
```

## Delivery Classes

### Overview

```mermaid
flowchart LR
  BUS["EventBus"] --> CORE["Core - guaranteed"]
  BUS --> UI["UI - batched"]
  BUS -.-> PLUG["Plugin - lossy"]
```

### Detailed

```mermaid
flowchart TD
  EVT["Event"] --> MATCH["topic + scope match"]
  MATCH --> CQ["core queue - bounded"]
  MATCH --> UQ["ui queue - bounded"]
  MATCH -.-> PQ["plugin queue - bounded"]
  CQ -->|"full"| CBP["backpressure - degrade runtime"]
  UQ -->|"full"| UCO["coalesce, drop non-replay-grade"]
  PQ -->|"full"| PDROP["drop oldest - never wait"]
  PDROP -.-> PEVT["Eulinx://eventbus/subscriber_dropped_event"]
  PDROP -->|"x3 fails"| PQUAR["Eulinx://plugin/quarantined"]
```

### ASCII

```text
Class    Replay-grade   High-frequency   Blocks publisher?
------   ------------   -------------   -----------------
core     never dropped  never dropped    yes (backpressure)
ui       never dropped  may drop/coalesce no
plugin   may drop       may drop         no, ever

plugin overflow -> drop oldest -> Eulinx://eventbus/subscriber_dropped_event
plugin x3 fails -> Eulinx://plugin/quarantined
```

### Sequence

```mermaid
sequenceDiagram
  participant B as "EventBus"
  participant C as "Core Sub"
  participant P as "Slow Plugin"

  B->>C: send(event).await
  C-->>B: accepted
  B->>P: try_send(event)
  P-->>B: Err(Full)
  B->>B: drop oldest, increment dropped
  B-)C: Eulinx://eventbus/subscriber_dropped_event
  Note over B,P: core delivery never waited
```

## Facts Not Commands

### Overview

```mermaid
flowchart TD
  CMD["invoke: worker.spawn"] --> RUST["Runtime decides"]
  RUST --> EVT["Eulinx://worker/spawned (fact)"]
```

### ASCII

```text
WRONG (control channel):
  emit Eulinx://worker/spawn  -> subscriber tries to spawn -> bus is now a command channel

RIGHT (fact broadcast):
  invoke("spawn_worker")  -> Runtime spawns
  Runtime -> publish Eulinx://worker/spawned  -> subscribers observe
```

### Sequence

```mermaid
sequenceDiagram
  participant U as "UI"
  participant R as "Runtime"
  participant B as "EventBus"

  U->>R: invoke("spawn_worker")  (command)
  R->>R: spawn
  R-)B: Eulinx://worker/spawned  (fact, past tense)
  B-)U: observe, update mirror
```

## Related Documents

- [[EventAPI-Part01]]
- [[EventAPI-Part02]]
- [[EventAPI-Part03]]
- [[EventAPI-Part04]]
- [[EventAPI-Part05]]
- [[15-api/README]]
- [[EventBus-Diagrams]]
- [[IPC-Diagrams]]
- [[Contracts-Part02]]
