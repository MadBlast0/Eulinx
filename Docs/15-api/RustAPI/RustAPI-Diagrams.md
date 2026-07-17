---
title: RustAPI Diagrams
status: draft
version: 1.0
tags:
  - api
  - rust-api
  - diagrams
related:
  - "[[RustAPI-Part01]]"
  - "[[RustAPI-Part02]]"
  - "[[RustAPI-Part03]]"
  - "[[RustAPI-Part04]]"
  - "[[15-api/README]]"
  - "[[IPC-Diagrams]]"
  - "[[ServiceAPI-Diagrams]]"
---

# RustAPI Diagrams

Every flow below is rendered as overview mermaid, detailed mermaid, ASCII, and sequence.

## Command Handler Flow

### Overview

```mermaid
flowchart LR
  INV["invoke"] --> H["Handler"]
  H --> P["PermissionManager"]
  H --> S["ServiceAPI"]
  S --> RET["Result | ApiError"]
```

### Detailed

```mermaid
flowchart TD
  INV["invoke('spawn_worker')"] --> H["cmd_spawn_worker"]
  H --> SC["1. scope check"]
  SC --> V["2. validate args"]
  V --> A["3. PermissionManager.check"]
  A -->|"deny"| DENY["return permission_denied"]
  A -->|"allow"| D["4. delegate to WorkerSpawner"]
  D --> M["5. map result/error"]
  M --> R["6. return Result | ApiError"]
  D -.-> EVT["service publishes Eulinx://worker/spawned"]
```

### ASCII

```text
invoke("spawn_worker", args)
   |
   v
cmd_spawn_worker
   1. scope: workspace_id present & attached?  -> else workspace_scope_mismatch
   2. validate: required fields, enum, size     -> else validation_error(field)
   3. authorize: PermissionManager.check        -> else permission_denied
   4. delegate: WorkerSpawner.spawn(args, cid)  <- ONLY step with side effects
   5. map: Ok -> result, Err -> ApiError(code)
   6. return
   |
   v
Tauri serializes Result | ApiError envelope
```

### Sequence

```mermaid
sequenceDiagram
  participant F as "Frontend"
  participant H as "Handler"
  participant P as "PermissionManager"
  participant S as "WorkerSpawner"

  F->>H: invoke("spawn_worker")
  H->>P: check(spawn_worker, ws)
  P-->>H: allow
  H->>S: spawn(args, correlationId)
  S-->>H: WorkerSummary
  H-->>F: Result(WorkerSummary)
  S-)H: Eulinx://worker/spawned (via EventBus)
```

## Native OS Surface

### Overview

```mermaid
flowchart TD
  H["Handler / Service"] --> NAT["Native Utilities"]
  NAT --> FS["Filesystem"]
  NAT --> PTY["PTY"]
  NAT --> WIN["Window"]
  NAT --> SEC["Secure Store"]
  NAT --> DLG["Dialogs"]
```

### Detailed

```mermaid
flowchart TD
  SVC["Runtime Service"] --> FS["fs util: scoped read/write/watch"]
  SVC --> PTY["pty util: spawn, bridge, resize"]
  CMD["Command"] --> WIN["window util: minimize/max/theme"]
  CMD --> SEC["secure store: get key at call time"]
  CMD --> DLG["dialog util: picker / confirm"]
  FS --> NOH["no fd crosses boundary"]
  PTY --> NOH2["no master fd crosses boundary"]
  SEC --> NOSEC["no key crosses boundary"]
```

### ASCII

```text
Rust native utilities (the ONLY Rust responsibilities):
  fs       -> scoped to workspace root, streams, watches, no fd returned
  pty      -> spawn shell/CLI, bridge output->events, resize, no master fd returned
  window   -> minimize/maximize/title/theme, OS-level only
  secure   -> keychain/secret-service, key yielded only at outbound call, never returned
  dialog   -> file/folder picker, destructive confirm (feeds approval gate)
```

### Sequence

```mermaid
sequenceDiagram
  participant S as "Service"
  participant P as "PTY Util"
  participant B as "EventBus"
  participant F as "Frontend"

  S->>P: spawn(cli, workspaceId)
  P->>P: fork process, bridge stdout
  loop "output chunks"
    P-)B: Eulinx://worker/output_streamed
    B-)F: batched event
  end
  P-)B: Eulinx://worker/process_exited
```

## Related Documents

- [[RustAPI-Part01]]
- [[RustAPI-Part02]]
- [[RustAPI-Part03]]
- [[RustAPI-Part04]]
- [[15-api/README]]
- [[IPC-Diagrams]]
- [[ServiceAPI-Diagrams]]
