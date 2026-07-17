---
title: ServiceAPI Specification - Part 02
status: draft
version: 1.0
tags:
  - api
  - service-api
  - call-graph
related:
  - "[[15-api/README]]"
  - "[[ServiceAPI-Part01]]"
  - "[[ServiceAPI-Part03]]"
  - "[[ServiceAPI-Part04]]"
  - "[[02-runtime/README]]"
  - "[[EventBus-Part01]]"
---

# ServiceAPI Specification (Part 02)

## Document Index

Part 01 - The internal service-to-service boundary, in-process calls, and service traits
Part 02 - The service call graph and who may call whom
Part 03 - The in-process message shapes and the no-Tauri rule
Part 04 - The service rules: deterministic, no LLM, business logic lives here

# Purpose

This part specifies the service call graph: which service may call which, and the rule that services communicate facts through the EventBus rather than by reaching into each other's state. The call graph prevents circular dependencies and keeps the runtime acyclic and testable.

# The Call Graph

The allowed caller → callee edges (a service may call the callee's trait):

```text
RuntimeManager    -> Scheduler, WorkerSpawner, WorkspaceManager, EventBus, RuntimeRules
Scheduler         -> WorkerSpawner, ExecutionEngine, LockManager, PermissionManager
WorkerSpawner     -> ProcessLifecycle, LockManager, PermissionManager, ArtifactManager, EventBus
ExecutionEngine   -> WorkerSpawner, ToolRegistry, MemoryManager, ContextManager, ArtBus, LockManager
WorkspaceManager  -> PermissionManager, EventBus
MemoryManager     -> ContextManager, EventBus, (SQLite / LanceDB / Tantivy stores)
ContextManager    -> MemoryManager, EventBus
ArtifactManager   -> MergeManager, LockManager, PermissionManager, EventBus
MergeManager      -> ArtifactManager, LockManager, Verifier, EventBus
LockManager       -> EventBus
PermissionManager -> EventBus
ToolRegistry      -> EventBus
EventBus          -> (subscribers only: log, replay, UI bridge, plugins)
ProcessLifecycle  -> EventBus, WorkerSpawner
RuntimeRules      -> (invariant checks across services)
```

# The No-Reach-In Rule

A service MUST NOT read or mutate another service's internal state directly. If WorkerSpawner needs to know a lock is free, it calls `LockManager.is_free`, it does not inspect the LockManager's map. State is owned by exactly one service; everyone else asks. This is the internal equivalent of the Tier 1 single-owner rule on the frontend ([[FrontendAPI-Part02]]).

# Facts Travel via the EventBus

When a service completes an action whose observers (UI, log, replay, plugins) need to know, it publishes an event on the EventBus ([[EventBus-Part01]]). It does NOT call those observers directly. So WorkerSpawner, after spawning, publishes `Eulinx://worker/spawned` and lets the EventBus fan it out. This is why the call graph above shows `EventBus` as a leaf: every service may publish, but no service is "called back" by the bus. The EventBus is a broadcast, not a service ([[EventBus-Part01]]).

# Acyclic Dependency

The call graph MUST remain acyclic. If service A calls B and B calls A, one of them is doing the other's job. RuntimeRules exists to assert invariants across services without becoming a callee in a cycle; it is consulted, not depended on for steady-state flow.

# Scheduler as the Orchestration Boundary

The Scheduler is the service most other services talk to for "do this next". It is the deterministic counterpart to the AI orchestrator: the AI layer decides *what* to do and *in what hierarchy*; the Scheduler decides *when* a Worker runs given concurrency, budget, and locks. Keeping the Scheduler as the single admission point prevents ad-hoc spawning from bypassing budgets.

# AI Notes

Do not reach into another service's state. Call its trait. A direct field read is a hidden coupling that breaks the moment the owner refactors.

Do not make the call graph cyclic. If A needs B and B needs A, extract the shared decision into a third service or into RuntimeRules.

Do not call observers directly. Publish an event; the EventBus fans out. Direct calls bypass replay and the plugin queue.

Do not let a Worker spawn outside the Scheduler. Ad-hoc spawning defeats concurrency and budget control.

# Related Documents

- [[15-api/README]]
- [[ServiceAPI-Part01]]
- [[ServiceAPI-Part03]]
- [[ServiceAPI-Part04]]
- [[02-runtime/README]]
- [[EventBus-Part01]]
- [[FrontendAPI-Part02]]
- [[RuntimeRules-Part01]]
