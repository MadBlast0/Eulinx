---
title: Phase2 Specification - Part 03
status: draft
version: 1.0
tags:
  - roadmap
  - phase2
  - memory
related:
  - "[[Phase2-Part01]]"
  - "[[Phase2-Part02]]"
  - "[[Phase3-Part01]]"
---

# Phase2 Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and Spawner
Part 02 - Session System and Worker System
Part 03 - Memory System, Completion, and Handoff

# Memory System

The Memory system gives workers durable, scoped, searchable recall. It is defined fully in [[04-memory/README]].

Layers added in Phase 2:

- Short-Term Memory (STM): active working context for a running worker/session.
- Long-Term Memory (LTM): persisted facts, decisions, artifacts references.
- Episodic: sequence of what happened in a session/workflow.
- Semantic: extracted knowledge (summarized, de-duplicated).
- Working Memory: the assembled context package for the current step.
- Embeddings + Vector Memory: semantic search over memories via LanceDB.
- Search (Tantivy) and Summaries/Compression/Pruning: keep memory useful, not noisy.
- Memory Policies + Memory Manager: retention, redaction, scope enforcement.

Memory MUST be scoped to workspace boundaries, MUST NOT expose secrets by default, and SHOULD prefer artifact references over copied content.

# Acceptance for Phase 2

Spawner can create, restart, and destroy workers/tasks/sessions; failures are cleaned up.

Sessions persist, snapshot, resume, and branch; replay reconstructs a session.

Worker lifecycle states are observable and emitted as events; health recovery works.

Workers communicate via channels + artifacts; no full-transcript passing.

Memory is scoped, searchable (Tantivy + vector), summarizable, and injectable via ContextManager hooks.

# Build Order Within Phase 2

1. Spawner (creation pipeline + recovery).
2. Session System (persistence, snapshots, resume).
3. Worker System (lifecycle, messaging, health, scaling, coordination).
4. Memory (layers, embeddings, search, policies, manager).

# Risks

Memory cost: summaries and pruning must run or memory grows unbounded; budget this.

Worker explosion: the "workers spawn workers" feature needs the Scheduler's concurrency limits and the Resource Manager's budgets to stay safe.

Context leakage: injection must enforce scope and redaction or workers see cross-project data.

# Handoff to Phase 3

Phase 3 adds Artifacts (formal system), Providers (multi-model), Prompts, Tools, and Security — giving workers real capabilities and permission control on top of the runtime/memory foundation.

# Related Documents

- [[Phase3-Part01]]
- [[Phase2-Part01]]
- [[04-memory/README]]
- [[03-worker-system/README]]
