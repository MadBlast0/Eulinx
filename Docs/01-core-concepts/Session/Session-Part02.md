---
title: SessionSpecification
status: draft
version: 1.0
tags:
  - core-concepts
  - session
related:
  - "[[01-core-concepts/README]]"
  - "[Session-Part01]"
  - "[Session-Part01]"
---
# Session Specification (Part 02)

## Session Lifecycle

A Session follows a deterministic lifecycle managed exclusively by the Runtime.

Created
↓
Initializing
↓
Loading Workspace
↓
Starting Runtime Services
↓
Running
↓
Paused
↓
Resumed
↓
Completing
↓
Completed
↓
Archived

Alternative states:
- Failed
- Cancelled
- Recovering

---

## State Definitions

### Created
The Session object exists but execution has not started.

### Initializing
Runtime services validate configuration, permissions and dependencies.

### Loading Workspace
Workspace metadata, memories, settings and runtime state are restored.

### Running
Workers and Orchestrators actively execute Tasks.

### Paused
Execution is temporarily suspended while preserving all runtime state.

### Resumed
Execution continues from the preserved state.

### Completing
Pending writes, metrics and events are finalized.

### Completed
Execution finished successfully.

### Archived
Session becomes read-only and available for replay.

---

## Runtime Interaction

The Runtime MUST:

- Create Sessions
- Transition Session states
- Persist Session state
- Recover interrupted Sessions
- Destroy temporary execution resources

Workers and Orchestrators MUST NOT modify Session state directly.

---

## Session Events

Examples:

- SessionCreated
- SessionStarted
- SessionPaused
- SessionResumed
- SessionCompleted
- SessionFailed
- SessionArchived

Every significant transition SHOULD emit an event.

---

## AI Notes

The Session lifecycle is authoritative.

All execution components derive their active state from the current Session.

