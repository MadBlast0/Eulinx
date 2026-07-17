---
title: WorkerHierarchy Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - worker-hierarchy
  - diagrams
related:
  - "[[WorkerHierarchy-Part01]]"
  - "[[WorkerHierarchy-Part05]]"
---

# WorkerHierarchy Diagrams

## Tree Shape

### High-Level Overview

```text
User -> Root Orchestrator -> Sub-Orchestrators -> Workers
Authority narrows going down. Results bubble going up.
```

### Detailed Mermaid Diagram

```mermaid
flowchart TD
  U["User depth 0"] --> RO["Root Orchestrator depth 1"]
  RO --> SA["Sub-Orchestrator Backend depth 2"]
  RO --> SU["Sub-Orchestrator Frontend depth 2"]
  RO --> WD["Worker docs depth 2"]
  SA --> W1["Worker schema depth 3"]
  SA --> W2["Worker handlers depth 3"]
  SU --> W3["Worker components depth 3"]
  SU --> W4["Worker styles depth 3"]
```

### ASCII Diagram

```text
user_root                          depth 0  kind=user         perms: fs.write **
  |
  +-- orc_root                     depth 1  kind=orchestrator  perms: fs.write **
        |
        +-- sub_api                depth 2  kind=orchestrator  perms: fs.write src/api/**
        |     |
        |     +-- wrk_schema       depth 3  kind=worker        perms: fs.write src/api/db/*
        |     +-- wrk_handlers     depth 3  kind=worker        perms: fs.write src/api/h/*
        |
        +-- sub_ui                 depth 2  kind=orchestrator  perms: fs.write src/ui/**
        |     |
        |     +-- wrk_components   depth 3  kind=worker        perms: fs.write src/ui/c/*
        |     +-- wrk_styles       depth 3  kind=worker        perms: fs.write src/ui/s/*
        |
        +-- wrk_docs               depth 2  kind=worker        perms: fs.write docs/**

Leaves are always kind=worker. Interior nodes are always kind=orchestrator.
A Worker may sit at depth 2. Depth is capped, not required.
```

### Sequence Diagram

```mermaid
sequenceDiagram
  participant U as "User"
  participant RM as "RuntimeManager"
  participant H as "HierarchyStore"
  participant RO as "Root Orchestrator"
  participant SA as "Sub-Orchestrator"
  U->>RM: "start session with objective"
  RM->>H: "insert user_root depth 0"
  RM->>H: "insert orc_root depth 1"
  RM->>RO: "spawn actor"
  RO->>RM: "DelegationRequest for backend"
  RM->>H: "insert sub_api depth 2"
  H-->>RM: "approved"
  RM-->>RO: "DelegationDecision approved"
  RM->>SA: "spawn actor"
```

## Delegation Flow

### High-Level Overview

```text
Orchestrator asks. Runtime checks scope, permissions, budget, depth, fan-out,
cycles. Runtime inserts or rejects. The Orchestrator never inserts.
```

### Detailed Mermaid Diagram

```mermaid
flowchart TD
  REQ["DelegationRequest"] --> R1{"rationale non-empty"}
  R1 -->|"no"| X1["reject MissingRationale"]
  R1 -->|"yes"| R2{"delegator running"}
  R2 -->|"no"| X2["reject ParentNotRunning"]
  R2 -->|"yes"| R3{"kind is orchestrator"}
  R3 -->|"no"| X3["reject OnlyOrchestratorsMayDelegate"]
  R3 -->|"yes"| R4{"scope is subset"}
  R4 -->|"no"| X4["reject ScopeEscalation"]
  R4 -->|"yes"| R5{"objective not duplicated"}
  R5 -->|"no"| X5["reject DuplicateDelegation"]
  R5 -->|"yes"| R6{"permissions are subset"}
  R6 -->|"no"| X6["reject PermissionEscalation"]
  R6 -->|"yes"| R7{"budget fits"}
  R7 -->|"no"| X7["reject BudgetExceeded"]
  R7 -->|"yes"| R8{"depth and fan-out ok"}
  R8 -->|"no"| X8["reject DepthLimitExceeded or FanOutLimitExceeded"]
  R8 -->|"yes"| R9{"cycle check passes"}
  R9 -->|"no"| X9["reject CycleDetected"]
  R9 -->|"yes"| OK["insert node, debit parent, emit hierarchy.delegated"]
```

### ASCII Diagram

