---
title: MemoryManager Diagrams
status: draft
version: 1.0
tags:
  - runtime
  - memory-manager
  - diagrams
  - architecture
related:
  - "[[MemoryManager-Part01]]"
  - "[[MemoryManager-Part02]]"
  - "[[MemoryManager-Part03]]"
  - "[[ContextManager-Part01]]"
---

# MemoryManager Diagrams

Each flow below is rendered four ways: high-level overview, detailed Mermaid, ASCII, and sequence.

## Memory Write Flow

### High-Level Overview

```mermaid
graph LR
  SRC["Runtime Object"] --> MM["MemoryManager"]
  MM --> ST["Memory Store"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  SRC["Memory Candidate from Worker Tool or Runtime"] --> REQ["MemoryWriteRequest"]
  REQ --> SCOPE["Validate Scope scopeType and scopeId"]
  SCOPE --> WS["Enforce Workspace Boundary"]
  WS --> SENS["Classify Sensitivity"]
  SENS --> RED["Redact Secret Values"]
  RED --> PM["PermissionManager Write Check"]
  PM --> RET["Apply Retention Policy"]
  RET --> STORE["Store MemoryRecord"]
  STORE --> IDX["Update Vector Index"]
  STORE -.-> EB["EventBus memory.created"]
  SCOPE --> REJ["Reject"]
  WS --> REJ
  PM --> REJ
```

### ASCII

```text
runtime object produces memory candidate
  |
  v
MemoryManager validates scope ------- bad scope --> reject
  |
  v
enforce Workspace boundary ---------- cross ws ---> reject
  |
  v
classify sensitivity (public|internal|sensitive|secret)
  |
  v
redact secret values (never store raw secrets)
  |
  v
PermissionManager checks write access - denied ---> reject
  |
  v
apply retention policy
  (session_only|execution_only|task_only|
   workspace_persistent|until_revoked|until_date|manual_only)
  |
  v
store MemoryRecord + update vector index
  |
  v
EventBus: memory.created
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant MM as "MemoryManager"
  participant PM as "PermissionManager"
  participant ST as "Structured Memory Store"
  participant VI as "Vector Index"
  participant EB as "EventBus"

  W->>MM: MemoryWriteRequest scope type content
  MM->>MM: validate scope and workspace boundary
  MM->>MM: classify sensitivity and redact
  MM->>PM: check memory write access
  PM-->>MM: allow or deny
  alt denied
    MM-->>W: rejected permission denied
  else allowed
    MM->>ST: persist MemoryRecord
    ST-->>MM: recordId
    MM->>VI: index embedding chunks
    MM-->>EB: memory.created
    MM-->>W: recordId
  end
```

## Memory Read and Injection Flow

### High-Level Overview

```mermaid
graph LR
  W["Worker"] --> CM["ContextManager"]
  CM --> MM["MemoryManager"]
  MM --> CM
```

### Detailed Mermaid

```mermaid
flowchart TD
  W["Worker Needs Context"] --> CM["ContextManager Builds Request"]
  CM --> MM["MemoryManager Retrieval"]
  MM --> MODE["Select Retrieval Mode"]
  MODE --> SC["by_scope"]
  MODE --> REL["by_relevance"]
  MODE --> QRY["by_query"]
  MODE --> HYB["hybrid"]
  SC --> CAND["Candidate Set"]
  REL --> CAND
  QRY --> CAND
  HYB --> CAND
  CAND --> PM["PermissionManager Filters Access"]
  PM --> RANK["Rank by Scope Recency Importance Sensitivity Token Cost"]
  RANK --> REDACT["Redact Before Injection"]
  REDACT --> CM2["ContextManager Injects Selected Memory"]
  CM2 --> W2["Worker Receives Context"]
  CM2 -.-> EB["EventBus memory.retrieved"]
```

### ASCII

