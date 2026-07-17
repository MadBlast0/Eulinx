---
title: RuntimeRules Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - rules
  - invariants
  - diagrams
related:
  - "[[02-runtime/README]]"
  - "[[RuntimeRules-Part01]]"
  - "[[RuntimeManager-Part01]]"
  - "[[MergeManager-Part01]]"
---

# RuntimeRules Diagrams

The enforcement structure, four renderings, per flow.

## Invariant Gate Chain

### 1. High-Level Overview

```text
Runtime Request
  -> Workspace gate    (WorkspaceManager)
  -> Session gate      (RuntimeManager)
  -> Permission gate   (PermissionManager)
  -> Lock gate         (LockManager)
  -> Boundary gate     (owning service only)
  -> Event gate        (EventBus)
  -> Action executes
Any gate unsure -> deny, wait, or quarantine. Fail closed.
```

### 2. Detailed Mermaid

```mermaid
flowchart TD
  REQ["Runtime Request"] --> G1{"Active Workspace known?"}
  G1 -->|"No"| DENY["Deny and emit runtime.denied"]
  G1 -->|"Yes"| G2{"Session bound?"}
  G2 -->|"No"| DENY
  G2 -->|"Yes"| G3{"PermissionManager allows?"}
  G3 -->|"No"| DENY
  G3 -->|"Unknown"| DENY
  G3 -->|"Yes"| G4{"LockManager conflict free?"}
  G4 -->|"No"| WAIT["Wait in lock queue"]
  G4 -->|"Unknown"| WAIT
  G4 -->|"Yes"| G5{"Owning service boundary respected?"}
  G5 -->|"No"| VIOL["RuntimeError boundary_violation"]
  G5 -->|"Yes"| EXEC["Execute through service boundary"]
  EXEC -.-> EB["EventBus emits action event"]
  DENY -.-> EB
  WAIT -.-> EB
  VIOL -.-> EB
  WAIT --> G4
```

### 3. ASCII

```text
Runtime Request
  |
  v
[ gate 1 ] Workspace known?        no/unknown --> DENY
  |yes
  v
[ gate 2 ] Session bound?          no         --> DENY
  |yes
  v
[ gate 3 ] Permission allowed?     no/unknown --> DENY   (fail closed)
  |yes
  v
[ gate 4 ] Locks safe?             no/unknown --> WAIT   (queue, retry)
  |yes
  v
[ gate 5 ] Boundary owner is caller?  no      --> RuntimeError
  |yes
  v
[ execute through service boundary ]
  |
  '-.-> [ gate 6 ] EventBus event MUST be emitted
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant CALL as Calling Service
  participant RM as RuntimeManager
  participant WSM as WorkspaceManager
  participant PERM as PermissionManager
  participant LCK as LockManager
  participant EB as EventBus

  CALL->>RM: runtime request
  RM->>WSM: resolve active Workspace and boundary
  WSM-->>RM: workspaceId ok
  RM->>PERM: authorize action
  PERM-->>RM: allow
  RM->>LCK: acquire required locks
  LCK-->>RM: granted
  RM->>CALL: proceed
  CALL-->>EB: action event
  RM->>LCK: release locks
  LCK-->>EB: lock.released
```

## Rule Ownership Map

### 1. High-Level Overview

```mermaid
graph TD
  RR["RuntimeRules"] --> WSM["WorkspaceManager owns isolation"]
  RR --> PERM["PermissionManager owns authority"]
  RR --> LCK["LockManager owns concurrency"]
  RR --> MRG["MergeManager owns project mutation"]
  RR --> EB["EventBus owns observability"]
```

### 2. Detailed Mermaid

```mermaid
flowchart LR
  subgraph RULES["Non-Negotiable Rules"]
    R1["No execution without active Workspace"]
    R2["No Worker without a Session"]
    R3["No Tool call without ToolRegistry"]
    R4["No unsafe action without PermissionManager"]
    R5["No context injection without ContextManager"]
    R6["No artifact mutation without ArtifactManager"]
    R7["No project mutation without MergeManager"]
    R8["No concurrent mutation without LockManager"]
    R9["No process launch without ProcessLifecycle"]
    R10["No important action without EventBus event"]
  end
  R1 --> WSM["WorkspaceManager"]
  R2 --> RM["RuntimeManager"]
  R3 --> TR["ToolRegistry"]
  R4 --> PERM["PermissionManager"]
  R5 --> CM["ContextManager"]
  R6 --> AM["ArtifactManager"]
  R7 --> MRG["MergeManager"]
  R8 --> LCK["LockManager"]
  R9 --> PLC["ProcessLifecycle"]
  R10 --> EB["EventBus"]
```

### 3. ASCII

```text
RULE                                             OWNING SERVICE
-------------------------------------------------------------------
No execution without active Workspace         -> WorkspaceManager
No Worker without a Session                   -> RuntimeManager
No Tool call without ToolRegistry             -> ToolRegistry
No unsafe action without PermissionManager    -> PermissionManager
No context injection without ContextManager   -> ContextManager
No artifact mutation without ArtifactManager  -> ArtifactManager
No project mutation without MergeManager      -> MergeManager
No concurrent mutation without LockManager    -> LockManager
No process launch without ProcessLifecycle    -> ProcessLifecycle
No important action without EventBus event    -> EventBus

Boundary rule: services MUST NOT reach around each other.
  WorkerSpawner starts Workers, ProcessLifecycle starts OS processes.
  ExecutionEngine runs work, Scheduler decides readiness.
  ToolRegistry invokes Tools, PermissionManager authorizes use.
  MergeManager applies changes, LockManager prevents conflicts.
  ArtifactManager stores Artifacts, Verifier decides acceptance.
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant CALL as Any Runtime Service
  participant RM as RuntimeManager
  participant OWN as Rule Owning Service
  participant EB as EventBus

  CALL->>RM: request action X
  RM->>RM: look up rule owner for X
  RM->>OWN: delegate to owning service
  OWN->>OWN: enforce its own rule
  OWN-->>RM: result
  OWN-->>EB: rule decision event
  RM-->>CALL: typed result or RuntimeError
```

