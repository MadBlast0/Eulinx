---
title: WorkerTesting Specification - Part 02
status: draft
version: 1.0
tags:
  - testing
  - worker-testing
  - lifecycle
related:
  - "[[WorkerTesting-Part01]]"
  - "[[WorkerTesting-Part03]]"
---

# WorkerTesting Specification (Part 02)

## Document Index

Part 01 - Purpose, Determinism, and the Replay Harness
Part 02 - Lifecycle and Hierarchy Testing
Part 03 - Artifact, Verification, and Merge Testing
Part 04 - Refinement Loop and Orchestrator Testing
Part 05 - Failure, Recovery, and Chaos Testing

# Lifecycle Testing

The Worker lifecycle (Created → Initializing → Idle → Planning → Working → Waiting → Needs Human → Blocked → Completed → Archived → Destroyed, per [[03-worker-system/WorkerLifecycle/WorkerLifecycle-Part01]]) MUST be tested as a state machine.

Cases to cover:

- every legal transition is reachable from the recorded Replay,
- an illegal transition (e.g. Destroyed → Working) is rejected,
- a Worker waiting on a locked resource transitions to Blocked, then back to Working when released,
- `Needs Human` halts autonomous progress and emits a human-approval event (see [[02-runtime/PermissionManager-Part01]] if present),
- Destroyed releases its sandbox, locks, and memory handles.

# Hierarchy Testing

The orchestrator hierarchy (Root → Phase → Task → Worker, per ChatHistory discussion) MUST be tested for:

- a Root Orchestrator spawning Phase Orchestrators from a plan,
- a Phase Orchestrator spawning Task Orchestrators,
- a Task Orchestrator spawning Workers,
- progress aggregation upward: Worker % rolls into Task %, Task % into Phase %, Phase % into Project %,
- a Phase Orchestrator rewriting the plan and spawning new sub-nodes without breaking reporting,
- a Worker spawned by a Worker (dynamic fan-out) reporting to the correct parent chain.

# Related Documents

- [[03-worker-system/WorkerHierarchy-Part01]]
- [[WorkerTesting-Part04]]
