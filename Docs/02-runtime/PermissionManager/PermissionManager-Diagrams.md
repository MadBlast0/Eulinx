---
title: PermissionManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - permission-manager
  - security
  - diagrams
related:
  - "[[02-runtime/README]]"
  - "[[PermissionManager-Part01]]"
  - "[[Permission-Part01]]"
  - "[[ToolRegistry-Part01]]"
  - "[[EventBus-Part01]]"
---

# PermissionManager Diagrams

## Decision Pipeline

### High-Level Overview

```mermaid
graph LR
  A["Actor: Worker, Tool, Workflow, Plugin"] --> R["Permission Request"]
  R --> PM["PermissionManager"]
  PM --> D["allow, deny, require_approval, defer"]
  D --> E["Calling service enforces"]
  D -.-> EB["EventBus audit"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  REQ["Receive request"] --> VAL["Validate schema"]
  VAL -->|"invalid"| DENY["deny"]
  VAL --> SCOPE["Resolve scope: workspace, project, session"]
  SCOPE -->|"ambiguous"| DENY
  SCOPE --> ID["Resolve actor identity"]
  ID -->|"unresolved"| DENY
  ID --> POL["Load policies, broadest to narrowest"]
  POL -->|"load failure"| DENY
  POL --> HARD{"Hard deny matches?"}
  HARD -->|"Yes"| DENY
  HARD -->|"No"| GRANTS["Check grants"]
  GRANTS --> EXP{"Grant expired or revoked?"}
  EXP -->|"Yes"| DENY
  EXP -->|"No"| RISK["Classify risk: low, medium, high, critical"]
  RISK --> APPR{"Approval rules require human?"}
  APPR -->|"Yes"| RA["require_approval"]
  APPR -->|"No"| NEED{"Needs another service?"}
  NEED -->|"Yes"| DEF["defer to LockManager, MergeManager, ToolRegistry"]
  NEED -->|"No"| ALLOW["allow"]
  ALLOW -.-> EB["EventBus audit"]
  DENY -.-> EB
  RA -.-> EB
  DEF -.-> EB
```

### ASCII

```text
Policy layers, broadest to narrowest:
  Application > Workspace > Project > Session > Orchestrator
            > Worker > Tool > Temporary Grant > Human Approval

Narrower policies MAY narrow. They MUST NOT expand past a higher-level hard deny.

Request -> validate schema
        -> resolve scope
        -> resolve actor identity
        -> load policies (record policyVersion)
        -> apply hard denies       [override all grants]
        -> check grants            [expiry, revocation, riskLimit]
        -> classify risk           [when unsure, classify higher]
        -> check approval rules
        -> emit decision

Decision: allow | deny | require_approval | defer
          | expired | invalid_scope | conflict

Fail closed. Unknown means deny or wait, never allow.
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant TR as "ToolRegistry"
  participant PM as "PermissionManager"
  participant PS as "Policy Store"
  participant GS as "Grant Store"
  participant EB as "EventBus"

  W->>TR: invoke filesystem.write on src/auth.ts
  TR->>PM: evaluate(PermissionRequest)
  PM->>EB: permission.requested
  PM->>PS: load policies for scope
  PS-->>PM: policies with policyVersion
  PM->>PM: apply hard denies
  PM->>GS: check grants for actor
  GS-->>PM: active grant, riskLimit medium
  PM->>PM: classify risk medium
  PM->>EB: permission.allowed
  PM-->>TR: allow with reason and policyVersion
  TR->>W: tool invoked
```

## Human Approval and Grants

### High-Level Overview

```text
Worker requests -> PermissionManager evaluates -> approval ticket
  -> user approves or denies -> scoped grant with expiry -> audit
```

### Detailed Mermaid

```mermaid
flowchart TD
  RA["require_approval"] --> TIC["Create ApprovalTicket"]
  TIC --> FRZ["Freeze approval text and commandPreview"]
  FRZ --> UI["Approval UI renders ticket"]
  UI --> USER{"User decision"}
  USER -->|"deny"| DENY["deny"]
  USER -->|"approve"| NAR["UI suggests narrowing broad grants"]
  NAR --> GR["Create PermissionGrant"]
  GR --> EXPY["Set expiry: single_action, single_task, single_worker, single_session, time_limited, until_workspace_close"]
  EXPY --> ALLOW["allow"]
  ALLOW --> CHG{"Command changed after approval?"}
  CHG -->|"Yes"| INV["Approval MUST NOT apply, re-request"]
  CHG -->|"No"| EXEC["Enforcer executes"]
  REV["revoke(grantId)"] --> NEWD["New actions denied"]
  REV --> CAN["Cancel running actions when safe"]
  REV -.-> EB["EventBus"]
  ALLOW -.-> EB
  DENY -.-> EB
```