```text
DelegationRequest
  |
  v
[1] rationale non-empty? ------ no --> MissingRationale
  | yes
[2] delegator state running? -- no --> ParentNotRunning
  | yes
[3] delegator is orchestrator? no --> OnlyOrchestratorsMayDelegate
  | yes
[4] scope subset check
      allowedPaths   subset of parent   -- no --> ScopeEscalation
      deniedPaths    superset of parent -- no --> ScopeEscalation
      allowedToolIds subset of parent   -- no --> ScopeEscalation
      deadlineAt     <= parent deadline -- no --> ScopeEscalation
  | pass
[5] duplicate objective among siblings? yes --> DuplicateDelegation
  | no
[6] isPermissionSubset(child, parent)? no --> PermissionEscalation
  | yes
[7] budgetFits(request, parent)? ------ no --> BudgetExceeded
  | yes
=== SQLite TRANSACTION BEGIN ===
[8] childDepth <= maxDepth? --------- no --> DepthLimitExceeded
[9] fanOut < maxDirectChildren? ----- no --> FanOutLimitExceeded
[10] descendants < maxDescendants? -- no --> DescendantLimitExceeded
[11] cycle check on childPath? ------ fail --> CycleDetected
[12] debit parent.reservedForChildren
[13] INSERT child row state=pending
[14] UPDATE parent.childIds
=== SQLite TRANSACTION COMMIT ===
  |
  v
emit hierarchy.delegated --> Scheduler admission
```

### Sequence Diagram

```mermaid
sequenceDiagram
  participant O as "Orchestrator"
  participant RM as "RuntimeManager"
  participant PM as "PermissionManager"
  participant H as "HierarchyStore"
  participant SCH as "Scheduler"
  participant EB as "EventBus"
  O->>RM: "DelegationRequest"
  RM->>RM: "validate rationale and state"
  RM->>PM: "isPermissionSubset child parent"
  PM-->>RM: "true"
  RM->>H: "budgetFits request parent"
  H-->>RM: "true"
  RM->>H: "insert in transaction"
  H->>H: "check depth fan-out cycle"
  H->>H: "debit parent budget"
  H-->>RM: "node inserted pending"
  RM-)EB: "hierarchy.delegated"
  RM-->>O: "DelegationDecision approved"
  RM->>SCH: "request admission"
  SCH-->>RM: "admitted"
  RM-)EB: "hierarchy.node_admitted"
```

## Permission Inheritance

### High-Level Overview

```text
Grants intersect going down. Denials union going down.
A child is always weaker than its parent.
```

### Detailed Mermaid Diagram

```mermaid
flowchart TD
  U["user_root grants fs.write **"] --> RO["orc_root grants fs.write **"]
  RO --> SA["sub_api grants fs.write src/api/**"]
  SA --> W["wrk_schema grants fs.write src/api/db/*"]
  W --> E["effective equals intersection equals fs.write src/api/db/*"]
  E --> D1["write src/api/db/schema.sql ALLOW"]
  E --> D2["write src/ui/App.tsx DENY"]
```

### ASCII Diagram

```text
Effective permission resolution for wrk_schema:

  path = "user_root/orc_root/sub_api/wrk_schema"
  split -> [user_root, orc_root, sub_api, wrk_schema]
  batch load all four in ONE query

  step  node        grants                   running?   effective grants
  ----  ----------  -----------------------  ---------  -------------------
  1     user_root   fs.write **              yes        fs.write **
  2     orc_root    fs.write **              yes        fs.write **
  3     sub_api     fs.write src/api/**      yes        fs.write src/api/**
  4     wrk_schema  fs.write src/api/db/*    yes        fs.write src/api/db/*

  denials union across all four: [fs.write **/*.env]

  request: fs.write "src/api/db/schema.sql"
    denial match? no
    grant match on "src/api/db/*"? yes
    requiresApproval constraint? no
    -> ALLOW

  request: fs.write "src/ui/App.tsx"
    denial match? no
    grant match? no  -> fail closed -> DENY
    NOTE: user_root holds fs.write ** and it does not help.
          The narrowest ancestor wins.

  request: fs.write "src/api/db/.env"
    denial fs.write **/*.env matches -> DENY before any grant is considered.

  If sub_api.state were "paused":
    step 6 of the resolution returns Deny(AncestorNotRunning) immediately,
    regardless of grants. A node MUST NOT act under a suspended ancestor.
```

### Sequence Diagram

```mermaid
sequenceDiagram
  participant W as "wrk_schema"
  participant RM as "RuntimeManager"
  participant H as "HierarchyStore"
  participant PM as "PermissionManager"
  participant EB as "EventBus"
  W->>RM: "request fs.write src/api/db/schema.sql"
  RM->>H: "getAncestors by path split"
  H-->>RM: "user_root orc_root sub_api wrk_schema"
  RM->>PM: "resolve effective"
  PM->>PM: "intersect grants, union denials"
  PM->>PM: "check every ancestor state is running"
  PM-->>RM: "Allow"
  RM-)EB: "permission.evaluated"
  RM-->>W: "Allow"
```

