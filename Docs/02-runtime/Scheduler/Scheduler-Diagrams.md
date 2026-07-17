---
title: Scheduler Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - scheduler
  - diagrams
  - architecture
related:
  - "[[02-runtime/README]]"
  - "[[Scheduler-Part01]]"
  - "[[Scheduler-Part02]]"
  - "[[Scheduler-Part06]]"
---

# Scheduler Diagrams

Every flow below is rendered four ways: overview, detailed mermaid, ASCII, and sequence.

## Readiness and Dispatch Flow

### Overview

```mermaid
flowchart TD
  N["New Work"] --> Q["Queue"]
  Q --> R["Readiness Check"]
  R --> RQ["Runnable Queue"]
  RQ --> EXE["ExecutionEngine"]
```

### Detailed

```mermaid
flowchart TD
  A["SchedulingUnit"] --> DEP["Dependency Check"]
  DEP --> PERM["Permission Check"]
  PERM --> LOCK["Lock Check"]
  LOCK --> BUD["Budget Check"]
  BUD --> RS["Runtime State Check"]
  RS --> F{"Ready?"}
  F -->|"No: dependency"| DW["dependency_wait_queue"]
  F -->|"No: permission"| PW["permission_wait_queue"]
  F -->|"No: approval"| AW["approval_wait_queue"]
  F -->|"No: lock"| LW["lock_wait_queue"]
  F -->|"No: budget"| BW["budget_wait_queue"]
  F -->|"Yes"| RQ["runnable_queue"]
  RQ --> RUN["running_set"]
  RUN --> EXE["ExecutionEngine"]
  DW -.-> A
  PW -.-> A
  AW -.-> A
  LW -.-> A
  BW -.-> A
```

### ASCII

```text
Scheduler queues:
  incoming_queue
  dependency_wait_queue
  permission_wait_queue
  approval_wait_queue
  lock_wait_queue
  budget_wait_queue
  runnable_queue
  running_set
  retry_queue
  cancelled_queue / completed_queue / failed_queue

Runnable ordering:
  1. safety requirements already satisfied
  2. priority   critical > high > normal > low > background
  3. dependency depth
  4. age        (priority aging prevents starvation)
  5. fairness
  6. resource fit

Rule: critical priority MUST NOT bypass permissions, locks,
approvals, or hard budgets. Priority affects ordering, not safety.
```

### Sequence

```mermaid
sequenceDiagram
  participant ORCH as Orchestrator
  participant SCH as Scheduler
  participant PM as PermissionManager
  participant LCK as LockManager
  participant EXE as ExecutionEngine
  participant EB as EventBus
  ORCH->>SCH: submit SchedulingUnit
  SCH-.->EB: scheduler.unit.queued
  SCH->>SCH: dependency check
  SCH->>PM: check requiredPermissions
  PM-->>SCH: allowed
  SCH->>LCK: acquire requiredLocks
  LCK-->>SCH: granted
  SCH->>SCH: budget check
  SCH-.->EB: scheduler.unit.ready
  SCH->>EXE: dispatch unit
  SCH-.->EB: scheduler.unit.scheduled
  EXE-->>SCH: execution completed
  SCH-.->EB: scheduler.unit.completed
```

## Scheduling State Flow

### Overview

```text
created -> queued -> waiting_* -> ready -> scheduled -> running -> completed
```

### Detailed

```mermaid
stateDiagram-v2
  [*] --> created
  created --> queued
  queued --> waiting_for_dependencies
  queued --> waiting_for_permission
  queued --> waiting_for_lock
  queued --> waiting_for_budget
  queued --> waiting_for_approval
  waiting_for_dependencies --> queued
  waiting_for_permission --> queued
  waiting_for_lock --> queued
  waiting_for_budget --> queued
  waiting_for_approval --> queued
  queued --> ready
  ready --> scheduled
  scheduled --> running
  running --> completed
  running --> failed
  running --> cancelled
  queued --> skipped
  completed --> [*]
  failed --> [*]
  cancelled --> [*]
  skipped --> [*]
```

### ASCII

```text
created
queued
waiting_for_dependencies
waiting_for_permission
waiting_for_lock
waiting_for_budget
waiting_for_approval
ready
scheduled
running
completed
failed
cancelled
skipped

Every blocked unit MUST carry a ReadinessBlocker so the UI can answer
"Why is this not running?" with a concrete reason.
```

### Sequence

```mermaid
sequenceDiagram
  participant SCH as Scheduler
  participant LCK as LockManager
  participant UI
  participant EB as EventBus
  SCH->>LCK: acquire file lock
  LCK-->>SCH: denied, held by worker-2
  SCH->>SCH: state waiting_for_lock
  SCH-.->EB: scheduler.unit.blocked
  EB-.->UI: blocker kind lock, recoverable true
  LCK-.->SCH: lock released
  SCH->>SCH: state queued then ready
  SCH-.->EB: scheduler.unit.ready
```

## Failure and Retry Flow

### Overview

```text
failure -> classify -> retry queue or terminal failure
```

### Detailed

```mermaid
flowchart TD
  FL["Unit Failed"] --> CL["Classify Failure"]
  CL --> P{"retryOn matches?"}
  P -->|"No"| TF["failed_queue"]
  P -->|"Yes"| A{"attempt < maxAttempts?"}
  A -->|"No"| TF
  A -->|"Yes"| RQ["retry_queue"]
  RQ --> BO["Apply Backoff"]
  BO --> RV["Revalidate Safety Gates"]
  RV --> DEP["Dependency Check"]
  DEP --> PERM["Permission Check"]
  PERM --> LOCK["Lock Check"]
  LOCK --> BUD["Budget Check"]
  BUD --> Q["queued"]
  TF -.-> EB["EventBus"]
  Q -.-> EB
```

### ASCII

```text
Failure categories:
  dependency_failed   permission_denied   approval_rejected
  lock_timeout        budget_exhausted    tool_unavailable
  worker_failed       runtime_unsafe      timeout
  unknown_error

Retry rule: retries MUST re-run every safety gate.
Permissions, locks, and budgets may have changed since attempt 1.

Cancellation sources:
  user, RuntimeManager, Orchestrator, failed dependency,
  policy change, budget exhaustion, emergency stop
```

### Sequence

```mermaid
sequenceDiagram
  participant EXE as ExecutionEngine
  participant SCH as Scheduler
  participant PM as PermissionManager
  participant LCK as LockManager
  participant EB as EventBus
  EXE-->>SCH: unit failed, lock_timeout
  SCH-.->EB: scheduler.unit.failed
  SCH->>SCH: attempt 1 of 3, backoff exponential
  SCH->>SCH: move to retry_queue
  SCH->>PM: revalidate permissions
  PM-->>SCH: allowed
  SCH->>LCK: reacquire locks
  LCK-->>SCH: granted
  SCH-.->EB: scheduler.unit.queued
  SCH->>EXE: dispatch retry attempt 2
```

## Related Documents

- [[Scheduler-Part01]]
- [[Scheduler-Part02]]
- [[Scheduler-Part03]]
- [[Scheduler-Part05]]
- [[Scheduler-Part06]]
- [[RuntimeManager-Part01]]
- [[ExecutionEngine-Part01]]
- [[LockManager-Part01]]
- [[02-runtime/README]]
