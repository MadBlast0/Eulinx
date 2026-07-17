---
title: PerformanceTesting Specification - Part 03
status: draft
version: 1.0
tags:
  - testing
  - performance-testing
  - load
related:
  - "[[PerformanceTesting-Part02]]"
  - "[[PerformanceTesting-Part04]]"
---

# PerformanceTesting Specification (Part 03)

## Document Index

Part 01 - Budgets, Frame Budget, and Philosophy
Part 02 - Canvas, Terminal, and UI Throughput
Part 03 - Runtime, Memory, and Concurrency Load
Part 04 - Benchmark Harness and CI Enforcement

# Runtime Load

The runtime (Scheduler, Merge Manager, Lock Manager, EventBus) MUST be load-tested for:

- spawning N Workers (N = 50, 100, 200) and measuring spawn-to-idle latency,
- concurrent artifact writes and merge throughput,
- lock acquisition contention under M contended Workers,
- EventBus publish rate before subscriber lag appears.

# Memory Ceilings

- per-workspace memory MUST stay under a declared ceiling; a test MUST assert it does not grow unbounded across a long session,
- artifact history MUST be bounded or offloaded to SQLite/LanceDB, not held in RAM,
- replay recordings MUST be streamed, not fully buffered.

# Concurrency Limits

Tests MUST assert the plan concurrency caps (Free ~3, Plus ~10, Pro higher, per ChatHistory) are enforced and that exceeding them queues rather than crashes.

# Related Documents

- [[02-runtime/Scheduler-Part01]]
- [[02-runtime/LockManager-Part01]]
