---
title: ServiceAPI Specification - Part 01
status: draft
version: 1.0
tags:
  - api
  - service-api
  - runtime
  - internal
related:
  - "[[15-api/README]]"
  - "[[ServiceAPI-Part02]]"
  - "[[ServiceAPI-Part03]]"
  - "[[ServiceAPI-Part04]]"
  - "[[RustAPI-Part01]]"
  - "[[02-runtime/README]]"
---

# ServiceAPI Specification (Part 01)

## Document Index

Part 01 - The internal service-to-service boundary, in-process calls, and service traits
Part 02 - The service call graph and who may call whom
Part 03 - The in-process message shapes and the no-Tauri rule
Part 04 - The service rules: deterministic, no LLM, business logic lives here

# Purpose

ServiceAPI is the boundary between Eulinx's internal runtime services. Unlike IPC (UI ↔ Runtime) and PluginAPI (host ↔ plugin), this boundary never crosses Tauri and never leaves the Rust process. It is how the deterministic runtime services coordinate: the Scheduler tells the WorkerSpawner to spawn, the WorkerSpawner asks the LockManager for a lock, the MergeManager asks the ArtifactManager for an Artifact, and so on. It is the connective tissue of [[02-runtime/README]].

# In-Process, Not IPC

ServiceAPI calls are direct in-process calls: one Rust service holds a handle (or a tokio channel sender) to another and calls a typed method. There is no serialization, no Tauri, no network. The performance-critical paths (per-chunk terminal output, per-event publication) MUST be in-process because crossing Tauri for every internal step would be catastrophic.

The boundary exists as a discipline, not a transport: each service exposes a typed trait or a message enum, and callers depend on the trait, not on internals. This keeps services replaceable and testable and keeps business logic out of the command layer ([[RustAPI-Part01]]).

# The Services

The services that participate in ServiceAPI, all defined in [[02-runtime/README]], are:

- RuntimeManager — the hidden supervisor; owns lifecycle and dispatch
- Scheduler — queues, concurrency, retries, budgets
- WorkerSpawner — creates and destroys Workers (PTY-backed)
- ExecutionEngine — runs a Task/Execution to completion
- WorkspaceManager — workspace/project isolation and storage
- MemoryManager — memory routing and retention
- ContextManager — selective context injection
- ArtifactManager — Artifact creation, versioning, storage
- MergeManager — patch application and conflict resolution
- LockManager — file and symbol locking
- PermissionManager — capability and approval authority
- ToolRegistry — the catalog of every Tool
- EventBus — the fact broadcaster (see [[EventBus-Part01]])
- ProcessLifecycle — PTY process lifecycle (bridges to RustAPI native PTY)
- RuntimeRules — the invariant enforcer

# Service Traits

Each service exposes a trait such as `WorkerSpawner: spawn(args) -> Result<WorkerSummary, ServiceError>`. The trait is the ServiceAPI contract for that service. A caller depends on the trait; the concrete implementation is injected at startup. This is what lets the cheap coding model change an implementation without touching callers, and lets tests inject a fake.

# Who Owns Business Logic

The divide stated in the product vision ([[01-core-concepts/README]]): the AI layer plans and reasons; the runtime services are deterministic and do the mechanical work. ServiceAPI is where that deterministic work lives. Scheduling, locking, merging, permission checks, artifact storage, and event publication are all ServiceAPI. The LLM calls, refinement loops, and orchestration plans live in the AI/TS layer that drives these services through commands. A service MUST NOT call an LLM (see [[ServiceAPI-Part04]]).

# AI Notes

Do not cross Tauri between services. If you wrote `invoke` inside a service, you misidentified the boundary; call the trait directly.

Do not put business logic in a command handler and call a service that is a dumb pass-through. Either the logic is in the service (preferred) or it is in TS orchestration; the handler is a thin façade.

Do not give a service an LLM client. Runtime services are deterministic; model calls belong to the AI layer that issued the command.

Do not depend on a service's internals. Depend on its trait. Internals change; the trait is the contract.

# Related Documents

- [[15-api/README]]
- [[ServiceAPI-Part02]]
- [[ServiceAPI-Part03]]
- [[ServiceAPI-Part04]]
- [[RustAPI-Part01]]
- [[02-runtime/README]]
- [[EventBus-Part01]]
- [[01-core-concepts/README]]
