---
title: IPC Diagrams
status: draft
version: 1.0
tags:
  - api
  - ipc
  - diagrams
related:
  - "[[IPC-Part01]]"
  - "[[IPC-Part02]]"
  - "[[IPC-Part03]]"
  - "[[15-api/README]]"
  - "[[EventBus-Diagrams]]"
---

# IPC Diagrams

Every flow below is rendered as overview mermaid, detailed mermaid, ASCII, and sequence.

## The Two Channels

### Overview

```mermaid
flowchart LR
  UI["React UI"] -->|"invoke (command)"| RUST["Rust Runtime"]
  RUST -.->|"listen (event)"| UI
```

### Detailed

```mermaid
flowchart TD
  C["Component"] --> INV["invoke('cmd', args)"]
  INV --> RCMD["Rust command handler"]
  RCMD --> PERM["PermissionManager check"]
  PERM --> SVC["Runtime Service (ServiceAPI)"]
  SVC --> EVT["EventBus publish"]
  EVT -.-> BATCH["UI Batcher"]
  BATCH -.-> LISTEN["listen('Eulinx://...')"]
  LISTEN --> H["Event handler -> runtime store"]
  RCMD --> RET["Result | ApiError envelope"]
  RET --> C
```

### ASCII

```text
REACT COMPONENT
   |
   |  invoke("spawn_worker", {workspaceId, prompt})
   |  -------------------------------------------------->  UI -> Runtime (request/response)
   v
RUST COMMAND HANDLER
   |  - validate args
   |  - PermissionManager.check
   |  - call ServiceAPI (WorkerSpawner)
   |  - return Result | ApiError
   |
   v  <---------------------------------------------------  one response, one answer
COMPONENT receives result or error envelope


RUNTIME (later, async)
   |
   |  EventBus.publish(worker.spawned)
   |  -> UI Batcher -> Tauri emit "Eulinx://worker/spawned"
   v  <---------------------------------------------------  Runtime -> UI (one-way)
COMPONENT handler updates runtime store
```

### Sequence

```mermaid
sequenceDiagram
  participant C as "Component"
  participant R as "Rust Command"
  participant P as "PermissionManager"
  participant S as "WorkerSpawner"
  participant B as "EventBus"

  C->>R: invoke("spawn_worker", args)
  R->>P: check(spawn_worker, workspaceId)
  P-->>R: allowed
  R->>S: spawn(args)
  S-->>R: WorkerSummary
  R-->>C: Result(WorkerSummary)
  S-)B: publish worker.spawned
  B-)C: listen Eulinx://worker/spawned
```

## Listener Lifecycle

### Overview

```mermaid
flowchart TD
  EFF["React Effect"] --> L["listen('Eulinx://...')"]
  L --> H["handler"]
  EFF --> CLEAN["cleanup"]
  CLEAN --> U["unlisten()"]
```

### Detailed

```mermaid
flowchart TD
  M["Component mount"] --> EFF["useEffect"]
  EFF --> OPEN["listen -> unlisten fn"]
  OPEN --> REG["register in subscription manager"]
  REG --> RENDER["handler updates store on events"]
  M --> UNM["Component unmount / workspace switch"]
  UNM --> CLEAN["cleanup calls unlisten"]
  CLEAN --> DEREG["remove from subscription manager"]
  DEREG --> SAFE["no double-apply, no leak"]
```

### ASCII

```text
mount:
  useEffect(() => {
    const unlisten = listen("Eulinx://worker/state_changed", h)
    return () => unlisten()   <-- cleanup, always
  })

workspace switch:
  subscription manager tears down ALL listeners for old workspace
  before opening listeners for new workspace

wrong (leak):
  listen in render body, no cleanup
  -> after switch, old handler still fires
  -> event applied twice, wrong workspace store
```

### Sequence

```mermaid
sequenceDiagram
  participant M as "Mount"
  participant S as "Sub Manager"
  participant B as "Runtime"
  participant U as "Unmount"

  M->>S: open listeners (workspaceId)
  S->>B: register scope filter
  B-)S: Eulinx://worker/state_changed (ws A)
  S->>S: deliver (matches scope)
  U->>S: tear down (workspaceId)
  S->>B: unlisten all for ws A
  Note over S,B: no event double-applied after switch
```

## Batching and Backpressure

### Overview

```mermaid
flowchart LR
  BUS["EventBus"] --> BATCH["UI Batcher"]
  BATCH --> EMIT["emit Eulinx://events (batch)"]
  EMIT --> UI["React single dispatch"]
```

### Detailed

```mermaid
flowchart TD
  EVT["Event"] --> HF{"High frequency?"}
  HF -->|"Yes"| COAL["Coalesce by source key"]
  HF -->|"No"| OPEN["Append to open batch"]
  COAL --> CAP{"Chunk > 64 KiB?"}
  CAP -->|"Yes"| TRUNC["Keep last 64 KiB, set truncatedBytes"]
  CAP -->|"No"| OPEN
  TRUNC --> OPEN
  OPEN --> FLUSH{"Flush now?"}
  FLUSH -->|"50 ms"| EMIT["Emit Eulinx://events"]
  FLUSH -->|"200 events"| EMIT
  FLUSH -->|"replay-grade event"| EMIT
  FLUSH -->|"No"| WAIT["Hold batch"]
  EMIT -.-> UI["React: one dispatch, one render"]
```

### ASCII

```text
EventBus core/ui queues
   |
   v
UI Batcher
   +-- coalesce output_streamed by (type, workerId, channel) -> cap 64 KiB
   +-- coalesce progress_reported by executionId -> replace, newest wins
   +-- flush when: 50 ms elapsed OR 200 events OR replay-grade event arrives
   v
Tauri emit("Eulinx://events", batch)   <- ONE emit per batch
   v
React listen -> ONE dispatch -> ONE render
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant B as "EventBus"
  participant BAT as "UI Batcher"
  participant UI as "React"

  loop "many chunks in 50 ms"
    W->>B: Eulinx://worker/output_streamed
    B-)BAT: coalesce into open batch
  end
  BAT-)UI: emit Eulinx://events (one batch)
  UI->>UI: single dispatch, single render
```

## Related Documents

- [[IPC-Part01]]
- [[IPC-Part02]]
- [[IPC-Part03]]
- [[IPC-Part04]]
- [[15-api/README]]
- [[EventBus-Diagrams]]
- [[FrontendAPI-Diagrams]]
