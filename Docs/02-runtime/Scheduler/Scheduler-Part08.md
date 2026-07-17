---
title: Scheduler Specification - Part 08
status: draft
version: 1.0
tags:
  - runtime
  - scheduler
  - implementation
related:
  - "[[Scheduler-Part01]]"
  - "[[RuntimeManager-Part06]]"
---

# Scheduler Specification (Part 08)

## Document Index

Part 01 - Purpose, Philosophy, and Core Responsibilities
Part 02 - Queues, Priorities, and Readiness
Part 03 - Dependencies, Parallelism, and Coordination
Part 04 - Budgets, Limits, and Fairness
Part 05 - Permissions, Locks, and Safety Gates
Part 06 - Failure Handling, Retries, and Cancellation
Part 07 - Events, Metrics, and Observability
Part 08 - Implementation Checklist, Examples, and Future Expansion

# Purpose

This final part gives implementation guidance for Scheduler.

# Suggested Modules

```text
scheduler/
  mod.rs
  scheduler.rs
  queues.rs
  readiness.rs
  priority.rs
  dependencies.rs
  budgets.rs
  safety_gates.rs
  retries.rs
  events.rs
  metrics.rs
```

# Public API

```ts
interface SchedulerApi {
  enqueue(unit: SchedulingUnit): Promise<void>;
  cancel(unitId: string, reason: string): Promise<void>;
  pause(reason: string): Promise<void>;
  resume(): Promise<void>;
  getQueueState(): Promise<SchedulerQueueSnapshot>;
  tick(): Promise<void>;
}
```

# Implementation Checklist

```text
[ ] Define SchedulingUnit
[ ] Define SchedulingState
[ ] Define SchedulingPriority
[ ] Define ReadinessResult
[ ] Define ReadinessBlocker
[ ] Create incoming queue
[ ] Create blocked queues
[ ] Create runnable queue
[ ] Implement dependency checks
[ ] Implement permission gate
[ ] Implement approval gate
[ ] Implement lock gate
[ ] Implement budget gate
[ ] Implement priority ordering
[ ] Implement fairness
[ ] Implement retry queue
[ ] Implement cancellation
[ ] Emit Scheduler events
[ ] Add metrics
[ ] Add UI queue snapshot API
```

# Example: Worker Spawn

```text
Orchestrator requests Worker spawn.
Scheduler creates worker_spawn unit.
Dependencies pass.
Permission gate checks worker.spawn.child.
Budget gate checks Worker slot.
Scheduler sends unit to WorkerSpawner.
```

# Example: Merge Waits for Lock

```text
Merge unit is ready.
LockManager says target file is locked.
Scheduler moves unit to lock_wait_queue.
When lock releases, Scheduler rechecks readiness.
Merge runs.
```

# Example: Approval Wait

```text
Workflow reaches Git push node.
PermissionManager returns ask.
Scheduler moves unit to approval_wait_queue.
User approves once.
Scheduler rechecks permissions and schedules the unit.
```

# Future Expansion

Future Scheduler capabilities may include:

- predictive scheduling
- cost-aware model routing
- machine resource monitoring
- distributed Worker scheduling
- calendar-based scheduling
- priority classes per Workspace
- learning from previous execution patterns
- simulation mode scheduling estimates

# Final AI Notes

The Scheduler is the traffic controller of Eulinx.

It should never perform the work itself.

Its job is to decide what can safely run next and explain why everything else is waiting.

# Related Documents

- [[Scheduler-Part01]]
- [[Scheduler-Part02]]
- [[Scheduler-Part03]]
- [[Scheduler-Part04]]
- [[Scheduler-Part05]]
- [[Scheduler-Part06]]
- [[Scheduler-Part07]]
- [[RuntimeManager-Part06]]

