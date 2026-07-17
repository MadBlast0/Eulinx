---
title: WorkerCreation Diagrams
status: draft
version: 1.0
tags:
  - worker-system
  - worker-creation
  - diagrams
related:
  - "[[WorkerCreation-Part01]]"
  - "[[WorkerCreation-Part06]]"
---

# WorkerCreation Diagrams

## High-Level Flow

```mermaid
flowchart TD
  A["Creation Request"] --> B["Admission Validation"]
  B --> C["Identity Assignment"]
  C --> D["Permission Profile"]
  D --> E["Sandbox Binding"]
  E --> F["Context Package"]
  F --> G["Terminal Binding"]
  G --> H["Process Start"]
  H --> I["Worker Ready"]
```

## Rollback Flow

```mermaid
flowchart TD
  A["Step Failed"] --> B["Stop Process If Started"]
  B --> C["Close Terminal"]
  C --> D["Cleanup Sandbox"]
  D --> E["Revoke Grants"]
  E --> F["Mark Creation Failed"]
  F --> G["Emit Event"]
```

## Sequence Diagram

```mermaid
sequenceDiagram
  participant O as Orchestrator
  participant WC as WorkerCreation
  participant PM as PermissionManager
  participant CM as ContextManager
  participant WS as WorkerSpawner
  participant PL as ProcessLifecycle

  O->>WC: create worker request
  WC->>PM: attach permission profile
  WC->>CM: build context package
  WC->>WS: prepare worker
  WS->>PL: start CLI process
  PL-->>WS: process id
  WS-->>WC: worker ready
  WC-->>O: worker id
```

## ASCII Overview

```text
Request
  -> Validate
  -> Reserve identity
  -> Bind permission
  -> Create sandbox
  -> Build context
  -> Attach terminal
  -> Start process
  -> Ready
```

# Related Documents

- [[WorkerCreation-Part01]]
- [[WorkerCreation-Part06]]

