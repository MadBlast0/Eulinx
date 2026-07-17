---
title: ExecutionEngine Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - execution-engine
  - diagrams
  - architecture
related:
  - "[[02-runtime/README]]"
  - "[[ExecutionEngine-Part01]]"
  - "[[ExecutionEngine-Part03]]"
  - "[[ExecutionEngine-Part04]]"
---

# ExecutionEngine Diagrams

Every flow below is rendered four ways: overview, detailed mermaid, ASCII, and sequence.

## Dispatch and Adapter Flow

### Overview

```mermaid
flowchart TD
  SCH["Scheduler"] --> EXE["ExecutionEngine"]
  EXE --> AD["Execution Adapter"]
  AD --> RES["Execution Result"]
```

### Detailed

```mermaid
flowchart TD
  O["Orchestrator"] --> T["Task"]
  T --> S["Scheduler"]
  S --> E["ExecutionEngine"]
  E --> SEL{"Adapter Kind"}
  SEL -->|"terminal"| TA["TerminalAdapter"]
  SEL -->|"worker"| WA["WorkerAdapter"]
  SEL -->|"tool"| TLA["ToolAdapter"]
  SEL -->|"workflow_node"| WNA["WorkflowNodeAdapter"]
  SEL -->|"verification"| VA["VerificationAdapter"]
  SEL -->|"merge"| MA["MergeAdapter"]
  WA --> WSP["WorkerSpawner"]
  TLA --> TR["ToolRegistry"]
  MA --> MRG["MergeManager"]
  TA --> R["Execution Result"]
  WA --> R
  TLA --> R
  WNA --> R
  VA --> R
  MA --> R
  R --> AM["ArtifactManager"]
  R -.-> EB["EventBus"]
  R --> DB["Runtime History"]
```

### ASCII

```text
[Scheduler]
    |
    v
[ExecutionEngine]
    |
    +-- TerminalAdapter        +-- VerificationAdapter
    +-- WorkerAdapter          +-- MergeAdapter
    +-- ToolAdapter            +-- MemoryAdapter
    +-- WorkflowNodeAdapter    +-- ArtifactAdapter
    |
    v
[Result + Events + Logs + Artifacts]

Adapter interface:
  kind
  validate(input)
  prepare(unit)
  start(prepared)
  stream(handle)
  cancel(handle)
  finalize(handle)
  cleanup(handle)

The engine owns the generic lifecycle. Adapters own concrete mechanics.
The WorkerAdapter MUST NOT spawn unregistered Workers directly.
```

### Sequence

```mermaid
sequenceDiagram
  participant SCH as Scheduler
  participant EXE as ExecutionEngine
  participant PM as PermissionManager
  participant AD as WorkerAdapter
  participant WSP as WorkerSpawner
  participant AM as ArtifactManager
  participant EB as EventBus
  SCH->>EXE: executable unit
  EXE->>EXE: validate input shape
  EXE->>PM: permission decision required
  PM-->>EXE: allowed
  EXE->>AD: prepare then start
  AD->>WSP: create Worker process
  WSP-->>AD: WorkerHandle
  AD-.->EB: stream stdout and stderr
  AD-->>EXE: finished, exit code 0
  EXE->>AM: store Artifact
  EXE-.->EB: execution.completed
  EXE-->>SCH: ExecutionResult
```

## Execution Lifecycle Flow

### Overview

```text
created -> validated -> ready -> running -> finalizing -> completed -> archived
```

### Detailed

```mermaid
stateDiagram-v2
  [*] --> created
  created --> validated
  validated --> waiting_for_permission
  waiting_for_permission --> ready
  ready --> starting
  starting --> running
  running --> streaming
  streaming --> finalizing
  running --> waiting_for_child
  running --> waiting_for_approval
  waiting_for_child --> running
  waiting_for_approval --> running
  finalizing --> completed
  running --> failed
  running --> cancelled
  running --> timed_out
  running --> crashed
  failed --> rolled_back
  completed --> archived
  cancelled --> archived
  timed_out --> archived
  crashed --> archived
```

