---
title: Phase2 Specification - Part 01
status: draft
version: 1.0
tags:
  - roadmap
  - phase2
  - workers
related:
  - "[[13-roadmap/README]]"
  - "[[Phase2-Part02]]"
  - "[[Phase2-Part03]]"
  - "[[Phase3-Part01]]"
---

# Phase2 Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and Spawner
Part 02 - Session System and Worker System
Part 03 - Memory System, Completion, and Handoff

# Purpose

Phase 2 makes Eulinx a real multi-worker runtime. It adds the Spawner, Session System, Worker System, and Memory on top of the Phase 1 foundation.

After Phase 2, workers can be created, isolated, tracked, communicating, and remembered across runs.

# Prerequisites

Phase 1 complete: Runtime Kernel, Event Bus, State System, Resource Manager, Scheduler.

# Scope of Phase 2

Spawner (PHASE 07): spawn manager, spawn queue, policies, worker/task/session factories, dependency resolution, validation, boot pipeline, resource reservation, cleanup, destruction, restart, recovery.

Session System (PHASE 08): session creation, metadata, persistence, snapshots, replay, resume, branches, history, context, cleanup.

Worker System (PHASE 09): worker base, manager, registry, lifecycle, messaging, context, health, recovery, scaling, pools, capabilities, coordination.

Memory (PHASE 10): STM, LTM, episodic, semantic, working memory, embeddings, search, summaries, compression, pruning, policies, manager.

# Spawner

The Spawner is HOW things are created. It turns a scheduler decision into a live worker, task, or session.

It reserves resources up front (via Resource Manager), validates the request, runs a boot pipeline, and on failure cleans up or restarts.

Workers are generic: the prompt/task defines the role, not a hardcoded "Researcher" type. See [[03-worker-system/README]].

The Spawner enables the signature behavior: workers spawn more workers, growing the graph dynamically.

# Why Spawner After Scheduler

The Scheduler decides when; the Spawner decides how. Building them in this order keeps creation logic centralized and recoverable rather than scattered across AI code.

# Related Documents

- [[Phase2-Part02]]
- [[Phase3-Part01]]
- [[03-worker-system/README]]
- [[02-runtime/README]]
