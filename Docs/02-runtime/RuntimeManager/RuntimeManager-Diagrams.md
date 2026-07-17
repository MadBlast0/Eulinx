---
title: RuntimeManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - runtime-manager
  - diagrams
  - architecture
related:
  - "[[02-runtime/README]]"
  - "[[RuntimeManager-Part01]]"
  - "[[RuntimeManager-Part02]]"
  - "[[RuntimeManager-Part05]]"
---

# RuntimeManager Diagrams

Every flow below is rendered four ways: overview, detailed mermaid, ASCII, and sequence.

## Service Graph

### Overview

```mermaid
flowchart TD
  RM["RuntimeManager"] --> SAFE["Safety Services"]
  RM --> DATA["Data Services"]
  RM --> CAP["Capability Services"]
  RM --> EXEC["Execution Services"]
```

### Detailed

```mermaid
flowchart TD
  EB["EventBus"] --> WSM["WorkspaceManager"]
  EB --> PM["PermissionManager"]
  EB --> LCK["LockManager"]
  EB --> PLC["ProcessLifecycle"]
  PLC --> TR["ToolRegistry"]
  PLC --> CM["ContextManager"]
  PLC --> MEM["MemoryManager"]
  PLC --> AM["ArtifactManager"]
  AM --> MRG["MergeManager"]
  AM --> WSP["WorkerSpawner"]
  WSP --> SCH["Scheduler"]
  WSP --> EXE["ExecutionEngine"]
```

### ASCII

```text
EventBus
  |
  +-- WorkspaceManager
  +-- PermissionManager
  +-- LockManager
  +-- ProcessLifecycle
        |
        +-- ToolRegistry
        +-- ContextManager
        +-- MemoryManager
        +-- ArtifactManager
              |
              +-- MergeManager
              +-- WorkerSpawner
                    |
                    +-- Scheduler
                    +-- ExecutionEngine
```

### Sequence

```mermaid
sequenceDiagram
  participant RM as RuntimeManager
  participant EB as EventBus
  participant PM as PermissionManager
  participant WSP as WorkerSpawner
  participant SCH as Scheduler
  RM->>EB: register service
  RM->>PM: register service
  RM->>WSP: register service
  RM->>SCH: register service
  RM-->>EB: runtime.services_registered
```

## Startup Flow

### Overview

```text
uninitialized -> starting -> ready
```

### Detailed

```mermaid
stateDiagram-v2
  [*] --> uninitialized
  uninitialized --> starting
  starting --> ready
  starting --> failed
  ready --> running
  running --> paused
  running --> degraded
  degraded --> running
  paused --> running
  running --> stopping
  stopping --> stopped
  failed --> recovery
  degraded --> recovery
  recovery --> ready
  stopped --> [*]
```

### ASCII

```text
RuntimeManager.start()
  |
  v
load config -> open database
  |
  v
Phase 1  start EventBus, logging
  |
  v
Phase 2  start WorkspaceManager, PermissionManager, LockManager
  |
  v
Phase 3  start MemoryManager, ArtifactManager, ContextManager
  |
  v
Phase 4  start ToolRegistry, ProcessLifecycle, WorkerSpawner
  |
  v
Phase 5  start Scheduler, ExecutionEngine, MergeManager
  |
  +-- required service failed --> failed  (fail closed)
  +-- optional service failed --> degraded
  |
  v
emit runtime.ready
```

### Sequence

```mermaid
sequenceDiagram
  participant UI
  participant RM as RuntimeManager
  participant EB as EventBus
  participant WSM as WorkspaceManager
  participant PM as PermissionManager
  participant SCH as Scheduler
  participant EXE as ExecutionEngine
  UI->>RM: start runtime
  RM->>EB: start
  RM->>WSM: start
  RM->>PM: start
  RM->>SCH: start
  RM->>EXE: start
  RM-->>EB: runtime.ready
  EB-.->UI: runtime.ready
```

## Failure and Recovery Flow

### Overview

```text
failure detected -> pause scheduling -> inspect health -> restart or stop
```

### Detailed

```mermaid
flowchart TD
  F["Failure Detected"] --> C{"Critical?"}
  C -->|"No"| D["Mark degraded"]
  C -->|"Yes"| P["Pause Scheduling"]
  P --> S["Pause Active Executions"]
  S --> H["Inspect Service Health"]
  H --> SV["Save State and Audit Record"]
  SV --> R{"Safe To Restart?"}
  R -->|"Yes"| RS["Restart Service"]
  R -->|"No"| ST["Forced Shutdown"]
  RS --> OK["State ready"]
  ST --> STP["State stopped"]
  D -.-> EB["EventBus"]
  OK -.-> EB
  STP -.-> EB
```

### ASCII

```text
Critical failures (pause or stop immediately):
  PermissionManager unavailable
  WorkspaceManager cannot verify paths
  LockManager cannot enforce locks
  EventBus cannot record critical events
  database cannot persist audit records
  ProcessLifecycle cannot stop dangerous process

Recovery mode:
  stop scheduling new work
  pause active executions
  inspect service health
  save state
  attempt restart of safe services
  notify UI
  require user action if needed
```

### Sequence

```mermaid
sequenceDiagram
  participant PM as PermissionManager
  participant RM as RuntimeManager
  participant SCH as Scheduler
  participant EXE as ExecutionEngine
  participant EB as EventBus
  participant UI
  PM-.->RM: health check failed
  RM->>RM: state recovery
  RM->>SCH: pause scheduling
  RM->>EXE: pause active executions
  RM-.->EB: runtime.recovery_entered
  RM->>PM: restart service
  PM-->>RM: healthy
  RM-.->EB: runtime.ready
  EB-.->UI: runtime.ready
```

## Related Documents

- [[RuntimeManager-Part01]]
- [[RuntimeManager-Part02]]
- [[RuntimeManager-Part03]]
- [[RuntimeManager-Part05]]
- [[Scheduler-Part01]]
- [[ExecutionEngine-Part01]]
- [[02-runtime/README]]
