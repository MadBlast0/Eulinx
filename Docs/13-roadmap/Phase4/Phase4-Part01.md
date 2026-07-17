---
title: Phase4 Specification - Part 01
status: draft
version: 1.0
tags:
  - roadmap
  - phase4
  - orchestrators
  - workflow-engine
related:
  - "[[13-roadmap/README]]"
  - "[[Phase4-Part02]]"
  - "[[Phase4-Part03]]"
  - "[[FutureIdeas-Part01]]"
---

# Phase4 Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and Orchestrators
Part 02 - Workflow Engine, CLI, and UI
Part 03 - Observability, Completion, and Product Readiness

# Purpose

Phase 4 turns the engine into the Eulinx product: a usable local-first desktop studio with orchestration, visual workflows, a CLI, rich UI surfaces, and observability.

After Phase 4, Eulinx delivers the wedge: visually orchestrate a team of AI workers, with the refinement slider, live data-flow, and MCP capabilities.

# Prerequisites

Phase 3 complete: Artifacts, Providers, Prompts, Tools, Security.

# Scope of Phase 4

Orchestrators (PHASE 16): planner, architect, researcher, programmer, reviewer, debugger, documentation, QA, release, coordinator.

Workflow Engine (PHASE 17): manager, DAG, dependencies, branches, parallelism, human approval, retry, resume, checkpoints, templates.

CLI (PHASE 18): init, doctor, runtime, scheduler, spawn, worker, session, memory, artifact, provider, workflow, prompt, tool, config, plugin, update.

UI (PHASE 19): dashboard, runtime monitor, worker explorer, session viewer, memory browser, artifact browser, prompt inspector, workflow designer, logs, metrics, cost dashboard, settings.

Observability (PHASE 20): metrics, tracing, profiling, health checks, alerts, analytics, usage, cost tracking, performance.

# Orchestrators

The Orchestrator is the AI planning/coordination layer, separated from deterministic runtime services (per [[02-runtime/README]]).

Orchestrators form a hierarchy: Root → Phase → Task → Worker. The root breaks a goal into phases; phase orchestrators own their workers, memory, budget, and artifacts; workers do the execution.

Orchestrators rewrite plans as they learn (the graph grows). They aggregate progress upward (worker → task → phase → project) so the user sees summaries, not noise.

Crucially, orchestrators are AI roles layered on generic workers; the runtime services (Scheduler, Merge, Lock, Permission, Memory, Artifact, Tool, EventBus, Workspace) remain deterministic and LLM-free.

# Why Phase 4 Last

Orchestrators and the workflow engine are the most complex AI-bearing components. Building them after the deterministic foundation means they orchestrate reliable primitives instead of reinventing them.

# Related Documents

- [[Phase4-Part02]]
- [[FutureIdeas-Part01]]
- [[06-workflow-engine/README]]
- [[10-ai-system/README]]
