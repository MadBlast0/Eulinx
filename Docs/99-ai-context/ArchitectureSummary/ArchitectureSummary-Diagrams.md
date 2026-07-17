---
title: ArchitectureSummary Diagrams
status: draft
version: 1.0
tags:
  - ai-context
  - architecture
  - diagrams
  - Eulinx
related:
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part01]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part05]]"
---

# ArchitectureSummary Diagrams

## Overall Layered Architecture

```mermaid
flowchart TD
  UI["React UI (reflects state)"]
  SVC["TypeScript Services Layer"]
  IPC["Tauri IPC invoke / listen"]
  RUST["Rust Thin Backend (native OS)"]
  UI --> SVC
  SVC -->|invoke| IPC
  IPC --> RUST
  RUST -->|EventBus events| IPC
  IPC -->|listen| UI
```

```text
UI (React)
  -> Services (TS)
    -> invoke -> Rust (thin)
  <- listen <- EventBus
```

## AI vs Runtime Separation

```mermaid
flowchart LR
  AI["AI Layer: Orchestrators, Workers, Planning, Refinement"]
  RT["Runtime Layer: Scheduler, Merge, Lock, Permission, Memory, EventBus"]
  AI -->|requests work| RT
  RT -->|safe execution| AI
```

```text
AI Layer  (reasons, plans, critiques)
Runtime Layer (deterministic: schedule, lock, merge, enforce)
```

## Worker Hierarchy

```text
User
  -> Root Orchestrator
    -> Phase Orchestrators
      -> Task Orchestrators
        -> Workers
          -> Tools -> Artifacts
```

## Artifact / Merge Flow

```mermaid
flowchart LR
  W["Worker"] --> A["Artifact"]
  A --> V["Verifier"]
  V --> M["Merge Manager"]
  M --> L["Lock Manager"]
  L --> WS["Workspace"]
```

```text
Worker -> Artifact -> Verifier -> Merge Manager -> Lock Manager -> Workspace
```

## EventBus

```text
Publishers: Workers, Terminals, Workflows, Plugins, Runtime Services
Channel:    EventBus (publish / subscribe)
Subscribers: UI (listen), Plugins, Runtime Services
```

## Related Documents

- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part01]]
- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part05]]
- [[02-runtime/README]]