## Cascade Cancel

### High-Level Overview

```text
Signals travel down only. Deepest nodes die first.
Locks are released by the cascade, not by the dying actor.
```

### Detailed Mermaid Diagram

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> admitted: "Scheduler accepts"
  admitted --> running: "slot granted"
  running --> paused: "cascade pause"
  paused --> running: "cascade resume"
  running --> completing: "actor finished"
  completing --> completed: "parent acknowledges result"
  running --> cancelled: "cascade cancel or terminate"
  admitted --> cancelled: "cascade cancel, no actor to signal"
  pending --> cancelled: "cascade cancel, no actor to signal"
  paused --> cancelled: "cascade cancel"
  running --> failed: "budget exhausted or retries exceeded"
  running --> orphaned: "parent vanished"
  orphaned --> cancelled: "reaper terminates, never reparents"
  completed --> [*]
  cancelled --> [*]
  failed --> [*]
```

### ASCII Diagram

```text
User cancels orc_root. gracePeriodMs 5000.

Authorization: is "user_root" in orc_root.path? yes -> allowed.
Collect subtree via  WHERE path LIKE 'user_root/orc_root%'

Sort by depth DESCENDING. This order is MANDATORY.

  order  depth  node            action
  -----  -----  --------------  ----------------------------------------
  1      3      wrk_schema      cancel msg, RELEASE LOCK, refund budget
  2      3      wrk_handlers    cancel msg, refund budget
  3      3      wrk_components  state only, no actor exists yet
  4      2      sub_api         cancel msg, refund to orc_root
  5      2      sub_ui          cancel msg, refund to orc_root
  6      1      orc_root        cancel msg, refund to user_root

Grace window:
  wrk_schema   ACK at 800ms   -> partial NodeResult with 1 artifact kept
  wrk_handlers NO ACK at 5000 -> escalate to terminate, kill process
                                 emit hierarchy.cancel_escalated_to_terminate

emit hierarchy.cascade_complete affectedCount=6

WRONG ORDER (do not do this):
  orc_root first -> orc_root terminal while wrk_schema still running
                 -> violates H11 (terminal node with live descendants)
                 -> lock on schema.sql never released
                 -> every sibling waiting on that file deadlocks
```

### Sequence Diagram

```mermaid
sequenceDiagram
  participant U as "User"
  participant RM as "RuntimeManager"
  participant H as "HierarchyStore"
  participant LK as "LockManager"
  participant WS as "wrk_schema depth 3"
  participant WH as "wrk_handlers depth 3"
  participant SA as "sub_api depth 2"
  participant RO as "orc_root depth 1"
  participant PL as "ProcessLifecycle"
  U->>RM: "cancel orc_root"
  RM->>H: "collect subtree, sort depth DESC"
  RM->>WS: "cancel, grace 5000"
  RM->>LK: "releaseAll wrk_schema"
  RM->>WH: "cancel, grace 5000"
  WS-->>RM: "ack at 800ms with partial result"
  RM->>SA: "cancel"
  RM->>RO: "cancel"
  Note over WH: "grace expires with no ack"
  RM->>PL: "kill wrk_handlers process"
  RM-)U: "hierarchy.cascade_complete"
```

## Result Bubbling

### High-Level Overview

```text
One edge at a time. Persist, then acknowledge. Never skip a level.
```

### Detailed Mermaid Diagram

```mermaid
flowchart BT
  W1["wrk_schema result success"] --> SA["sub_api aggregates"]
  W2["wrk_handlers result partial"] --> SA
  SA --> RO["orc_root aggregates"]
  W3["wrk_components result success"] --> SU["sub_ui aggregates"]
  SU --> RO
  RO --> U["User sees one summary"]
  W1 -.->|"FORBIDDEN skip-level"| RO
```

### ASCII Diagram

```text
wrk_schema finishes.

[1] all of wrk_schema's children terminal? it has none (leaf). pass.
[2] build NodeResult { outcome: "success", summary: "...",
                       artifactIds: ["art_9a"] }
[3] build ResultBubbleMessage { fromNodeId: wrk_schema,
                                toNodeId: sub_api, attempt: 1 }
[4] route THROUGH the runtime, never a direct call to sub_api
[5] start 30000 ms ack timer

  ack received:
    -> sub_api PERSISTS result_json FIRST
    -> sub_api THEN acknowledges
    -> refund: sub_api.reservedForChildren -= wrk_schema.allocated
               sub_api.spent               += wrk_schema.spent
    -> wrk_schema -> "completed"
    -> re-run fan-out admission so a queued sibling can start

  no ack:
    attempt 2 after 1000 ms
    attempt 3 after 4000 ms
    attempt 4 after 16000 ms
    still nothing -> does sub_api exist and run?
                       no  -> orphan procedure
                       yes -> wrk_schema failed(ParentUnresponsive)

