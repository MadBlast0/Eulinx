---
title: ImplementationOrder Diagrams
status: draft
version: 1.0
tags: [ai-context, diagrams]
related: ["[[ImplementationOrder-Part01]]"]
---

# ImplementationOrder Diagrams

```mermaid
flowchart TD
  P00["PHASE 00: Project setup\nTauri v2 + React19 + TS + Vite + pnpm\ndesign-system skeleton"] --> P01
  P01["PHASE 01: Runtime kernel\nRuntimeManager, EventBus, Zustand\nbudgets, Scheduler"] --> P02
  P02["PHASE 02: Spawner + sessions\nWorkerSpawner, Session, lifecycle, memory"] --> P03
  P03["PHASE 03: Artifacts + capabilities\nArtifactManager, Providers, Tools\nPermissions, Lock, Merge, Verifier"] --> P04
  P04["PHASE 04: Orchestration + workflow\nOrchestrators, WF Engine, Nodes/Edges\nloops/conditions, MCP nodes"] --> P05
  P05["PHASE 05+: UI surfaces\nReact Flow, xterm.js, panels, CLI"] --> PXX
  PXX["Later: Observability + polish\nmetrics, replay, snapshots, marketplace"]

  P00 -.->|"MVP must prove headless first"| MVP["Worker -> Artifact -> Verifier -> Merge -> Workspace"]
  MVP -.-> P05
```

```text
DEPENDENCY ORDER  (later phase starts only after prereqs tested)

P00  project setup ........ Tauri/React/TS/Vite/pnpm + design skeleton
  |
P01  runtime kernel ........ RuntimeManager, EventBus, Zustand, budgets, Scheduler
  |
P02  spawner + sessions .... WorkerSpawner, Session, lifecycle, basic memory
  |
P03  artifacts + caps ..... ArtifactManager, Providers, Tools, Permissions, Lock, Merge, Verifier
  |
P04  orchestration + WF ... Orchestrators, WF Engine, Node/Edge, loops, MCP nodes
  |
P05+ UI surfaces .......... React Flow, xterm.js, panels, animations, CLI
  |
LATER observability+polish  metrics, notifications, KB, replay, snapshots, marketplace

MVP FIRST: prove headless core loop before any UI
  Worker spawns -> Artifact -> Verifier -> MergeManager -> Workspace
```

# Related Documents

- [[ImplementationOrder-Part01]]
- [[06-workflow-engine/README]]
- [[07-ui-ux/README]]
- [[04-memory/README]]
- [[12-development/README]]