### ASCII

```text
created                waiting_for_approval
validated              finalizing
waiting_for_permission completed
ready                  failed
starting               cancelled
running                timed_out
streaming              crashed
waiting_for_child      rolled_back
                       archived

Transition rules:
  created MAY transition to validated
  running MAY transition to cancelled
  completed MUST NOT transition back to running
  archived MUST be terminal
  Invalid transitions MUST be rejected
  Every transition MUST emit an event and persist enough
    information to reconstruct the lifecycle during Replay
```

### Sequence

```mermaid
sequenceDiagram
  participant EXE as ExecutionEngine
  participant PM as PermissionManager
  participant LCK as LockManager
  participant AD as Adapter
  participant EB as EventBus
  EXE->>EXE: created then validated
  EXE->>PM: request decision
  PM-->>EXE: allowed
  EXE->>EXE: ready then starting
  EXE->>LCK: acquire required locks
  LCK-->>EXE: granted
  EXE->>AD: bind and start
  EXE-.->EB: execution.started
  AD-.->EXE: stdout and stderr chunks
  EXE-.->EB: execution.output
  AD-->>EXE: done
  EXE->>EXE: finalizing
  EXE->>LCK: release locks
  EXE-.->EB: execution.completed
```

## Failure and Cancellation Flow

### Overview

```text
fault detected -> cancel adapter -> release resources -> record result
```

### Detailed

```mermaid
flowchart TD
  R["running"] --> D{"Fault Kind"}
  D -->|"user or Scheduler stop"| CX["cancelled"]
  D -->|"timeout exceeded"| TO["timed_out"]
  D -->|"process died"| CR["crashed"]
  D -->|"adapter error"| FA["failed"]
  CX --> FIN["Finalize"]
  TO --> FIN
  CR --> FIN
  FA --> RB{"Rollback Needed?"}
  RB -->|"Yes"| ROL["rolled_back"]
  RB -->|"No"| FIN
  ROL --> FIN
  FIN --> CS["Close Streams"]
  CS --> RL["Release Locks"]
  RL --> CA["Collect Artifacts"]
  CA --> PR["Persist Result and Metrics"]
  PR --> AR["archived"]
  PR -.-> EB["EventBus"]
  PR -.-> SCH["Notify Scheduler"]
```

### ASCII

```text
Finalization MUST, on every terminal path:
  close streams
  release locks
  collect artifacts
  write metrics
  persist final result
  emit completion event
  notify Scheduler
  notify owning Task or Workflow node

The ExecutionEngine MUST NOT:
  allow untracked execution
  run work without Workspace scope
  run work without a permission decision
  silently retry unsafe operations
  bypass approval gates
  mutate project files outside approved channels
  hide terminal or tool output from observability

Artifacts are stored, not applied. Only MergeManager applies them.
```

### Sequence

```mermaid
sequenceDiagram
  participant UI
  participant SCH as Scheduler
  participant EXE as ExecutionEngine
  participant AD as Adapter
  participant LCK as LockManager
  participant EB as EventBus
  UI->>SCH: cancel execution
  SCH->>EXE: cancel request
  EXE->>AD: cancel(handle)
  AD-->>EXE: stopped
  EXE->>EXE: state cancelled then finalizing
  EXE->>LCK: release locks
  EXE->>AD: cleanup(handle)
  EXE-.->EB: execution.cancelled
  EXE->>EXE: persist result, state archived
  EXE-->>SCH: ExecutionResult cancelled
  EB-.->UI: execution.cancelled
```

## Related Documents

- [[ExecutionEngine-Part01]]
- [[ExecutionEngine-Part02]]
- [[ExecutionEngine-Part03]]
- [[ExecutionEngine-Part04]]
- [[ExecutionEngine-Part06]]
- [[RuntimeManager-Part01]]
- [[Scheduler-Part01]]
- [[WorkerSpawner-Part01]]
- [[Artifact-Part01]]
- [[02-runtime/README]]