## Artifact Mutation Gate

### 1. High-Level Overview

```text
Worker output -> Artifact -> Verification -> Permission -> Lock -> MergeManager -> Project files
AI output NEVER writes trusted state directly. This is the single most important rule in Eulinx.
```

### 2. Detailed Mermaid

```mermaid
flowchart TD
  AI["AI Worker output"] --> ART["ArtifactManager stores Artifact"]
  ART --> VER{"Verification passes?"}
  VER -->|"No"| REJ["Reject, artifact.rejected"]
  VER -->|"Unknown"| REJ
  VER -->|"Yes"| PERM{"PermissionManager allows merge?"}
  PERM -->|"No"| REJ
  PERM -->|"Yes"| LCK{"LockManager grants file locks?"}
  LCK -->|"No"| QUEUE["Queue and retry"]
  LCK -->|"Yes"| MRG["MergeManager applies patch"]
  MRG --> FS["Project files"]
  QUEUE --> LCK
  MRG -.-> EB["EventBus merge.applied"]
  REJ -.-> EB
  AI -.-x FS
```

### 3. ASCII

```text
  Worker output  (UNTRUSTED)
        |
        v
   [ Artifact ]                         ArtifactManager
        |
        v
   [ Verification ] --fail/unknown--> reject, do not merge
        |pass
        v
   [ PermissionManager ] --deny--> reject
        |allow
        v
   [ LockManager ] --conflict--> queue and wait
        |granted
        v
   [ MergeManager ]                     the ONLY writer
        |
        v
   [ Project files ]  (TRUSTED)

  Worker output ---X---> Project files    FORBIDDEN, always
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant W as Worker
  participant AM as ArtifactManager
  participant VER as Verifier
  participant PERM as PermissionManager
  participant LCK as LockManager
  participant MRG as MergeManager
  participant EB as EventBus

  W->>AM: propose Artifact
  AM-->>EB: artifact.created
  AM->>VER: verify Artifact
  VER-->>AM: accepted
  AM->>PERM: request merge authority
  PERM-->>AM: allow
  AM->>LCK: acquire file locks
  LCK-->>AM: granted
  AM->>MRG: apply verified Artifact
  MRG-->>EB: merge.applied
  MRG->>LCK: release locks
  LCK-->>EB: lock.released
```

## Rule Violation Flow

### 1. High-Level Overview

```text
violation -> structured RuntimeError -> EventBus -> recoverable?
  yes -> attempt recovery -> recovered? resume : degraded or quarantine
  no  -> mark failed
```

### 2. Detailed Mermaid

```mermaid
flowchart TD
  V["Rule Violation or Service Error"] --> RE["Create RuntimeError with code and severity"]
  RE -.-> EB["EventBus emits error event"]
  RE --> Q{"recoverable?"}
  Q -->|"No"| FAIL["Mark failed"]
  Q -->|"Yes"| TRY["Attempt explicit recovery"]
  TRY --> OK{"Recovered?"}
  OK -->|"Yes"| RES["Resume, known safe state"]
  OK -->|"No"| DEG["Runtime degraded or quarantine"]
  DEG --> APPR["Destructive actions require approval"]
  RES -.-> EB
  FAIL -.-> EB
  DEG -.-> EB
```

### 3. ASCII

```text
Rule Violation
  |
  v
RuntimeError {
  code, message, severity: info|warning|error|critical,
  workspaceId?, sessionId?, service, recoverable, userVisible, createdAt
}
  |
  '-.-> EventBus  (MUST emit, never swallow silently)
  |
  v
recoverable?
  |no  --> mark failed
  |yes --> attempt explicit recovery
             |
             +-- known safe state   --> resume
             +-- known failed state --> mark failed
             '-- unknown state      --> quarantine or pause (degraded)
                                          |
                                          v
                              new risky work paused,
                              running safe work continues,
                              destructive actions need approval
```

### 4. Sequence

```mermaid
sequenceDiagram
  participant SVC as Failing Service
  participant RM as RuntimeManager
  participant EB as EventBus
  participant UI as Eulinx UI

  SVC->>RM: RuntimeError code and severity
  RM-->>EB: runtime.error
  EB-->>UI: show diagnostics
  alt recoverable
    RM->>SVC: attempt recovery
    SVC-->>RM: recovered
    RM-->>EB: runtime.recovered
  else not recoverable
    RM->>RM: mark service failed, runtime degraded
    RM-->>EB: runtime.degraded
    EB-->>UI: request user decision
  end
```

## Related Documents

- [[RuntimeRules-Part01]]
- [[RuntimeRules-Part02]]
- [[RuntimeRules-Part03]]
- [[RuntimeRules-Part04]]
- [[RuntimeManager-Part01]]
- [[PermissionManager-Part01]]
- [[LockManager-Part01]]
- [[MergeManager-Part01]]
- [[EventBus-Part01]]
- [[02-runtime/README]]
