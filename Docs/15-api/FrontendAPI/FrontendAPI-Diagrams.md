---
title: FrontendAPI Diagrams
status: draft
version: 1.0
tags:
  - api
  - frontend-api
  - diagrams
related:
  - "[[FrontendAPI-Part01]]"
  - "[[FrontendAPI-Part02]]"
  - "[[FrontendAPI-Part03]]"
  - "[[FrontendAPI-Part04]]"
  - "[[FrontendAPI-Part05]]"
  - "[[15-api/README]]"
  - "[[IPC-Diagrams]]"
---

# FrontendAPI Diagrams

Every flow below is rendered as overview mermaid, detailed mermaid, ASCII, and sequence.

## Service Module to Runtime

### Overview

```mermaid
flowchart LR
  C["Component"] --> S["workerService"]
  S --> A["Transport Adapter"]
  A --> IPC["IPC invoke/listen"]
```

### Detailed

```mermaid
flowchart TD
  C["Component"] --> SVC["workerService.spawn(args)"]
  SVC --> ADAPT["Transport Adapter"]
  ADAPT --> INV["invoke('spawn_worker')"]
  INV --> RUST["Rust Runtime"]
  RUST --> RET["Result | ApiError"]
  RET --> ADAPT
  ADAPT --> NORM["normalize to ApiError"]
  NORM --> SVC
  SVC --> C
  RUST -.-> EVT["Eulinx://worker/spawned"]
  EVT -.-> MGR["Subscription Manager"]
  MGR --> RED["workerSlice.applyWorkerSpawned"]
```

### ASCII

```text
Component
   |
   v
workerService.spawn({prompt, refinementMode})
   |
   v
Transport Adapter  (ONLY file that calls invoke)
   |  - inject workspaceId
   |  - invoke("spawn_worker")
   v
Rust Runtime -> Result | ApiError
   |
   v
Adapter normalizes rejection -> ApiError {code, message, context}
   |
   v
workerService resolves / rejects
   |
   v
Component awaits

Later (async):
Runtime -> EventBus -> Eulinx://worker/spawned
   |
   v
Subscription Manager -> workerSlice.applyWorkerSpawned
   |
   v
Runtime mirror updated (Tier 1)
```

### Sequence

```mermaid
sequenceDiagram
  participant C as "Component"
  participant S as "workerService"
  participant A as "Adapter"
  participant R as "Rust"

  C->>S: spawn(args)
  S->>A: invoke("spawn_worker", args+ws)
  A->>R: command
  R-->>A: WorkerSummary
  A-->>S: Result
  S-->>C: resolved WorkerSummary
  R-)A: Eulinx://worker/spawned (event)
  A-)C: dispatch to slice
```

## State Tiers

### Overview

```mermaid
flowchart TD
  T1["Tier 1 Runtime Mirror"] --> RS["Zustand runtime slices"]
  T2["Tier 2 View State"] --> LS["Zustand layout slices"]
  T3["Tier 3 Ephemeral"] --> COMP["useState / useRef"]
```

### ASCII

```text
TIER 1  Runtime Mirror   owner: backend   written by: events + command results
        lives in: Zustand runtime slices
        Workers, Sessions, Executions, Artifacts, Graph, Locks, Permissions

TIER 2  View State       owner: frontend, persisted
        lives in: Zustand layout slices -> SQLite (debounced)
        pane sizes, active tab, zoom, theme, node positions

TIER 3  Ephemeral        owner: component
        lives in: useState / useRef
        hover, drag, selection, open menu, unsaved input
```

### Sequence

```mermaid
sequenceDiagram
  participant E as "Event"
  participant S as "Slice Reducer"
  participant C as "Component"

  E->>S: applyWorkerStateChanged(payload)
  S->>S: fold into Tier 1 (idempotent)
  S-->>C: re-render from store
  Note over C: component never wrote Tier 1
```

## Subscription Lifecycle

### Overview

```mermaid
flowchart TD
  M["Mount"] --> REG["service.on(event, handler)"]
  REG --> MGR["Subscription Manager"]
  SW["Workspace Switch"] --> TEAR["tear down old"]
  TEAR --> OPEN["open new"]
```

### Detailed

```mermaid
flowchart TD
  COMP["Component effect"] --> ON["service.on('Eulinx://worker/state_changed', h)"]
  ON --> MGR["Manager registers, scopes to workspaceId"]
  MGR --> LISTEN["listen('Eulinx://events') once"]
  LISTEN --> DISP["dispatch batch to handlers"]
  COMP --> CLEAN["effect cleanup -> deregister(h)"]
  CLEAN --> MGR2["Manager removes handler"]
  SW["Workspace switch"] --> TD["Manager tears down ALL old handlers"]
  TD --> REOPEN["Manager opens new workspace handlers"]
```

### ASCII

```text
mount:
  useEffect(() => {
    const off = workerService.onStateChanged(h)
    return () => off()         // always
  })

workspace switch:
  Manager.tearDown(oldWs)   // all handlers + listen
  Store.reset(newWs)
  Manager.open(newWs)

wrong: listen in render, no cleanup -> double-apply after switch
```

### Sequence

```mermaid
sequenceDiagram
  participant M as "Mount"
  participant S as "Service"
  participant MGR as "Manager"
  participant B as "Runtime"

  M->>S: on(event, handler)
  S->>MGR: register(scoped)
  MGR->>B: listen Eulinx://events
  B-)MGR: batch
  MGR->>S: dispatch to handler
  M->>S: off(handler)
  S->>MGR: deregister
```

## Related Documents

- [[FrontendAPI-Part01]]
- [[FrontendAPI-Part02]]
- [[FrontendAPI-Part03]]
- [[FrontendAPI-Part04]]
- [[FrontendAPI-Part05]]
- [[15-api/README]]
- [[IPC-Diagrams]]
