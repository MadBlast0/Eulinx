---
title: Phase1 Specification - Part 03
status: draft
version: 1.0
tags:
  - roadmap
  - phase1
  - scheduler
related:
  - "[[Phase1-Part01]]"
  - "[[Phase1-Part02]]"
  - "[[Phase2-Part01]]"
---

# Phase1 Specification (Part 03)

## Document Index

Part 01 - Purpose, Scope, and Runtime Kernel
Part 02 - Event Bus, State System, Resource Manager
Part 03 - Scheduler, Completion, and Handoff

# Scheduler

The Scheduler decides WHEN work executes. It depends on Runtime, Resources, Events, and State — all built earlier in this phase.

Responsibilities:

- Queue work (FIFO, priority queue, parallel queue).
- Support delayed jobs and cron-like scheduled jobs.
- Retry failed work via a retry queue; park unrecoverable work in a dead queue.
- Apply scheduling policies, resource allocation, concurrency limits, fair scheduling.
- Enforce rate limiting and backpressure when resources are saturated.
- Support cancellation of queued or running work.

The Scheduler is deterministic and LLM-free. It turns "spawn a worker" into "enqueue a spawn task the runtime executes when capacity allows."

# Acceptance for Phase 1

Runtime starts, stops, reloads, and recovers cleanly.

Every subsystem communicates through the Event Bus; no direct cross-subsystem calls remain.

State for runtime/worker/session/workflow/artifact/task persists and restores from SQLite.

Resource Manager reports CPU/memory/disk/network/token/cost and enforces a configured budget.

Scheduler can queue, prioritize, parallelize, delay, retry, and cancel work; backpressure engages under load.

# Build Order Within Phase 1

1. Runtime Kernel (Manager, lifecycle, health, recovery).
2. Event Bus (dispatch, subscribe, dead-letter, replay).
3. State System (persistence, snapshots, recovery).
4. Resource Manager (budgets, quotas, monitoring).
5. Scheduler (queues, policies, concurrency, backpressure).

# Risks

Event schema churn: define event types centrally and version them; the bus is hard to refactor later.

Over-engineering the scheduler: build only what Phase 2 (workers) needs; advanced cron can be minimal.

Budget enforcement gaps: token/cost tracking must be wired at the provider call site, not estimated after the fact.

# Handoff to Phase 2

With kernel + bus + state + resources + scheduler in place, Phase 2 adds the Spawner, Session System, Worker System, and Memory — all of which consume these services.

# Related Documents

- [[Phase2-Part01]]
- [[Phase1-Part01]]
- [[02-runtime/README]]
- [[12-development/README]]
