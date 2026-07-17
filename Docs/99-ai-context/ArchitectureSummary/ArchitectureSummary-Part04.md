---
title: ArchitectureSummary - Part 04
status: draft
version: 1.0
tags:
  - ai-context
  - architecture
  - runtime
  - eventbus
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part03]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part05]]"
  - "[[02-runtime/README]]"
---

# ArchitectureSummary (Part 04) — Runtime Services and the EventBus

## Document Index

Part 01 - The layered model and the separation of AI from runtime
Part 02 - Frontend (React/TS) shape
Part 03 - Backend (Rust thin bridge) shape
Part 04 - Runtime services and the EventBus
Part 05 - Workers, Workflows, Memory, Plugins

## Deterministic runtime services

The Runtime is the operating layer beneath Workers, Orchestrators, Workflows, Tools, Artifacts, Permissions, Memory, and Sessions. These services are deterministic and do NOT use an LLM:

- **RuntimeManager**: owns process lifecycle, admission, and cleanup.
- **Scheduler**: queues and dispatches work respecting concurrency limits and the [[05-artifacts/README]] budgets.
- **WorkerSpawner**: creates and destroys Worker processes.
- **ExecutionEngine**: runs an approved unit of work; picks an adapter, supervises a process, captures output, returns a result. It does not know what a graph is.
- **MergeManager**: applies verified Artifact patches to the workspace, with conflict detection and verification.
- **LockManager**: owns files/symbols so concurrent workers do not corrupt each other's edits.
- **PermissionManager**: enforces per-Worker permission grants (read/write/delete/git/push/browser/docker/ssh/etc.).
- **MemoryManager / ContextManager**: scope, retrieve, summarize, and inject memory.
- **ArtifactManager**: stores, versions, and relates Artifacts.
- **ToolRegistry**: the single catalog of every tool Workers may receive.
- **EventBus**: the publish/subscribe backbone every Worker, terminal, workflow, and plugin uses.

## The EventBus

Everything emits events: Task Started, Task Finished, File Changed, Git Commit, Terminal Closed, Workflow Started/Finished, AI Response, Plugin Installed, Window Opened. The EventBus is the only mechanism by which the backend pushes truth to the UI (`listen`) and by which plugins observe the system. This is what makes plugins powerful and the UI a pure reflector.

## Worker safety model

Workers never directly modify the project. A Worker produces an **Artifact**; the Artifact becomes a patch; the **Verifier** checks it (objective: build/lint/test; heuristic: LLM-judge, labeled "suggested"); the **MergeManager** applies it under **LockManager** control. This rule is non-negotiable.

## AI Notes

Do not mutate workspace state outside the Artifact → Verifier → MergeManager path.

Do not skip locks. Concurrent workers WILL corrupt shared files without the LockManager.

Do not make runtime services call an LLM. Keep them deterministic.

## Related Documents

- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part03]]
- [[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part05]]
- [[02-runtime/README]]
- [[05-artifacts/README]]
