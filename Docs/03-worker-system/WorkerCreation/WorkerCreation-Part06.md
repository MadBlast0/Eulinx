---
title: WorkerCreation Specification - Part 06
status: draft
version: 1.0
tags:
  - worker-system
  - worker-creation
  - implementation
related:
  - "[[WorkerCreation-Part01]]"
  - "[[WorkerCreation-Part05]]"
---

# WorkerCreation Specification (Part 06)

## Document Index

Part 01 - Purpose, Request Model, and Admission
Part 02 - Identity, Profile, Provider, and Model Binding
Part 03 - Permission, Sandbox, Terminal, and Context Binding
Part 04 - Ordered Creation Algorithm
Part 05 - Registration, Rollback, Recovery, and Idempotency
Part 06 - Events, UI, Database, and Implementation Checklist

# Purpose

This final part defines the events, UI surface, database records, tests, and implementation checklist for WorkerCreation.

# Events

WorkerCreation SHOULD emit:

```text
worker.creation.requested
worker.creation.validating
worker.creation.admitted
worker.creation.denied
worker.creation.identity_reserved
worker.creation.permissions_attached
worker.creation.sandbox_created
worker.creation.context_created
worker.creation.terminal_attached
worker.creation.process_started
worker.creation.ready
worker.creation.failed
worker.creation.rollback_started
worker.creation.rollback_completed
```

# UI Requirements

The UI should show Worker creation status clearly.

Possible labels:

```text
Creating
Validating
Waiting for permission
Preparing context
Starting terminal
Ready
Creation failed
Rolled back
```

If creation fails, the UI should show:

- creation step that failed
- reason
- whether cleanup succeeded
- whether retry is possible
- related task or orchestrator

# Database Tables

Suggested tables:

```text
worker_creation_requests
worker_creation_steps
worker_creation_rollbacks
worker_creation_idempotency
```

# Creation Step Record

```ts
type WorkerCreationStepRecord = {
  id: string;
  creationRequestId: string;
  workerId?: string;
  stepName: string;
  status: "pending" | "running" | "completed" | "failed" | "rolled_back";
  error?: string;
  startedAt?: string;
  completedAt?: string;
};
```

# Testing Strategy

Tests SHOULD cover:

- valid creation
- missing Workspace
- invalid parent
- denied permission
- sandbox creation failure
- terminal creation failure
- process start failure
- rollback after each failure point
- idempotent retry
- app restart during creation

# Implementation Checklist

```text
[ ] Define WorkerCreationRequest
[ ] Define WorkerCreationResult
[ ] Add idempotency key
[ ] Add admission validation
[ ] Add identity reservation
[ ] Add permission binding
[ ] Add sandbox binding
[ ] Add context package binding
[ ] Add terminal binding
[ ] Add process start binding
[ ] Add creation step records
[ ] Add rollback handlers
[ ] Add creation events
[ ] Add UI creation status
[ ] Add tests for failure at every step
```

# Final AI Notes

Worker creation is one of the highest-risk flows in Eulinx because it combines planning, permission, process creation, terminal access, and context injection.

Make it explicit, step-based, recoverable, and observable.

# Related Documents

- [[WorkerCreation-Part01]]
- [[WorkerCreation-Part05]]
- [[WorkerSpawner-Part01]]
- [[WorkerLifecycle-Part01]]