### ASCII

```text
Approval modes:
  ask_every_time | ask_for_high_risk | auto_allow_low_risk
  yolo_session | yolo_workspace | deny_by_default | simulation_only

YOLO is not permission absence. It is a named grant profile with
visible risk, expiry, and audit history. Never a skipPermissions boolean.

Grant { id, actorId, actorType, workspaceId, projectId, sessionId,
        actions, resources, riskLimit, createdBy, createdAt,
        expiresAt, revokedAt, reason }

Edge cases:
  command changed after approval  -> approval does not apply
  approval expires while queued   -> Worker must request again
  child Worker                    -> new actor, no inherited grants
  critical permission             -> default to single_action
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant PM as "PermissionManager"
  participant UI as "Approval UI"
  participant EV as "EventBus"

  W->>PM: request filesystem.delete on src/auth.ts
  PM->>PM: evaluate policy, risk high
  PM->>UI: create approval ticket
  PM->>EV: permission.approval_requested
  UI->>PM: user approves, scope narrowed to one file
  PM->>EV: permission.approval_resolved
  PM->>EV: permission.grant_created (expiry single_action)
  PM-->>W: allow
  PM->>EV: permission.grant_expired
```

## Runtime Enforcement

### High-Level Overview

```mermaid
graph TD
  PM["PermissionManager decides"] --> WSP["WorkerSpawner"]
  PM --> PLC["ProcessLifecycle"]
  PM --> TR["ToolRegistry"]
  PM --> WSM["WorkspaceManager"]
  PM --> MRG["MergeManager"]
  PM --> MEM["MemoryManager"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  ACT["Sensitive action requested"] --> SVC["Calling runtime service"]
  SVC --> ASK["PermissionManager.evaluate"]
  ASK --> DEC{"Decision"}
  DEC -->|"deny"| RPT["Report permission denied"]
  DEC -->|"require_approval"| WAIT["Wait for user"]
  WAIT --> DEC
  DEC -->|"allow"| EXTRA{"Additional gates"}
  EXTRA --> PATH["WorkspaceManager path-boundary check"]
  PATH -->|"outside boundary"| RPT
  PATH --> LOCK["LockManager conflict check"]
  LOCK -->|"conflict"| RPT
  LOCK --> VER["MergeManager verification status"]
  VER -->|"unverified"| RPT
  VER --> DO["Execute action"]
  DO -.-> EB["EventBus audit"]
  RPT -.-> EB
```

### ASCII

```text
Permission checks MUST happen before:
  spawn Worker | open terminal | run shell command | invoke Tool
  invoke MCP tool | read or write files | delete files | create patches
  apply patches | access memory | access secrets | browse web
  use Git | install plugins | send network requests

PermissionManager decides. Calling services enforce.

Permission does NOT override workspace isolation.
Permission does NOT override LockManager.
Permission does NOT override merge verification.
If audit logging fails, high-risk actions MUST be blocked.
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant WSP as "WorkerSpawner"
  participant PM as "PermissionManager"
  participant MRG as "MergeManager"
  participant LM as "LockManager"
  participant EB as "EventBus"

  W->>WSP: request child Worker spawn
  WSP->>PM: evaluate(spawn, actor=child is new actor)
  PM-->>WSP: allow, no inherited parent grants
  WSP-->>W: child Worker created
  W->>MRG: submit verified Artifact
  MRG->>PM: evaluate(merge.apply on trusted files)
  PM-->>MRG: allow
  MRG->>LM: acquire batch file locks
  LM-->>MRG: granted
  MRG->>EB: merge applied, audit recorded
```

## Related Documents

- [[PermissionManager-Part01]]
- [[PermissionManager-Part02]]
- [[PermissionManager-Part03]]
- [[PermissionManager-Part04]]
- [[PermissionManager-Part05]]
- [[PermissionManager-Part06]]
- [[Permission-Part01]]
- [[ToolRegistry-Part01]]
- [[LockManager-Part01]]
- [[EventBus-Part01]]
- [[02-runtime/README]]
