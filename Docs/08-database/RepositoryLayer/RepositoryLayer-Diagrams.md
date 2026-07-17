---
title: RepositoryLayer Diagrams
status: draft
version: 1.0
tags:
  - database
  - diagrams
related:
  - "[[RepositoryLayer-Part01]]"
---

# RepositoryLayer Diagrams

```mermaid
flowchart TD
  TS["TypeScript service"] --> IPC["Tauri IPC invoke"]
  IPC --> REG["RepositoryRegistry"]
  REG --> MOD["Repository module (e.g. workers)"]
  MOD --> VAL["Validate boundary"]
  VAL -->|"fail"| ERR["typed error"]
  VAL -->|"pass"| TX["BEGIN"]
  TX --> ST["State change (SQLx)"]
  TX --> HIST["History row (HistoryTables writer)"]
  ST --> CM["COMMIT"]
  HIST --> CM
  CM --> PUB["EventBus publish (post-commit)"]
  PUB --> PROJ["Projection -> event_log"]
  MOD --> POOL["SQLx pool (foreign_keys ON)"]
```

```mermaid
flowchart TD
  subgraph READ["Read path"]
    R1["list_workers / get_graph / query_memory"] --> R2["workspace-scoped SQL"]
    R2 --> R3["paginated, soft-delete filtered"]
  end
  subgraph WRITE["Write path"]
    W1["create_worker / persist_run_state"] --> W2["validate + encrypt"]
    W2 --> W3["tx: state + history"]
    W3 --> W4["commit -> publish event"]
  end
```

# ASCII Overview

```text
Tauri IPC
   |
   v
RepositoryRegistry  (built after Versioning gate)
   |
   +-- workers / workflows / artifacts / memory / settings / logs / plugins
   |
   v
Validation -> Transaction(state + history) -> Commit -> EventBus -> event_log
   |
   v
SQLx pool  (foreign_keys = ON, WAL, reserved hot connections)
```
