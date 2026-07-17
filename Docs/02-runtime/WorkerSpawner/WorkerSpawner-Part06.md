---
title: WorkerSpawner Specification - Part 06
status: draft
version: 1.0
tags:
  - runtime
  - worker-spawner
  - database
  - implementation
related:
  - "[[WorkerSpawner-Part05]]"
  - "[[DatabaseArchitecture]]"
  - "[[Worker-Part01]]"
---

# WorkerSpawner Specification (Part 06)

## Document Index

Part 01 - Purpose, Philosophy, Scope, and Responsibilities
Part 02 - Spawn Requests, Validation, and Readiness
Part 03 - Context Packages, Prompts, and Environment Preparation
Part 04 - Terminal, PTY, CLI, and Process Binding
Part 05 - Events, Monitoring, Cancellation, and Recovery
Part 06 - Database, UI, Implementation Checklist, and Future Expansion

# Purpose

This part defines persistence, UI representation, implementation notes, and future expansion for WorkerSpawner.

# Database Tables

Worker spawning should persist enough data for history, debugging, replay, recovery, and audit.

Suggested tables:

```text
worker_spawn_requests
worker_spawn_validations
worker_records
worker_terminal_bindings
worker_spawn_events
worker_recovery_attempts
cli_profiles
sandbox_profiles
```

# worker_spawn_requests

```sql
CREATE TABLE worker_spawn_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  parent_worker_id TEXT,
  parent_orchestrator_id TEXT,
  task_id TEXT,
  cli_profile_id TEXT NOT NULL,
  prompt_package_id TEXT NOT NULL,
  context_package_id TEXT NOT NULL,
  permission_profile_id TEXT NOT NULL,
  sandbox_profile_id TEXT NOT NULL,
  spawn_mode TEXT NOT NULL,
  priority TEXT NOT NULL,
  reason TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

# UI Representation

WorkerSpawner appears indirectly in the UI through:

- Worker creation progress
- terminal cards
- graph node spawning animations
- spawn failure banners
- permission approval dialogs
- runtime diagnostics
- replay timelines

Users do not need to see a "WorkerSpawner screen" in normal usage.

# UI States

```text
Spawning Worker...
Preparing context...
Starting terminal...
Waiting for CLI...
Worker ready.
Worker failed to start.
Worker quarantined.
```

# Implementation Checklist

- [ ] Define `WorkerSpawnRequest` type.
- [ ] Define `WorkerHandle` type.
- [ ] Define CLI profile schema.
- [ ] Implement spawn request validation.
- [ ] Integrate Scheduler readiness.
- [ ] Integrate PermissionManager validation.
- [ ] Integrate ContextManager package retrieval.
- [ ] Integrate ProcessLifecycle process start.
- [ ] Create Worker terminal binding.
- [ ] Emit Worker spawn events.
- [ ] Persist spawn request and outcome.
- [ ] Implement launch timeout.
- [ ] Implement cancellation before launch.
- [ ] Implement failed launch cleanup.
- [ ] Implement recovery validation.
- [ ] Add tests for unsafe spawn rejection.

# Tests

WorkerSpawner tests SHOULD cover:

- valid Worker spawn
- missing Workspace rejection
- invalid parent rejection
- missing CLI rejection
- permission denied rejection
- sandbox invalid rejection
- startup timeout
- cancellation before process start
- process start failure cleanup
- recovery of valid Worker
- quarantine of suspicious Worker

# Future Expansion

Future versions may support:

- remote Worker spawning
- containerized Worker spawning
- VM-backed Worker spawning
- cloud Worker pools
- Worker migration
- distributed runtime clusters
- per-Worker resource isolation
- GPU-bound local model Workers

# AI Notes

Implement WorkerSpawner as a service with a narrow API.

Avoid sprinkling Worker creation logic across Workflow nodes, Orchestrators, UI components, and terminal components.

# Related Documents

- [[WorkerSpawner-Part01]]
- [[ProcessLifecycle-Part01]]
- [[PermissionManager-Part01]]
- [[Scheduler-Part01]]
- [[Worker-Part01]]

