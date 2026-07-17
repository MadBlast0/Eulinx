---
title: Contracts Diagrams
status: draft
version: 1.0
tags:
  - api
  - contracts
  - diagrams
related:
  - "[[Contracts-Part01]]"
  - "[[Contracts-Part02]]"
  - "[[Contracts-Part03]]"
  - "[[Contracts-Part04]]"
  - "[[Contracts-Part05]]"
  - "[[Contracts-Part06]]"
  - "[[15-api/README]]"
  - "[[IPC-Diagrams]]"
---

# Contracts Diagrams

Every flow below is rendered as overview mermaid, detailed mermaid, ASCII, and sequence.

## Command to Event Mapping

### Overview

```mermaid
flowchart LR
  CMD["invoke: spawn_worker"] --> EVT["Eulinx://worker/spawned"]
  CMD2["invoke: merge_artifact"] --> EVT2["Eulinx://artifact/merged"]
```

### Detailed

```mermaid
flowchart TD
  UI["UI"] --> INV["invoke('spawn_worker', req)"]
  INV --> H["cmd_spawn_worker"]
  H --> WS["WorkerSpawner.spawn"]
  WS --> SUM["WorkerSummary"]
  H --> RET["return result | ApiError"]
  WS -.-> BUS["EventBus.publish"]
  BUS -.-> EVT["Eulinx://worker/spawned (RG yes)"]
  UI -.-> L["listen('Eulinx://worker/spawned')"]
```

### ASCII

```text
command (Contracts-Part01)        event (Contracts-Part02)
---------------------------        -------------------------
spawn_worker      -> WorkerSpawner -> Eulinx://worker/spawned
terminate_worker  -> WorkerSpawner -> Eulinx://worker/terminated
merge_artifact    -> MergeManager  -> Eulinx://artifact/merged
request_lock      -> LockManager   -> Eulinx://lock/granted | Eulinx://lock/denied
request_verification -> Verifier   -> Eulinx://artifact/verified

Every command result that succeeds is mirrored by a replay-grade event.
```

### Sequence

```mermaid
sequenceDiagram
  participant U as "UI"
  participant R as "Runtime"
  participant B as "EventBus"

  U->>R: invoke("merge_artifact", req)
  R->>R: MergeManager.submit
  R-->>U: MergeReceipt | ApiError
  R-)B: Eulinx://artifact/merged (RG yes)
  B-)U: listen delivers event
```

## Error Envelope Flow

### Overview

```mermaid
flowchart LR
  H["Handler"] --> E["ApiError {code}"]
  E --> UI["UI branches on code"]
```

### Detailed

```mermaid
flowchart TD
  H["cmd_request_lock"] --> CK["PermissionManager.check"]
  CK -->|"deny"| DENY["ApiError{permission_denied}"]
  CK -->|"allow"| LM["LockManager.request"]
  LM -->|"held"| CONF["ApiError{lock_conflict, owner, retryable:true}"]
  LM -->|"free"| OK["LockGrant"]
  DENY --> RET["reject envelope"]
  CONF --> RET
  OK --> RET2["resolve result"]
  RET --> UI["branch on code"]
  RET2 --> UI
```

### ASCII

```text
Handler maps every failure to ApiError{code}:
  validation_error      (non-retryable, field named)
  workspace_scope_mismatch (non-retryable)
  permission_denied     (non-retryable)
  approval_required     (non-retryable)
  lock_conflict         (RETRYABLE, owner in context)
  merge_conflict        (RETRYABLE, conflict_ids)
  artifact_verify_failed (non-retryable)
  internal_error        (non-retryable, trace_id)
  runtime_unavailable   (non-retryable -> degraded UI)

UI branches on `code` only, never on `message`.
```

### Sequence

```mermaid
sequenceDiagram
  participant U as "UI"
  participant H as "Handler"
  participant P as "PermissionManager"

  U->>H: invoke("request_lock")
  H->>P: check
  P-->>H: deny
  H-->>U: ApiError{permission_denied}
  U->>U: show denied, no retry
```

## Versioning Boundary

### Overview

```mermaid
flowchart TD
  C["Contracts (single version)"] --> IPC["IPC"]
  C --> FE["FrontendAPI"]
  C --> RS["RustAPI"]
  C --> SVC["ServiceAPI"]
  C --> PL["PluginAPI"]
  C --> EV["EventAPI"]
```

### ASCII

```text
ONE API version (MAJOR.MINOR.PATCH) spans all six topics.

Breaking change anywhere -> MAJOR bump:
  - command renamed/removed (Part01)
  - event renamed/removed (Part02)
  - required field changed (Part03)
  - enum meaning changed (Part04)
  - error code removed/changed (Part05)

Additive change -> MINOR bump:
  - new command / event / optional field / error code

All three representations move together:
  Rust struct == TS type == internal type
```

### Sequence

```mermaid
sequenceDiagram
  participant D as "Dev"
  participant C as "Contracts"
  participant R as "Rust/TS"

  D->>C: add optional field to merge_artifact
  C->>C: bump MINOR (additive)
  D->>R: update struct + type together
  Note over D,R: wire stays compatible, no MAJOR bump
```

## Related Documents

- [[Contracts-Part01]]
- [[Contracts-Part02]]
- [[Contracts-Part03]]
- [[Contracts-Part04]]
- [[Contracts-Part05]]
- [[Contracts-Part06]]
- [[15-api/README]]
- [[IPC-Diagrams]]
