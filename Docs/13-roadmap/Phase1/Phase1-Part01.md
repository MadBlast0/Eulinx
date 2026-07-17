---
title: Phase1 Specification - Part 01
status: draft
version: 1.0
tags:
  - roadmap
  - phase1
  - runtime
related:
  - "[[13-roadmap/README]]"
  - "[[Phase1-Part02]]"
  - "[[Phase1-Part03]]"
  - "[[Phase2-Part01]]"
---

# Phase1 Specification (Part 01)

## Document Index

Part 01 - Purpose, Scope, and Runtime Kernel
Part 02 - Event Bus, State System, Resource Manager
Part 03 - Scheduler, Completion, and Handoff

# Purpose

Phase 1 builds the deterministic execution foundation that every later system depends on.

The MVP proved the loop with a minimal runtime manager. Phase 1 replaces that with the real Runtime Kernel, a universal Event Bus, a persistent State System, a Resource Manager, and a Scheduler.

After Phase 1, Eulinx "knows WHEN and HOW work executes" and every subsystem communicates only through events.

# Implementation-Flow Mapping

Roadmap Phase 1 is a macro-phase that maps onto Implementation-Flow PHASE 00–06. The PHASE numbers referenced below (e.g. PHASE 02, PHASE 03) are the low-level Implementation-Flow phases defined in `Implementation-Flow.md`, not separate roadmap phases. The full macro-to-micro mapping is in [[13-roadmap/README]]:

- PHASE 00 — Project Initialization (part of the MVP foundation; also covered by Phase 1's setup)
- PHASE 01 — Foundation (prerequisite, see Prerequisites)
- PHASE 02 — Runtime Kernel
- PHASE 03 — Event Bus
- PHASE 04 — State System
- PHASE 05 — Resource Manager
- PHASE 06 — Scheduler

Roadmap Phase 2 picks up at PHASE 07 (Spawner); Phase 3 at PHASE 11 (Artifact System); Phase 4 at PHASE 16 (Orchestrators).

# Prerequisites

MVP complete and demoable.

Foundation package (PHASE 01) stable.

No AI features beyond single-provider streaming yet.

# Scope of Phase 1

Runtime Kernel (PHASE 02): Runtime Manager, lifecycle, bootstrap, shutdown, registry, configuration, state, diagnostics, health, recovery, APIs.

Event Bus (PHASE 03): bus, dispatcher, subscribers, publishers, queue, replay, history, dead-letter queue, middleware, priorities, async events, registry.

State System (PHASE 04): runtime/worker/session/workflow/artifact/task state, persistence, snapshots, recovery.

Resource Manager (PHASE 05): CPU, memory, disk, network, GPU, token budget, cost budget, quotas, limits, monitoring.

Scheduler (PHASE 06): queue, priority queue, FIFO, parallel queue, delayed/cron jobs, retry/dead queue, policies, allocation, concurrency, fairness, rate limiting, backpressure, cancellation.

# Runtime Kernel

The Runtime Manager owns process lifecycle. It boots the Rust backend, exposes health, and recovers from crashes. It is deterministic and uses no LLM.

Every long-running capability (terminals, workflows, schedules) registers with the Runtime Manager so shutdown and recovery are orderly.

# Why This Belongs Before Workers

The Worker System (Phase 2) and Memory (Phase 2) assume a scheduler that decides when work runs, a state system that persists it, and an event bus that carries signals. Building those first prevents the orchestration layer from reinventing plumbing.

# Related Documents

- [[Phase1-Part02]]
- [[Phase2-Part01]]
- [[02-runtime/README]]
- [[12-development/README]]
