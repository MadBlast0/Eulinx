---
title: FutureIdeas Specification - Part 01
status: draft
version: 1.0
tags:
  - roadmap
  - future
related:
  - "[[13-roadmap/README]]"
  - "[[FutureIdeas-Part02]]"
  - "[[Backlog-Part01]]"
  - "[[Phase4-Part03]]"
---

# FutureIdeas Specification (Part 01)

## Document Index

Part 01 - Knowledge Base, Replay, Snapshots, Simulation Mode
Part 02 - Marketplace, Collaboration, Plugin SDK, and Scheduling

# Purpose

FutureIdeas captures concepts that are deliberately deferred past Phase 4 but are architecturally anticipated. They are designed-for, not bolted-on later.

Each idea lists what it is, why it matters, and which existing system it extends, so a future planning cycle can promote it into a concrete phase.

# Knowledge Base

Upload documentation, PDFs, repositories, and notes; agents retrieve from them via semantic search (LanceDB vectors + Tantivy). Extends [[04-memory/KnowledgeBase]].

Why: closes the "agents lack real-world knowledge" gap; lets workers ground output in project docs.

Depends on: Memory (Phase 2), Embeddings/Vector (Phase 2), Tool System (Phase 3).

# Replay and Time Travel

Record an entire execution so users can replay step by step for debugging. Extends [[04-memory/Replay/Replay-Part01]] and Session replay (Phase 2).

Why: multi-agent failures are hard to debug; replay makes the graph explainable after the fact.

Depends on: Event Bus history (Phase 1), Session replay (Phase 2), Observability tracing (Phase 4).

# Snapshots

Save the complete workspace state (files, memory, workers, artifacts) and restore later. Extends State snapshots (Phase 1) and [[04-memory/Snapshots/Snapshots-Part01]].

Why: experiment safely; branch a whole workspace; recover from bad runs.

Depends on: State System (Phase 1), Artifact System (Phase 3).

# Simulation Mode

Show what agents WOULD do without modifying files or calling external services. A dry-run of the runtime where merges are predicted, not applied.

Why: lets users validate a plan/automation before spending tokens or touching the project.

Depends on: Workflow Engine (Phase 4), Merge Manager (MVP/Phase 1), Permission Manager (Phase 3).

# Related Documents

- [[FutureIdeas-Part02]]
- [[Backlog-Part01]]
- [[04-memory/README]]
- [[Phase4-Part03]]
