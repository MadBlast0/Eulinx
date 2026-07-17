---
title: WorkerSpawner Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - worker-spawner
  - diagrams
  - architecture
related:
  - "[[02-runtime/README]]"
  - "[[WorkerSpawner-Part01]]"
  - "[[WorkerSpawner-Part02]]"
  - "[[WorkerSpawner-Part05]]"
---

# WorkerSpawner Diagrams

Every flow below is rendered four ways: overview, detailed mermaid, ASCII, and sequence.

## Spawn Flow

### Overview

```mermaid
flowchart TD
  RQ["WorkerSpawnRequest"] --> V["Validate"]
  V --> P["Prepare"]
  P --> L["Launch"]
  L --> WH["WorkerHandle"]
```

### Detailed

```mermaid
flowchart TD
  A["Spawn Request"] --> B["Validate Request"]
  B --> C["Create Worker Record"]
  C --> D["Prepare Context Package"]
  D --> E["Prepare Environment"]
  E --> F["Create Terminal Binding"]
  F --> G["ProcessLifecycle Start"]
  G --> H{"Started?"}
  H -->|"Yes"| I["Worker Running"]
  H -->|"No"| J["Mark Spawn Failed"]
  I --> K["Return WorkerHandle"]
  K -.-> EB["EventBus worker.started"]
  J -.-> EB2["EventBus worker.spawn_failed"]
```

### ASCII

```text
Task or Orchestrator decides a Worker is needed.
Scheduler decides the spawn is allowed to run.
PermissionManager authorizes the requested powers.
WorkerSpawner creates the Worker runtime environment.
ProcessLifecycle starts the actual process.
EventBus announces the new Worker.

Spawn request lifecycle:
  created
    |
    v
  received_by_scheduler
    |
    v
  approved_for_spawn
    |
    v
  received_by_worker_spawner
    |
    v
  validated ----> rejected
    |
    v
  prepared
    |
    v
  launched
```

### Sequence

```mermaid
sequenceDiagram
  participant ORCH as Orchestrator
  participant SCH as Scheduler
  participant WSP as WorkerSpawner
  participant PM as PermissionManager
  participant CM as ContextManager
  participant PLC as ProcessLifecycle
  participant EB as EventBus
  ORCH->>SCH: request worker spawn
  SCH->>WSP: approved spawn request
  WSP-.->EB: worker.spawn_requested
  WSP->>WSP: validate layers 1 to 10
  WSP-.->EB: worker.spawn_validating
  WSP->>PM: validate permissionProfileId
  PM-->>WSP: approved profile
  WSP-.->EB: worker.record_created
  WSP->>CM: build context package
  CM-->>WSP: contextPackageId
  WSP-.->EB: worker.context_prepared
  WSP->>PLC: start process with env and args
  WSP-.->EB: worker.process_starting
  PLC-->>WSP: processId and terminalId
  WSP-.->EB: worker.started
  WSP-->>SCH: WorkerHandle
```

## Validation Flow

### Overview

```text
schema -> workspace -> session -> parent -> cli -> permission
-> sandbox -> budget -> runtime readiness -> conflict
```

### Detailed

```mermaid
flowchart TD
  S1["1 Schema"] --> S2["2 Workspace"]
  S2 --> S3["3 Session"]
  S3 --> S4["4 Parent Ownership"]
  S4 --> S5["5 CLI Profile"]
  S5 --> S6["6 Permission Profile"]
  S6 --> S7["7 Sandbox Profile"]
  S7 --> S8["8 Budget"]
  S8 --> S9["9 Runtime Readiness"]
  S9 --> S10["10 Conflict"]
  S10 --> OK["WorkerSpawnReadiness ready true"]
  S1 -->|"fail"| RJ["Reject with SpawnBlocker"]
  S2 -->|"fail"| RJ
  S3 -->|"fail"| RJ
  S4 -->|"fail"| RJ
  S5 -->|"fail"| RJ
  S6 -->|"fail"| RJ
  S7 -->|"fail"| RJ
  S8 -->|"fail"| RJ
  S9 -->|"fail"| RJ
  S10 -->|"fail"| RJ
  RJ -.-> EB["EventBus worker.spawn_rejected"]
```

### ASCII

```text
Failure reasons:
  workspace_not_loaded       session_closed
  parent_not_found           parent_permission_denied
  cli_profile_missing        cli_executable_missing
  permission_denied          sandbox_invalid
  budget_exceeded            runtime_not_ready

Hard rules:
  WorkerSpawner MUST fail closed.
  If any validation fails, the Worker MUST NOT be partially launched.
  A Worker MUST NOT be spawned into one Workspace using context
    from another Workspace.
  Arbitrary command strings from AI output MUST NOT become
    executable shell commands.
  WorkerSpawner MUST NOT grant more permissions than the request
    was approved for.
```

### Sequence

```mermaid
sequenceDiagram
  participant SCH as Scheduler
  participant WSP as WorkerSpawner
  participant WSM as WorkspaceManager
  participant PM as PermissionManager
  participant EB as EventBus
  SCH->>WSP: spawn request
  WSP->>WSP: schema validation
  WSP->>WSM: workspace loaded and not archived?
  WSM-->>WSP: loaded
  WSP->>WSP: session and parent validation
  WSP->>WSP: cli profile and executable check
  WSP->>PM: may parent spawn children?
  PM-->>WSP: denied, parent_permission_denied
  WSP->>WSP: state rejected
  WSP-.->EB: worker.spawn_rejected
  WSP-->>SCH: WorkerSpawnReadiness ready false
```

## Failure and Recovery Flow

### Overview

```text
launch window watched -> running, or failed and quarantined
```

### Detailed

```mermaid
stateDiagram-v2
  [*] --> created
  created --> starting
  starting --> running
  starting --> failed
  starting --> timed_out
  created --> cancelled
  timed_out --> quarantined
  failed --> quarantined
  running --> [*]
  quarantined --> [*]
  cancelled --> [*]
```

### ASCII

```text
WorkerSpawner monitors the launch window only.
Long-term supervision belongs to ProcessLifecycle and
RuntimeManager health aggregation.

Launch window terminal states:
  running
  failed
  cancelled
  timed_out
  quarantined

If a process launches but registration fails, WorkerSpawner MUST
stop the process or quarantine the Worker. No orphan processes.
```

### Sequence

```mermaid
sequenceDiagram
  participant WSP as WorkerSpawner
  participant PLC as ProcessLifecycle
  participant EB as EventBus
  participant UI
  WSP->>PLC: start CLI process
  PLC-->>WSP: processId
  WSP->>WSP: await ready within launch timeout
  WSP->>WSP: timeout expired, never became ready
  WSP->>PLC: stop or quarantine process
  PLC-->>WSP: terminated
  WSP-.->EB: worker.spawn_failed
  WSP-.->EB: worker.terminated
  EB-.->UI: spawn failed, reason launch_timeout
```

## Related Documents

- [[WorkerSpawner-Part01]]
- [[WorkerSpawner-Part02]]
- [[WorkerSpawner-Part03]]
- [[WorkerSpawner-Part04]]
- [[WorkerSpawner-Part05]]
- [[RuntimeManager-Part01]]
- [[Scheduler-Part01]]
- [[ProcessLifecycle-Part01]]
- [[02-runtime/README]]
