---
title: ServiceAPI Diagrams
status: draft
version: 1.0
tags:
  - api
  - service-api
  - diagrams
related:
  - "[[ServiceAPI-Part01]]"
  - "[[ServiceAPI-Part02]]"
  - "[[ServiceAPI-Part03]]"
  - "[[ServiceAPI-Part04]]"
  - "[[15-api/README]]"
  - "[[EventBus-Diagrams]]"
  - "[[RustAPI-Diagrams]]"
---

# ServiceAPI Diagrams

Every flow below is rendered as overview mermaid, detailed mermaid, ASCII, and sequence.

## Service Call Graph

### Overview

```mermaid
flowchart TD
  RM["RuntimeManager"] --> SCH["Scheduler"]
  SCH --> WS["WorkerSpawner"]
  WS --> PL["ProcessLifecycle"]
  WS --> LM["LockManager"]
  WS --> PM["PermissionManager"]
  SCH --> EE["ExecutionEngine"]
  EE --> TR["ToolRegistry"]
  EE --> MM["MemoryManager"]
  EE --> CM["ContextManager"]
  AM["ArtifactManager"] --> MG["MergeManager"]
  MG --> LM
  MG --> VF["Verifier"]
  ALL["Every service"] --> EB["EventBus"]
```

### Detailed

```mermaid
flowchart TD
  RM["RuntimeManager"] --> SCH
  SCH --> WS
  SCH --> EE
  SCH --> LM
  SCH --> PM
  WS --> PL
  WS --> LM
  WS --> PM
  WS --> AM
  WS --> EB
  EE --> WS
  EE --> TR
  EE --> MM
  EE --> CM
  EE --> LM
  EE --> EB
  WM["WorkspaceManager"] --> PM
  WM --> EB
  MM --> CM
  MM --> EB
  CM --> MM
  CM --> EB
  AM --> MG
  AM --> LM
  AM --> PM
  AM --> EB
  MG --> AM
  MG --> LM
  MG --> VF
  MG --> EB
  LM --> EB
  PM --> EB
  TR --> EB
  PL --> EB
  PL --> WS
```

### ASCII

```text
RuntimeManager
  -> Scheduler -> WorkerSpawner, ExecutionEngine, LockManager, PermissionManager
WorkerSpawner
  -> ProcessLifecycle, LockManager, PermissionManager, ArtifactManager, EventBus
ExecutionEngine
  -> WorkerSpawner, ToolRegistry, MemoryManager, ContextManager, LockManager, EventBus
WorkspaceManager -> PermissionManager, EventBus
MemoryManager -> ContextManager, EventBus
ContextManager -> MemoryManager, EventBus
ArtifactManager -> MergeManager, LockManager, PermissionManager, EventBus
MergeManager -> ArtifactManager, LockManager, Verifier, EventBus
LockManager / PermissionManager / ToolRegistry / ProcessLifecycle -> EventBus (leaf)

RULE: every service may publish; no service is called back by the bus.
RULE: call graph is acyclic.
```

### Sequence

```mermaid
sequenceDiagram
  participant S as "Scheduler"
  participant W as "WorkerSpawner"
  participant L as "LockManager"
  participant E as "EventBus"

  S->>W: spawn(args)
  W->>L: request_lock(resource)
  L-->>W: granted
  W->>W: fork via ProcessLifecycle
  W-)E: Eulinx://worker/spawned
  Note over S,E: Scheduler never calls EventBus for worker; WorkerSpawner publishes
```

## Deterministic Publish (no lock held)

### Overview

```mermaid
flowchart TD
  SVC["Service"] --> LOCK["acquire lock"]
  LOCK --> WORK["do work"]
  WORK --> REL["release lock"]
  REL --> PUB["publish event"]
```

### ASCII

```text
WRONG (deadlock risk):
  acquire_lock()
  publish_event()   <- bus may await a slow subscriber while lock held
  release_lock()

RIGHT:
  acquire_lock()
  do_work()
  release_lock()    <- lock released FIRST
  publish_event()   <- bus awaits freely
```

### Sequence

```mermaid
sequenceDiagram
  participant S as "Service"
  participant L as "LockManager"
  participant B as "EventBus"

  S->>L: acquire
  L-->>S: ok
  S->>S: do work
  S->>L: release
  L-->>S: released
  S-)B: publish fact
```

## AI vs Runtime Split

### Overview

```mermaid
flowchart TD
  AI["AI / TS Layer"] -->|"command"| RUST["RustAPI"]
  RUST --> SVC["ServiceAPI (deterministic)"]
  SVC --> EB["EventBus"]
```

### ASCII

```text
AI / TS layer (plans, reasons, refines)  --issues commands-->
RustAPI (validate, authorize, translate)  --delegates-->
ServiceAPI (schedule, lock, merge, verify, store, publish)  --broadcasts-->
EventBus (facts only)

Rule: services are deterministic, no LLM.
Rule: the command handler is a thin facade.
Rule: business logic that is mechanical lives in the service.
```

### Sequence

```mermaid
sequenceDiagram
  participant A as "AI/TS"
  participant C as "RustAPI"
  participant S as "ServiceAPI"
  participant B as "EventBus"

  A->>C: invoke("merge_artifact")
  C->>C: validate + authorize
  C->>S: MergeManager.submit
  S->>S: resolve conflict (deterministic)
  S-)B: Eulinx://artifact/merged
  B-)A: event updates UI mirror
```

## Related Documents

- [[ServiceAPI-Part01]]
- [[ServiceAPI-Part02]]
- [[ServiceAPI-Part03]]
- [[ServiceAPI-Part04]]
- [[15-api/README]]
- [[RustAPI-Diagrams]]
- [[EventBus-Diagrams]]
