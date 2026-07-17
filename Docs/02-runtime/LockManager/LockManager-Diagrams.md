---
title: LockManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - lock-manager
  - concurrency
  - diagrams
related:
  - "[[02-runtime/README]]"
  - "[[LockManager-Part01]]"
  - "[[MergeManager-Part01]]"
  - "[[Scheduler-Part05]]"
---

# LockManager Diagrams

## Lock Acquisition

### High-Level Overview

```mermaid
graph LR
  O["Owner: Worker, Tool, Merge, Runtime, User"] --> LM["LockManager"]
  LM --> G["Grant"]
  LM --> Q["Queue"]
  LM --> D["Deny"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  REQ["LockRequest"] --> NORM["Normalize resource"]
  NORM --> SCOPE["Resolve Workspace scope"]
  SCOPE --> XW{"Crosses Workspace?"}
  XW -->|"Yes"| DENY["Deny: invalid scope"]
  XW -->|"No"| EXIST["Check existing locks"]
  EXIST --> CONF{"Conflict?"}
  CONF -->|"No"| GRANT["Create RuntimeLock"]
  CONF -->|"Yes"| TO{"timeoutMs set?"}
  TO -->|"No"| DENY
  TO -->|"Yes"| QUEUE["Append to lock queue"]
  GRANT --> LEASE["Set expiresAt lease"]
  LEASE --> EGR["lock.granted"]
  QUEUE --> EQ["lock.queued"]
  DENY --> EDN["lock.denied"]
  EGR -.-> EB["EventBus"]
  EQ -.-> EB
  EDN -.-> EB
```

### ASCII

```text
LockRequest { workspaceId, resourceType, resourceId, mode,
              ownerType, ownerId, timeoutMs, reason }
  |
  v
Normalize resource  ->  Resolve scope  ->  Check existing locks
  |
  v
Conflict?
  |-- no  --> Grant RuntimeLock --> set lease --> lock.granted
  |-- yes --> timeout set?
                |-- yes --> Queue waiter --> lock.queued
                |-- no  --> Deny        --> lock.denied
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant LM as "LockManager"
  participant DB as "runtime_locks"
  participant EB as "EventBus"

  W->>LM: acquire(LockRequest file src/auth.ts write)
  LM->>EB: lock.requested
  LM->>DB: read active locks for resource
  DB-->>LM: no conflicting lock
  LM->>DB: insert RuntimeLock with expiresAt
  LM->>EB: lock.granted
  LM-->>W: RuntimeLock
```

## Queue, Release, and Expiry

### High-Level Overview

```text
Holder works -> Holder finishes -> Lock released -> Next waiter promoted
Holder stalls -> Lease expires  -> Recovery check -> Release or escalate
```

### Detailed Mermaid

```mermaid
flowchart TD
  HELD["Lock held"] --> DONE{"Release trigger"}
  DONE -->|"owner completes"| REL["Release lock"]
  DONE -->|"owner fails"| REL
  DONE -->|"Runtime cancels owner"| REL
  DONE -->|"Workspace closes"| REL
  DONE -->|"user forces release"| SAFE{"Owner safely terminated?"}
  SAFE -->|"No"| WAITT["Wait for safe termination"]
  SAFE -->|"Yes"| REL
  DONE -->|"timeout expires"| EXP["lock.expired"]
  EXP --> ALIVE{"Owner process alive?"}
  ALIVE -->|"Yes"| RENEW["Renew lease or escalate"]
  ALIVE -->|"No"| REL
  REL --> NEXT{"Waiters queued?"}
  NEXT -->|"Yes"| PROMOTE["Promote next waiter, fairness order"]
  NEXT -->|"No"| FREE["Resource free"]
  PROMOTE -.-> EB["EventBus"]
  REL -.-> EB
```

### ASCII

```text
Release triggers:  owner completes | owner fails | timeout expires
                   Runtime cancels owner | user forces release | Workspace closes
  |
  v
lock.released --> queue empty? -- yes --> resource free
                              -- no  --> promote next waiter (FIFO, recovery may jump)
                                          --> lock.granted

Expiry is not proof the owner stopped.
Check owner liveness before reclaiming.
```

### Sequence

```mermaid
sequenceDiagram
  participant M as "MergeManager"
  participant LM as "LockManager"
  participant W4 as "Worker 4"
  participant UI as "Eulinx UI"
  participant EB as "EventBus"

  M->>LM: acquire(file src/auth.ts write)
  LM->>EB: lock.queued
  LM->>UI: blocker: Worker 4 is editing src/auth.ts
  W4->>LM: release(lock_w4)
  LM->>EB: lock.released
  LM->>LM: promote next waiter
  LM->>EB: lock.granted
  LM-->>M: RuntimeLock
```

## Deadlock Detection and Recovery

### High-Level Overview

```mermaid
graph LR
  A["Merge A holds file1 waits file2"] --> WFG["Wait-For Graph"]
  B["Merge B holds file2 waits file1"] --> WFG
  WFG --> CYC["Cycle detected"]
  CYC --> REC["Recovery strategy"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  Q["New waiter enqueued"] --> WFG["Update wait-for graph"]
  WFG --> CYC{"Wait cycle found?"}
  CYC -->|"No"| OK["Keep waiting"]
  CYC -->|"Yes"| EV["lock.deadlock_detected"]
  EV --> STRAT{"Recovery strategy"}
  STRAT -->|"wait"| OK
  STRAT -->|"cancel lower priority"| CAN["Cancel lower priority owner"]
  STRAT -->|"retry later"| RET["Requeue with backoff"]
  STRAT -->|"ask user"| ASK["Surface blocker in UI"]
  STRAT -->|"rollback owner"| RB["Rollback owner work"]
  STRAT -->|"force release"| TERM["Force release only after safe termination"]
  CAN --> FREE["Locks released"]
  RB --> FREE
  TERM --> FREE
  FREE --> RE["Re-evaluate queue"]
  EV -.-> EB["EventBus"]
```

### ASCII

```text
Deadlock:
  Merge A holds file1, waits for file2.
  Merge B holds file2, waits for file1.

Prevention:
  stable lock ordering | batch acquisition | timeouts
  no nested lock requests | wait-cycle detection

Conflict kinds:
  file | symbol | terminal ownership | merge | workflow graph mutation

Recovery:
  wait -> cancel lower priority -> retry later -> ask user
       -> rollback owner -> force release only after safe termination
```

### Sequence

```mermaid
sequenceDiagram
  participant MA as "Merge A"
  participant MB as "Merge B"
  participant LM as "LockManager"
  participant EB as "EventBus"
  participant UI as "Eulinx UI"

  MA->>LM: acquire(file1 write)
  LM-->>MA: granted
  MB->>LM: acquire(file2 write)
  LM-->>MB: granted
  MA->>LM: acquire(file2 write)
  LM->>EB: lock.queued
  MB->>LM: acquire(file1 write)
  LM->>LM: wait-for graph shows cycle
  LM->>EB: lock.deadlock_detected
  LM->>UI: show blocker in plain language
  LM->>MB: cancel lower priority owner
  MB->>LM: release(file2)
  LM->>EB: lock.released
  LM-->>MA: granted file2
```

## Related Documents

- [[LockManager-Part01]]
- [[LockManager-Part02]]
- [[LockManager-Part03]]
- [[LockManager-Part04]]
- [[LockManager-Part05]]
- [[LockManager-Part06]]
- [[MergeManager-Part01]]
- [[Scheduler-Part05]]
- [[PermissionManager-Part01]]
- [[02-runtime/README]]
