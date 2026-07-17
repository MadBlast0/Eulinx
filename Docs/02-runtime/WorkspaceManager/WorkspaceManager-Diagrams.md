---
title: WorkspaceManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - workspace-manager
  - diagrams
  - architecture
related:
  - "[[WorkspaceManager-Part01]]"
  - "[[WorkspaceManager-Part02]]"
  - "[[WorkspaceManager-Part03]]"
  - "[[RuntimeManager-Part01]]"
---

# WorkspaceManager Diagrams

Each flow below is rendered four ways: high-level overview, detailed Mermaid, ASCII, and sequence.

## Workspace Open Flow

### High-Level Overview

```mermaid
graph LR
  UI["Workspace Picker"] --> WM["WorkspaceManager"]
  WM --> RM["RuntimeManager"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  UI["Workspace Picker"] --> REQ["openWorkspace path"]
  REQ --> VP["Validate Root Path"]
  VP --> META["Verify Workspace Metadata"]
  META --> FOLD["Create Missing Internal Folders"]
  FOLD --> DB["Open Workspace Database"]
  DB --> SET["Load Settings"]
  SET --> POL["Load Permission Policies"]
  POL --> MIDX["Initialize Memory Indexes"]
  MIDX --> CTX["Build WorkspaceRuntimeContext"]
  CTX --> RM["Notify RuntimeManager"]
  RM --> ACT["State active"]
  ACT -.-> EB["EventBus workspace.opened"]
  VP --> FAIL["State failed"]
  META --> FAIL
  DB --> DEG["State degraded"]
```

### ASCII

```text
openWorkspace(path)
  |
  v
validate root path -------- invalid --> failed
  |
  v
verify workspace metadata - invalid --> failed
  |
  v
open workspace database --- error ----> degraded
  |
  v
load settings
  |
  v
load permission policies
  |
  v
initialize memory indexes
  |
  v
build WorkspaceRuntimeContext
  |
  v
notify RuntimeManager
  |
  v
active  -.->  EventBus: workspace.opened
```

### Sequence

```mermaid
sequenceDiagram
  participant UI as "Workspace Picker"
  participant WM as "WorkspaceManager"
  participant DB as "Workspace Database"
  participant PM as "PermissionManager"
  participant MM as "MemoryManager"
  participant RM as "RuntimeManager"
  participant EB as "EventBus"

  UI->>WM: openWorkspace path
  WM->>WM: validate path and metadata
  WM-->>EB: workspace.opening
  WM->>DB: open workspace database
  DB-->>WM: connection bound to workspaceId
  WM->>WM: load settings
  WM->>PM: load permission policy set
  PM-->>WM: policySetId
  WM->>MM: initialize memory indexes
  MM-->>WM: indexes ready
  WM-->>EB: workspace.validated
  WM->>RM: bind runtime to workspace
  RM-->>WM: runtime bound
  WM-->>EB: workspace.opened
  WM-->>UI: workspace active
```

## Path Boundary Check Flow

### High-Level Overview

```mermaid
graph LR
  SVC["Runtime Service"] --> WM["WorkspaceManager"]
  WM --> OK["Allow or Deny"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  SVC["Runtime Service Path Request"] --> NORM["Normalize Path"]
  NORM --> REL["Resolve Relative Segments"]
  REL --> TRAV["Strip Path Traversal Segments"]
  TRAV --> LINK["Resolve Symlinks Where Possible"]
  LINK --> CASE["Normalize Windows Case"]
  CASE --> ROOT["Compare Against Workspace Roots"]
  ROOT --> INSIDE["Inside Allowed Root"]
  ROOT --> OUTSIDE["Escapes Allowed Root"]
  INSIDE --> PROJ["Check Project Scope"]
  PROJ --> CROSS["Cross Project Access"]
  CROSS --> PM["PermissionManager Decision"]
  PM --> ALLOW["Allow"]
  PM --> DENY["Deny"]
  OUTSIDE --> DENY
  DENY -.-> EB["EventBus workspace.path_denied"]
```

### ASCII

```text
path request from runtime service
  |
  v
normalize: relative, absolute, symlinks, case, traversal
  |
  v
compare against Workspace file roots
  |
  +-- escapes root ------------------> DENY -.-> workspace.path_denied
  |
  +-- inside root
        |
        v
      same project?
        |
        +-- yes --------------------> ALLOW
        |
        +-- no (cross project)
              |
              v
            PermissionManager (fail closed)
              |
              +-- approved --------> ALLOW
              +-- denied ----------> DENY -.-> workspace.path_denied
```

### Sequence

```mermaid
sequenceDiagram
  participant SVC as "Runtime Service"
  participant WM as "WorkspaceManager"
  participant PM as "PermissionManager"
  participant EB as "EventBus"

  SVC->>WM: validatePath workspaceId projectId path
  WM->>WM: normalize and resolve path
  WM->>WM: compare against workspace roots
  alt path escapes root
    WM-->>EB: workspace.path_denied
    WM-->>SVC: denied boundary violation
  else cross project access
    WM->>PM: request cross project permission
    PM-->>WM: approve or deny
    WM-->>SVC: decision
  else inside project scope
    WM-->>SVC: allowed normalized path
  end
```

## Workspace Close and Switch Flow

### High-Level Overview

```mermaid
graph LR
  A["Active Workspace"] --> B["Closing"]
  B --> C["Closed"]
  C --> D["Open Next Workspace"]
```

### Detailed Mermaid

```mermaid
stateDiagram-v2
  [*] --> unknown
  unknown --> discovered
  discovered --> opening
  opening --> validating
  validating --> active
  validating --> failed
  active --> degraded
  degraded --> active
  degraded --> recovering
  recovering --> active
  recovering --> failed
  active --> closing
  degraded --> closing
  closing --> closed
  failed --> recovering
  closed --> [*]
```

### ASCII

```text
switch request = close current, then open next

closing
  |
  v
request runtime pause (RuntimeManager)
  |
  v
wait for safe shutdown or cancellation
  |
  v
flush pending events (EventBus)
  |
  v
close database handles
  |
  v
close file watchers
  |
  v
persist last active state
  |
  v
closed  -.->  EventBus: workspace.closed
  |
  v
drop all references to previous WorkspaceRuntimeContext
  |
  v
open next workspace (see Workspace Open Flow)
```

### Sequence

```mermaid
sequenceDiagram
  participant UI as "Workspace Picker"
  participant WM as "WorkspaceManager"
  participant RM as "RuntimeManager"
  participant DB as "Workspace Database"
  participant EB as "EventBus"

  UI->>WM: switchWorkspace nextPath
  WM-->>EB: workspace.switch_requested
  WM->>RM: request runtime pause
  RM-->>WM: executions paused or cancelled
  WM-->>EB: workspace.closing
  WM->>EB: flush pending events
  WM->>DB: close database handles
  WM->>WM: close file watchers
  WM->>WM: persist last active state
  WM-->>EB: workspace.closed
  WM->>RM: drop previous workspace references
  WM->>WM: openWorkspace nextPath
  WM-->>UI: next workspace active
```

## Related Documents

- [[WorkspaceManager-Part01]]
- [[WorkspaceManager-Part02]]
- [[WorkspaceManager-Part03]]
- [[WorkspaceManager-Part04]]
- [[RuntimeManager-Part01]]
- [[PermissionManager-Part01]]
- [[EventBus-Part01]]
