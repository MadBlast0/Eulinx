---
title: ArchitectureSummary - Part 05
status: draft
version: 1.0
tags:
  - ai-context
  - architecture
  - workers
  - workflow
  - memory
  - plugins
  - Eulinx
related:
  - "[[99-ai-context/README_FOR_AI]]"
  - "[[99-ai-context/ArchitectureSummary/ArchitectureSummary-Part04]]"
  - "[[99-ai-context/Terminology/Terminology-Part01]]"
---

# ArchitectureSummary (Part 05) — Workers, Workflows, Memory, Plugins

## Document Index

Part 01 - The layered model and the separation of AI from runtime
Part 02 - Frontend (React/TS) shape
Part 03 - Backend (Rust thin bridge) shape
Part 04 - Runtime services and the EventBus
Part 05 - Workers, Workflows, Memory, Plugins

## Workers and the hierarchy

The product is centered on the **Worker**. A Worker is a running AI terminal. Workers are generic — the prompt determines what they do (reviewer, planner, tester, coder); there is no fixed personality catalog.

Workers organize into a hierarchy that mirrors a software org:

```text
User
  -> Root Orchestrator
    -> Phase Orchestrators
      -> Task Orchestrators
        -> Workers
          -> Tools
            -> Artifacts
```

Orchestrators are AI planners; they split goals into phases, delegate to sub-orchestrators, and aggregate progress summaries upward (worker → task → phase → project). A Worker can spawn more Workers (hierarchical fan-out), each with its own context window — context isolation is what keeps the system reliable and cheap.

## Workflows

A Workflow is a directed graph of Nodes and Edges describing structure, order, and data movement. The Workflow Engine reads the graph and turns it into work by dispatching to the ExecutionEngine. Node types include Worker/terminal nodes, tool nodes, logic gates (if/AND/OR/NOR, switch, threshold), I/O nodes, builder/verifier nodes, and MCP capability nodes. The graph can grow dynamically as orchestrators rewrite the plan. Data flow (payloads) and control flow (gate decisions) are shown with distinct edge styles.

## Memory

Memory is scoped and never a raw transcript dump. Layers include Workspace, Project, Session, Execution, Orchestrator, Task, Worker, Temporary, Long-Term, Vector, Knowledge Base, and Replay. Selective injection means a Worker receives the task + relevant channel summaries + the specific upstream Artifact — not the entire history. Long histories are summarized before injection. Memory MUST respect workspace boundaries, MUST NOT expose secrets by default, and MUST be deletable per retention policy.

## Plugins

Plugins are third-party code Eulinx did not write, review, or vouch for, running next to the user's source, credentials, and keys. Therefore plugins are isolated and untrusted by default. They extend Eulinx through a defined SDK and hook system (adding node types, providers, tools, panels) and integrate with MCP. Plugin code MUST NOT be loaded in-process as trusted; it is sandboxed and permission-gated.

## AI Notes

Do not treat the terminal as the primary object at the data-model level. The Agent/Worker is primary; the terminal is one view of it.

Do not send raw chat between workers. Exchange Artifacts and scoped memory.

Do not load plugins as trusted in-process code.

## Related Documents

- [[99-ai-context/Terminology/Terminology-Part01]]
- [[01-core-concepts/README]]
- [[03-worker-system/README]]
- [[06-workflow-engine/README]]
- [[04-memory/README]]
- [[09-plugin-system/README]]
