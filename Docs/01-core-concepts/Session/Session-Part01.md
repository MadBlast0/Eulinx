---
title: SessionSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - session
related:
  - "[[01-core-concepts/README]]"
  - "[[Worker-Part01]]"
  - "[[Runtime-Part01]]"
  - "[[Workflow-Part01]]"
---
# Session Specification (Part 01)

## Document Index

Part 01 — Purpose, Philosophy, Architecture, Responsibilities
Part 02 — Lifecycle, State Machine, Runtime Interaction
Part 03 — Recovery, Replay, Persistence, Metrics
Part 04 — Database, UI, Security, Future Expansion, Implementation Checklist

---

# Purpose

A Session represents a single continuous execution instance of a Workspace.

It is the runtime container that records everything that happens from the moment execution begins until it ends.

A Session is NOT the Workspace.
A Session is NOT the Runtime.

Instead, it represents one execution timeline inside a Workspace.

---

# Philosophy

Sessions make execution:

- Observable
- Recoverable
- Replayable
- Auditable

Multiple Sessions may exist over the lifetime of a Workspace, but only one Session may be active for a Workspace at a time.

---

# Responsibilities

A Session MUST:

- Belong to exactly one Workspace
- Own one execution timeline
- Track Workers
- Track Orchestrators
- Track Tasks
- Track Artifacts
- Record Runtime Events
- Persist execution progress
- Support replay and recovery

A Session MUST NOT:

- Share execution state across Workspaces
- Outlive its Workspace
- Bypass Runtime policies

---

# Architecture

Workspace
↓
Runtime
↓
Session
├── Workers
├── Orchestrators
├── Tasks
├── Artifacts
├── Events
├── Metrics
└── History

---

# Core Object Model

- id
- workspaceId
- runtimeId
- state
- startedAt
- endedAt
- activeWorkers
- activeTasks
- activeOrchestrators
- artifactIds
- metrics
- eventLog
- replayId
- snapshotId

---

# AI Notes

A Session is the execution boundary for a single runtime instance.

Long-term ownership belongs to the Workspace.
Execution ownership belongs to the Session.