sub_api MUST NOT report "completed" until BOTH wrk_schema and wrk_handlers
are terminal. That is invariant H12.

sub_api MUST NOT report "success" if wrk_handlers reported "failure" unless
wrk_handlers was marked optional AT DELEGATION TIME, before the outcome was
known.
```

### Sequence Diagram

```mermaid
sequenceDiagram
  participant W as "wrk_schema"
  participant RM as "RuntimeManager"
  participant SA as "sub_api"
  participant DB as "SQLite"
  participant EB as "EventBus"
  W->>RM: "ResultBubbleMessage attempt 1"
  RM->>SA: "deliver result"
  SA->>DB: "persist result_json"
  DB-->>SA: "committed"
  SA-->>RM: "ResultAck"
  RM->>DB: "refund budget, mark wrk_schema completed"
  RM-)EB: "hierarchy.result_accepted"
  RM->>SA: "re-run fan-out admission"
```

## Orphan Handling

### High-Level Overview

```text
Parent gone plus node not terminal equals orphan.
Preserve artifacts, refund budget, release locks, kill the node.
Never reparent.
```

### Detailed Mermaid Diagram

```mermaid
flowchart TD
  S["sweep every 30000 ms and at startup"] --> Q["query non-terminal nodes"]
  Q --> C1{"parent row exists"}
  C1 -->|"no"| O1["orphan ParentRowMissing"]
  C1 -->|"yes"| C2{"parent state terminal"}
  C2 -->|"yes"| O2["orphan ParentTerminal"]
  C2 -->|"no"| C3{"parent actor alive"}
  C3 -->|"no"| O3["orphan ParentActorDead"]
  C3 -->|"yes"| OK["healthy"]
  O1 --> R["resolution"]
  O2 --> R
  O3 --> R
  R --> R1["quarantine artifacts, never merge"]
  R --> R2["terminate, grace 0"]
  R --> R3["refund budget to nearest live ancestor"]
  R --> R4["release all locks"]
  R --> R5["write summary to Session memory"]
  R --> R6["emit hierarchy.orphan_reaped"]
  R --> NR["MUST NOT reparent to grandparent"]
```

### ASCII Diagram

```text
Runtime crashed mid-session. On restart, BEFORE admitting any node:

  SELECT * FROM hierarchy_nodes
   WHERE state NOT IN ('completed','cancelled','failed')

  node            parentId   parent state  actor  verdict
  --------------  ---------  ------------  -----  -------------------------
  orc_root        user_root  running       dead   orphan ParentActorDead
  sub_api         orc_root   running       dead   orphan ParentActorDead
  wrk_schema      sub_api    running       dead   orphan ParentActorDead
  wrk_handlers    sub_api    cancelled     dead   orphan ParentTerminal

Resolution per node:
  O1 wrk_schema produced art_9a  -> quarantine it, MUST NOT merge.
                                    No live parent can vouch for it.
  O2 terminate all four, grace 0
  O3 do NOT reparent sub_api to user_root. user_root's plan has no slot for
     it and its budget never reserved for it. That would break H5.
  O4 refund each budget to the nearest non-terminal ancestor.
     Here that is user_root for all of them.
  O5 release every lock held by every orphan actor id
  O6 write "Session interrupted: 4 nodes reaped, 1 artifact quarantined"
     to Session memory so the user can see what was lost

emit hierarchy.orphan_reaped x4
```

### Sequence Diagram

```mermaid
sequenceDiagram
  participant RM as "RuntimeManager"
  participant H as "HierarchyStore"
  participant AM as "ArtifactManager"
  participant LK as "LockManager"
  participant MEM as "MemoryManager"
  participant EB as "EventBus"
  RM->>RM: "startup, before any admission"
  RM->>H: "query non-terminal nodes"
  H-->>RM: "orc_root sub_api wrk_schema wrk_handlers"
  RM->>H: "check each parent exists, is non-terminal, has live actor"
  H-->>RM: "all four orphaned"
  RM-)EB: "hierarchy.orphan_detected x4"
  RM->>AM: "quarantine art_9a, do not merge"
  RM->>LK: "releaseAll for each orphan actor"
  RM->>H: "terminate each, grace 0, refund to user_root"
  RM->>MEM: "write session summary of lost work"
  RM-)EB: "hierarchy.orphan_reaped x4"
```

## Related Documents

- [[WorkerHierarchy-Part01]]
- [[WorkerHierarchy-Part03]]
- [[WorkerHierarchy-Part04]]
- [[WorkerHierarchy-Part05]]
- [[WorkerCommunication-Diagrams]]