```text
Worker asks for context
  |
  v
ContextManager builds context request
  |
  v
MemoryManager finds candidates
  (by_scope|by_id|by_time|by_relevance|
   by_artifact|by_task|by_worker|by_query|hybrid)
  |
  v
PermissionManager filters access (fail closed)
  |
  v
MemoryManager ranks relevance
  scope closeness > recency > relevance > importance
  > source reliability > sensitivity > token cost > user pinning
  |
  v
redaction pass before injection
  |
  v
ContextManager injects selected memory
  |
  v
Worker receives context   -.->  EventBus: memory.retrieved

MemoryManager MUST NOT inject memory into a Worker directly.
```

### Sequence

```mermaid
sequenceDiagram
  participant W as "Worker"
  participant CM as "ContextManager"
  participant MM as "MemoryManager"
  participant PM as "PermissionManager"
  participant VI as "Vector Index"
  participant EB as "EventBus"

  W->>CM: request context for task
  CM->>MM: retrieve memory scope query limits
  MM->>MM: resolve retrieval mode
  MM->>VI: semantic search knowledge memory
  VI-->>MM: candidate chunks
  MM->>PM: filter candidates by access
  PM-->>MM: permitted subset
  MM->>MM: rank and truncate to token budget
  MM->>MM: redact sensitive values
  MM-->>CM: selected memory records
  MM-->>EB: memory.retrieved
  CM-->>W: injected context
```

## Scope Summarization Flow

### High-Level Overview

```mermaid
graph LR
  WM["Worker Memory"] --> TS["Task Summary"]
  TS --> WSM["Workspace Memory"]
```

### Detailed Mermaid

```mermaid
flowchart TD
  END["Worker Ends"] --> RAW["Raw Worker Memory"]
  RAW --> SUM["Summarize Worker Memory"]
  SUM --> KEEP["Preserve Decisions Constraints Preferences Unresolved Issues Results Source Links"]
  KEEP --> TASK["Task Summary Record"]
  TASK --> REV["Review Before Upward Promotion"]
  REV --> WSM["Workspace Memory"]
  RAW --> ARCH["Archive Raw Worker Memory"]
  ARCH --> REPLAY["Replay Memory Retained"]
  REV -.-> EB["EventBus memory.summarized"]
```

### ASCII

```text
scope ladder (lower scope may summarize upward, never leak raw)

Workspace
  Project
    Session
      Execution
        Orchestrator
          Task
            Worker

promotion path:
Worker Memory -> Task Summary -> Workspace Memory

on worker end:
  |
  +-- summarize worker memory
  |     must preserve: decisions, constraints, user preferences,
  |     unresolved issues, final results, links to source records
  |     must NOT discard safety or approval information
  |
  +-- archive raw worker memory (kept for Replay)
  |
  +-- promote summary upward only after review
        |
        v
      EventBus: memory.summarized
```

### Sequence

```mermaid
sequenceDiagram
  participant WSP as "WorkerSpawner"
  participant MM as "MemoryManager"
  participant PM as "PermissionManager"
  participant ST as "Structured Memory Store"
  participant EB as "EventBus"

  WSP->>MM: worker ended workerId taskId
  MM->>ST: load raw worker memory
  ST-->>MM: MemoryRecord list
  MM->>MM: summarize preserving decisions and constraints
  MM->>PM: check promotion to workspace scope
  PM-->>MM: allow or deny
  alt allowed
    MM->>ST: write task summary record
    MM->>ST: archive raw worker memory for replay
    MM-->>EB: memory.summarized
  else denied
    MM->>ST: archive raw worker memory only
    MM-->>EB: memory.promotion_denied
  end
```

## Related Documents

- [[MemoryManager-Part01]]
- [[MemoryManager-Part02]]
- [[MemoryManager-Part03]]
- [[MemoryManager-Part04]]
- [[MemoryManager-Part05]]
- [[ContextManager-Part01]]
- [[PermissionManager-Part01]]
- [[EventBus-Part01]]
